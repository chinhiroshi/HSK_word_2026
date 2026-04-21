import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const HISTORY_KEY = "@chinese_master_review_history_v1";
const LEGACY_KEY = "@chinese_master_review_prompted";
const ACTION_COUNT_KEY = "@chinese_master_review_action_count_v1";
const ACTION_LAST_DEDUP_KEY = "@chinese_master_review_action_last_dedup_v1";
const INSTALL_TS_KEY = "@chinese_master_install_ts_v1";
const STUDY_DAYS_KEY = "@chinese_master_study_days_v1";

const MAX_PROMPTS_PER_YEAR = 3;
const MIN_DAYS_BETWEEN_AUTO = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Trigger an automatic prompt when accumulated action weight reaches this. */
export const ACTION_THRESHOLD = 5;
/** Minimum hours since first launch before any auto prompt can fire. */
export const MIN_HOURS_SINCE_INSTALL = 24;
/** Alternative gate: if user studied on this many distinct days, bypass install age. */
export const MIN_STUDY_DAYS = 2;

/** Per-action weights. */
export const ACTION_WEIGHTS = {
  mark_memorized: 1,
  mark_unmemorized: 1,
  speak: 0.3,
} as const;

export type ReviewTrigger =
  | "profile_load"
  | "user_action_threshold"
  | "sprint_test_pass"
  | "sprint_session_complete"
  | "manual_button"
  | "other";

export type ReviewSkipReason =
  | "interval"
  | "yearly_cap"
  | "no_action"
  | "too_new"
  | "error"
  | null;

export interface ReviewPromptEntry {
  ts: number;
  trigger: ReviewTrigger;
  hadAction: boolean;
  requested: boolean;
  skipReason?: ReviewSkipReason;
}

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Stamp first-launch time if not set. Safe to call repeatedly. */
export async function ensureInstallTimestamp(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INSTALL_TS_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 0) return n;
    }
    const now = Date.now();
    await AsyncStorage.setItem(INSTALL_TS_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export async function getInstallTimestamp(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(INSTALL_TS_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  return null;
}

async function recordStudyDay(): Promise<void> {
  try {
    const key = todayKey();
    const raw = await AsyncStorage.getItem(STUDY_DAYS_KEY);
    let days: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) days = parsed.filter((x) => typeof x === "string");
      } catch {}
    }
    if (!days.includes(key)) {
      days.push(key);
      // Keep last 60 days only.
      if (days.length > 60) days = days.slice(-60);
      await AsyncStorage.setItem(STUDY_DAYS_KEY, JSON.stringify(days));
    }
  } catch {}
}

export async function getStudyDayCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STUDY_DAYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length;
    }
  } catch {}
  return 0;
}

export async function getReviewHistory(): Promise<ReviewPromptEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReviewPromptEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy === "true") {
      const migrated: ReviewPromptEntry[] = [
        { ts: Date.now(), trigger: "other", hadAction: true, requested: true, skipReason: null },
      ];
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return [];
}

async function appendHistory(entry: ReviewPromptEntry): Promise<void> {
  try {
    const history = await getReviewHistory();
    history.push(entry);
    const trimmed = history.slice(-50);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function getLastPromptDate(): Promise<Date | null> {
  const history = await getReviewHistory();
  const requested = history.filter((e) => e.requested);
  if (requested.length === 0) return null;
  return new Date(requested[requested.length - 1].ts);
}

export async function getPromptCountInLastYear(): Promise<number> {
  const history = await getReviewHistory();
  const cutoff = Date.now() - 365 * DAY_MS;
  return history.filter((e) => e.requested && e.ts > cutoff).length;
}

interface TryRequestOptions {
  /** Bypass min-interval and yearly cap (used by manual button). */
  force?: boolean;
}

// Module-level in-flight guard to serialize prompt attempts and prevent
// races between near-simultaneous triggers (e.g. profile_load + sprint_test_pass).
let inFlight: Promise<boolean> | null = null;

/**
 * Smart wrapper around StoreReview.requestReview().
 * - Honors Apple's 3-per-year cap (with a 60-day min interval for auto triggers)
 * - Always records an attempt to history (including skip reason)
 * - Serializes concurrent calls via a module-level mutex
 * - Returns true if requestReview() was actually called
 */
export async function tryRequestReview(
  trigger: ReviewTrigger,
  options: TryRequestOptions = {}
): Promise<boolean> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const { force = false } = options;

    if (!force) {
      // Gate: require either 24h since install OR >= 2 distinct study days.
      const installTs = await ensureInstallTimestamp();
      const hoursSinceInstall = (Date.now() - installTs) / (60 * 60 * 1000);
      const studyDays = await getStudyDayCount();
      const installOk = hoursSinceInstall >= MIN_HOURS_SINCE_INSTALL;
      const studyOk = studyDays >= MIN_STUDY_DAYS;
      if (!installOk && !studyOk) {
        await appendHistory({
          ts: Date.now(),
          trigger,
          hadAction: false,
          requested: false,
          skipReason: "too_new",
        });
        return false;
      }

      const last = await getLastPromptDate();
      if (last) {
        const daysSince = (Date.now() - last.getTime()) / DAY_MS;
        if (daysSince < MIN_DAYS_BETWEEN_AUTO) {
          await appendHistory({
            ts: Date.now(),
            trigger,
            hadAction: false,
            requested: false,
            skipReason: "interval",
          });
          return false;
        }
      }
      const recent = await getPromptCountInLastYear();
      if (recent >= MAX_PROMPTS_PER_YEAR) {
        await appendHistory({
          ts: Date.now(),
          trigger,
          hadAction: false,
          requested: false,
          skipReason: "yearly_cap",
        });
        return false;
      }
    }

    let hadAction = false;
    let requested = false;
    let skipReason: ReviewSkipReason = null;
    try {
      hadAction = await StoreReview.hasAction();
      if (hadAction) {
        await StoreReview.requestReview();
        requested = true;
      } else {
        skipReason = "no_action";
      }
    } catch (e) {
      skipReason = "error";
      console.warn("[reviewPrompt] requestReview failed:", e);
    }

    await appendHistory({
      ts: Date.now(),
      trigger,
      hadAction,
      requested,
      skipReason: requested ? null : skipReason,
    });

    return requested;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function clearReviewHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    await AsyncStorage.removeItem(LEGACY_KEY);
    await AsyncStorage.removeItem(ACTION_COUNT_KEY);
  } catch {}
}

interface RecordActionOptions {
  /**
   * Optional dedupe key. If the same key was used by the previous call,
   * the weight is suppressed (treated as 0). Useful for the speak button:
   * pressing the same word in a row should count as one tap.
   */
  dedupKey?: string;
}

/**
 * Records a weighted user action toward the auto-review threshold.
 * - Pass a per-action weight (e.g. 1 for mark, 0.3 for speak).
 * - Use dedupKey="speak:<text>" to collapse consecutive same-target taps.
 * When the accumulated weight first crosses ACTION_THRESHOLD, schedules a
 * review prompt via tryRequestReview("user_action_threshold").
 */
export async function recordUserActionForReview(
  weight: number,
  options: RecordActionOptions = {}
): Promise<void> {
  try {
    // Any user action counts toward "study days", even if dedupe suppresses weight.
    recordStudyDay().catch(() => {});

    const { dedupKey } = options;

    // Suppress weight if same dedupKey as last call (consecutive same target).
    if (dedupKey) {
      const lastDedup = await AsyncStorage.getItem(ACTION_LAST_DEDUP_KEY);
      if (lastDedup === dedupKey) {
        return;
      }
      await AsyncStorage.setItem(ACTION_LAST_DEDUP_KEY, dedupKey);
    } else {
      // A non-dedupable action breaks the dedup chain.
      await AsyncStorage.removeItem(ACTION_LAST_DEDUP_KEY);
    }

    if (weight <= 0) return;

    const raw = await AsyncStorage.getItem(ACTION_COUNT_KEY);
    const prev = raw ? parseFloat(raw) || 0 : 0;
    const next = prev + weight;
    await AsyncStorage.setItem(ACTION_COUNT_KEY, next.toFixed(2));

    if (prev < ACTION_THRESHOLD && next >= ACTION_THRESHOLD) {
      // Fire after a short delay so the user sees the result of their action first.
      setTimeout(() => {
        tryRequestReview("user_action_threshold").catch(() => {});
      }, 1200);
    }
  } catch {}
}
