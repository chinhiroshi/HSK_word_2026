import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const HISTORY_KEY = "@chinese_master_review_history_v1";
const LEGACY_KEY = "@chinese_master_review_prompted";
const ACTION_COUNT_KEY = "@chinese_master_review_action_count_v1";

const MAX_PROMPTS_PER_YEAR = 3;
const MIN_DAYS_BETWEEN_AUTO = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Trigger an automatic prompt when this many user actions accumulate. */
export const ACTION_THRESHOLD = 5;

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
  | "error"
  | null;

export interface ReviewPromptEntry {
  ts: number;
  trigger: ReviewTrigger;
  hadAction: boolean;
  requested: boolean;
  skipReason?: ReviewSkipReason;
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

/**
 * Records a single user action that should count toward the auto-review
 * threshold (e.g. tapping memorized/unmemorized/speak). When the running
 * count first reaches ACTION_THRESHOLD, schedules a single review prompt
 * attempt via tryRequestReview("user_action_threshold"). After that,
 * further actions are still counted but no longer re-trigger the prompt
 * directly — the 60-day / 3-per-year cap inside tryRequestReview governs
 * any future prompt timing through other triggers.
 */
export async function recordUserActionForReview(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ACTION_COUNT_KEY);
    const prev = raw ? parseInt(raw, 10) || 0 : 0;
    const next = prev + 1;
    await AsyncStorage.setItem(ACTION_COUNT_KEY, String(next));
    if (next === ACTION_THRESHOLD) {
      // Fire after a short delay so the user sees the result of their action first.
      setTimeout(() => {
        tryRequestReview("user_action_threshold").catch(() => {});
      }, 1200);
    }
  } catch {}
}
