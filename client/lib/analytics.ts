import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import PostHog from "posthog-react-native";
import type { PostHogEventProperties } from "@posthog/core";

const DISTINCT_ID_KEY = "@chinese_master_analytics_distinct_id_v1";
const CONSENT_KEY = "@chinese_master_analytics_consent_v1";
const PENDING_QUEUE_LIMIT = 50;

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

// `consent` reflects the live decision. While `consentLoaded` is false, we
// don't yet know whether persisted consent is granted/denied/unknown, so we
// briefly buffer events. Once loaded:
//   - granted: flush queue and capture going forward
//   - denied: drop queue and never capture
//   - unknown: keep queue (waiting for the consent dialog decision)
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
    })
  : null;

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
    pendingQueue.splice(0, pendingQueue.length - PENDING_QUEUE_LIMIT);
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
      flushQueue(c);
    } else {
      clearQueue();
      await c.optOut();
    }
  } catch (err) {
    console.warn("[analytics] consent SDK toggle failed:", err);
  }
}

let initialized = false;
export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const c = posthogClient;
  if (!c) {
    consentLoaded = true;
    clearQueue();
    return;
  }
  try {
    await c.ready();
    const distinctId = await getOrCreateDistinctId();
    try {
      c.identify(distinctId);
    } catch (err) {
      console.warn("[analytics] identify failed:", err);
    }
    const initialConsent = await getAnalyticsConsent();
    consent = initialConsent;
    consentLoaded = true;
    if (initialConsent === "granted") {
      try {
        await c.optIn();
      } catch (err) {
        console.warn("[analytics] optIn failed:", err);
      }
      flushQueue(c);
    } else if (initialConsent === "denied") {
      // Important: discard anything captured before init resolved so a later
      // opt-in cannot transmit events recorded while the user was opted out.
      clearQueue();
      try {
        await c.optOut();
      } catch (err) {
        console.warn("[analytics] optOut failed:", err);
      }
    }
    // For "unknown" we leave the buffered events in place; the consent dialog
    // will resolve them via setAnalyticsConsent().
  } catch (err) {
    console.warn("[analytics] PostHog init failed:", err);
    consentLoaded = true;
    clearQueue();
  }
}

export function capture(event: string, properties?: PostHogEventProperties): void {
  const props = properties ?? {};
  // Until persisted consent has been read, buffer events. Once loaded:
  //   - granted → send
  //   - denied  → drop (caller is opted out)
  //   - unknown → buffer (consent dialog still pending)
  if (!consentLoaded || consent === "unknown") {
    enqueue({ kind: "event", name: event, properties: props });
    return;
  }
  if (consent !== "granted") return;
  const c = posthogClient;
  if (!c) return;
  try {
    c.capture(event, props);
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

export function isAnalyticsAvailable(): boolean {
  return Boolean(POSTHOG_API_KEY);
}
