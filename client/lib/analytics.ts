import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Localization from "expo-localization";
import { AppState, AppStateStatus } from "react-native";
import PostHog from "posthog-react-native";
import type { PostHogEventProperties } from "@posthog/core";

// EU/EEA + UK ISO-3166 alpha-2 region codes that require explicit, prior
// opt-in consent before any non-essential analytics may be collected
// (GDPR / UK GDPR / PECR). Outside this list we keep the opt-out model.
const EXPLICIT_CONSENT_REGIONS: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB",
]);

export function isExplicitConsentRegion(): boolean {
  try {
    const locales = Localization.getLocales();
    for (const l of locales) {
      const r = (l?.regionCode || "").toUpperCase();
      if (r && EXPLICIT_CONSENT_REGIONS.has(r)) return true;
    }
  } catch (err) {
    console.warn("[analytics] region detection failed:", err);
  }
  return false;
}

const DISTINCT_ID_KEY = "@chinese_master_analytics_distinct_id_v1";
const CONSENT_KEY = "@chinese_master_analytics_consent_v1";
const PENDING_QUEUE_LIMIT = 50;

// Feature flag — flip to `true` when the AnalyticsConsentDialog is brought
// back for EU/EEA/UK users. While `false`, EU users in the `unknown` consent
// state get their events dropped immediately (current behaviour, since the
// dialog is intentionally not shown — see replit.md). While `true`, EU
// users' events are buffered up to PENDING_QUEUE_LIMIT until they tap grant
// (flushed) or deny (discarded) on the consent dialog.
//
// Keep this in sync with whether <AnalyticsConsentDialog/> is actually
// surfaced in App.tsx for EU users. Enabling the buffer without showing the
// dialog will silently overflow the queue for these users.
export const EU_CONSENT_BUFFERING_ENABLED = false;

// Diagnostic counter: number of buffered events lost to FIFO overflow since
// process start. Surfaced via getPendingQueueOverflowCount() for the
// ProfileScreen / debug UIs once the consent dialog is reintroduced.
let pendingQueueOverflowCount = 0;

export function getPendingQueueOverflowCount(): number {
  return pendingQueueOverflowCount;
}

const POSTHOG_API_KEY: string =
  Constants.expoConfig?.extra?.posthogApiKey ||
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
  "";

const POSTHOG_HOST: string =
  Constants.expoConfig?.extra?.posthogHost ||
  process.env.EXPO_PUBLIC_POSTHOG_HOST ||
  "https://us.i.posthog.com";

type ConsentState = "granted" | "denied" | "unknown";

type QueuedEvent =
  | { kind: "event"; name: string; properties: PostHogEventProperties }
  | { kind: "screen"; name: string; properties: PostHogEventProperties };

function devLog(...args: unknown[]): void {
  if (__DEV__) {
    console.log("[analytics]", ...args);
  }
}

// `consent` reflects the live decision. While `consentLoaded` is false, we
// don't yet know whether persisted consent is granted/denied/unknown, so we
// briefly buffer events. Once loaded:
//   - granted: flush queue and capture going forward
//   - denied: drop queue and never capture
//   - unknown: in EU/EEA/UK regions we drop immediately (consent dialog is
//     not currently shown, so buffering would only ever silently overflow);
//     elsewhere unknown is auto-promoted to granted in initAnalytics().
// When no API key is configured, treat analytics as terminally disabled so
// `capture()` short-circuits instead of buffering events forever.
let consent: ConsentState = POSTHOG_API_KEY ? "unknown" : "denied";
let consentLoaded = !POSTHOG_API_KEY;
const pendingQueue: QueuedEvent[] = [];

const posthogClient: PostHog | null = POSTHOG_API_KEY
  ? new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      enableSessionReplay: false,
      captureAppLifecycleEvents: true,
      defaultOptIn: false,
      // Tighter batching so that one-shot, high-value events (sprint test
      // completion, subscription start, onboarding completion) are not lost
      // when the user immediately backgrounds or kills the app. Combined
      // with the per-event `important` flush below and the AppState flush
      // hook, this drains the queue within seconds in the worst case.
      flushAt: 5,
      flushInterval: 10000,
    })
  : null;

if (__DEV__ && posthogClient) {
  try {
    posthogClient.debug(true);
    devLog("PostHog SDK initialized in debug mode", { host: POSTHOG_HOST });
  } catch (err) {
    console.warn("[analytics] enabling debug mode failed:", err);
  }
}

export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateDistinctId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DISTINCT_ID_KEY);
    if (existing) return existing;
    const id = uuid();
    await AsyncStorage.setItem(DISTINCT_ID_KEY, id);
    return id;
  } catch (err) {
    console.warn("[analytics] distinctId persistence failed:", err);
    return uuid();
  }
}

export async function getAnalyticsConsent(): Promise<ConsentState> {
  try {
    const v = await AsyncStorage.getItem(CONSENT_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch (err) {
    console.warn("[analytics] consent read failed:", err);
  }
  return "unknown";
}

function enqueue(item: QueuedEvent): void {
  pendingQueue.push(item);
  if (pendingQueue.length > PENDING_QUEUE_LIMIT) {
    const overflow = pendingQueue.length - PENDING_QUEUE_LIMIT;
    pendingQueue.splice(0, overflow);
    pendingQueueOverflowCount += overflow;
    // Always log overflow (not just __DEV__) so we can see in production
    // logs when the buffer cap is being hit — important when the EU
    // consent dialog is re-enabled and we need to tune PENDING_QUEUE_LIMIT.
    console.warn(
      `[analytics] pending queue overflow: dropped ${overflow} oldest event(s) ` +
        `(total dropped this session: ${pendingQueueOverflowCount})`,
    );
  }
}

function flushQueue(c: PostHog): void {
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift()!;
    try {
      if (item.kind === "event") {
        c.capture(item.name, item.properties);
      } else {
        c.screen(item.name, item.properties);
      }
    } catch (err) {
      console.warn("[analytics] flush capture failed:", err);
    }
  }
}

function clearQueue(): void {
  pendingQueue.length = 0;
}

let identified = false;

export async function setAnalyticsConsent(value: "granted" | "denied"): Promise<void> {
  consent = value;
  consentLoaded = true;
  try {
    await AsyncStorage.setItem(CONSENT_KEY, value);
  } catch (err) {
    console.warn("[analytics] consent persist failed:", err);
  }
  const c = posthogClient;
  if (!c) return;
  try {
    if (value === "granted") {
      await c.optIn();
      // First grant only: associate the buffered/about-to-be-flushed events
      // with the persistent anonymous distinct id. Done AFTER optIn so the
      // identify event is only ever emitted once the user has consented —
      // critical for the EU/EEA/UK explicit-consent path.
      if (!identified) {
        try {
          const distinctId = await getOrCreateDistinctId();
          c.identify(distinctId);
          identified = true;
        } catch (err) {
          console.warn("[analytics] identify on grant failed:", err);
        }
      }
      flushQueue(c);
      void flushAnalytics("consent-grant");
    } else {
      clearQueue();
      await c.optOut();
    }
  } catch (err) {
    console.warn("[analytics] consent SDK toggle failed:", err);
  }
}

let initialized = false;
let appStateSub: { remove: () => void } | null = null;

function ensureAppStateFlushHook(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener("change", (next: AppStateStatus) => {
    // Drain the queue the moment the app leaves the foreground. iOS may
    // suspend the JS runtime within seconds of backgrounding, so deferring
    // the flush to the next interval tick is exactly when events get lost.
    if (next === "background" || next === "inactive") {
      void flushAnalytics(`appstate:${next}`);
    }
  });
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const c = posthogClient;
  if (!c) {
    consentLoaded = true;
    clearQueue();
    return;
  }
  ensureAppStateFlushHook();
  try {
    await c.ready();
    const distinctId = await getOrCreateDistinctId();
    // NOTE: do NOT call c.identify() here. identify() emits an $identify
    // event to PostHog and would leak data before the user has had a chance
    // to consent (critical for GDPR/PECR EU/EEA/UK regions where consent
    // must be explicit and prior). identify() is invoked only inside the
    // branches below where the user is — or has already been — opted in.
    const initialConsent = await getAnalyticsConsent();
    const identifyOnce = () => {
      if (identified) return;
      try {
        c.identify(distinctId);
        identified = true;
      } catch (err) {
        console.warn("[analytics] identify failed:", err);
      }
    };
    if (initialConsent === "denied") {
      // Respect explicit prior opt-out — never re-enable automatically.
      consent = "denied";
      consentLoaded = true;
      clearQueue();
      try {
        await c.optOut();
      } catch (err) {
        console.warn("[analytics] optOut failed:", err);
      }
      // Note: identify() intentionally NOT called for opted-out users.
    } else if (initialConsent === "unknown" && isExplicitConsentRegion()) {
      // GDPR/UK PECR regions: require explicit, prior opt-in. Behaviour
      // depends on whether the consent dialog is currently being shown
      // (see EU_CONSENT_BUFFERING_ENABLED above):
      //
      //   * Buffering OFF (current default — dialog is not surfaced):
      //     immediately treat as denied so capture()/captureScreen() drop
      //     events instead of silently overflowing a queue that will never
      //     be flushed. We do NOT persist "denied" — the dialog can still
      //     flip the in-memory state to "granted" via setAnalyticsConsent()
      //     at which point future events flow normally.
      //
      //   * Buffering ON (dialog is surfaced again): keep consent as
      //     "unknown" with consentLoaded=true so that capture() /
      //     captureScreen() route events into pendingQueue. When the user
      //     taps grant, setAnalyticsConsent("granted") flushes the queue;
      //     on deny it discards the queue. Overflow beyond
      //     PENDING_QUEUE_LIMIT (50) is logged via enqueue() and counted
      //     in getPendingQueueOverflowCount() for diagnostics.
      if (EU_CONSENT_BUFFERING_ENABLED) {
        consent = "unknown";
        consentLoaded = true;
        // SDK stays opted-out until the user taps grant; events live only
        // in our in-process pendingQueue so nothing leaves the device
        // before consent. identify() is intentionally NOT called here.
        try {
          await c.optOut();
        } catch (err) {
          console.warn("[analytics] EU optOut (buffering) failed:", err);
        }
        devLog("EU/EEA/UK user — buffering events until consent decided");
      } else {
        consent = "denied";
        consentLoaded = true;
        clearQueue();
        try {
          await c.optOut();
        } catch (err) {
          console.warn("[analytics] EU optOut failed:", err);
        }
      }
    } else {
      // Opt-out model: treat both "granted" and "unknown" (never decided) as
      // granted. First-time users start opted-in; they can disable analytics
      // anytime from ProfileScreen. Persist the auto-grant so subsequent
      // launches read a stable value. Guard against a concurrent
      // setAnalyticsConsent("denied") fired by the user toggling off during
      // init: re-check the in-memory `consent` after each await, and
      // compare-and-set the storage write so we never clobber a deny.
      if ((consent as ConsentState) !== "denied") {
        consent = "granted";
      }
      consentLoaded = true;
      if (initialConsent === "unknown") {
        try {
          const current = await AsyncStorage.getItem(CONSENT_KEY);
          if (current !== "denied") {
            await AsyncStorage.setItem(CONSENT_KEY, "granted");
          }
        } catch (err) {
          console.warn("[analytics] auto-grant persist failed:", err);
        }
      }
      // If the user toggled off while we were awaiting storage, honor that.
      if ((consent as ConsentState) === "denied") {
        clearQueue();
        try {
          await c.optOut();
        } catch (err) {
          console.warn("[analytics] post-race optOut failed:", err);
        }
        return;
      }
      try {
        await c.optIn();
      } catch (err) {
        console.warn("[analytics] optIn failed:", err);
      }
      // Final guard: if a deny landed during optIn, drop everything.
      if ((consent as ConsentState) === "denied") {
        clearQueue();
        try {
          await c.optOut();
        } catch (err) {
          console.warn("[analytics] post-race optOut failed:", err);
        }
        return;
      }
      // Safe to identify only now: user is opted in (auto-grant or prior
      // explicit grant). identify() emits an $identify event, so it must
      // never run before this point — particularly important for EU/EEA/UK
      // users whose `unknown` branch above returns without calling it.
      identifyOnce();
      flushQueue(c);
      void flushAnalytics("init");
    }
  } catch (err) {
    console.warn("[analytics] PostHog init failed:", err);
    consentLoaded = true;
    clearQueue();
  }
}

export type CaptureOptions = {
  /** Force an immediate network flush after enqueuing this event. Use for
   * one-shot, high-value events the user only triggers a few times per
   * lifetime (sprint completion, subscription start, onboarding finish). */
  important?: boolean;
};

export function capture(
  event: string,
  properties?: PostHogEventProperties,
  options?: CaptureOptions,
): void {
  const props = properties ?? {};
  // Until persisted consent has been read, buffer events. Once loaded:
  //   - granted → send
  //   - denied  → drop (caller is opted out)
  //   - unknown → buffer. Normally only happens transiently before
  //     consentLoaded (initAnalytics resolves it), BUT when
  //     EU_CONSENT_BUFFERING_ENABLED is true the EU/EEA/UK branch leaves
  //     consent="unknown" with consentLoaded=true on purpose, so events
  //     buffer indefinitely until the user taps grant/deny on the
  //     AnalyticsConsentDialog. Overflow past PENDING_QUEUE_LIMIT is
  //     handled (and counted) by enqueue().
  if (!consentLoaded || consent === "unknown") {
    devLog("queue (consent pending):", event);
    enqueue({ kind: "event", name: event, properties: props });
    return;
  }
  if (consent !== "granted") {
    devLog("drop (consent denied):", event);
    return;
  }
  const c = posthogClient;
  if (!c) return;
  try {
    devLog("capture:", event, options?.important ? "(important)" : "");
    c.capture(event, props);
    if (options?.important) {
      void flushAnalytics(`important:${event}`);
    }
  } catch (err) {
    console.warn("[analytics] capture failed:", err);
  }
}

export function captureScreen(screenName: string, properties?: PostHogEventProperties): void {
  const props = properties ?? {};
  if (!consentLoaded || consent === "unknown") {
    enqueue({ kind: "screen", name: screenName, properties: props });
    return;
  }
  if (consent !== "granted") return;
  const c = posthogClient;
  if (!c) return;
  try {
    c.screen(screenName, props);
  } catch (err) {
    console.warn("[analytics] captureScreen failed:", err);
  }
}

export async function flushAnalytics(reason?: string): Promise<void> {
  const c = posthogClient;
  if (!c) return;
  if (consent !== "granted") return;
  try {
    devLog("flush start:", reason ?? "(manual)");
    await c.flush();
    devLog("flush ok:", reason ?? "(manual)");
  } catch (err) {
    if (__DEV__) {
      console.warn("[analytics] flush failed:", reason, err);
    }
  }
}

export function isAnalyticsAvailable(): boolean {
  return Boolean(POSTHOG_API_KEY);
}
