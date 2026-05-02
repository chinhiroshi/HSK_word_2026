import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { QUOTES } from "../data/quotes";
import { getWords, getSelectedHskLevel } from "./storage";

// ===== Identifiers (used to schedule/cancel each reminder independently) =====
const STUDY_NOTIF_ID = "chinese-master-study-reminder";
const SPRINT_NOTIF_ID = "chinese-master-sprint-reminder";

// ===== Storage keys =====
// Study reminder (Profile screen) — encouragement based on current learning status
export const STUDY_NOTIF_PREF_KEY = "@chinese_master_study_notif_enabled";
export const STUDY_NOTIF_HOUR_KEY = "@chinese_master_study_notif_hour";
export const STUDY_NOTIF_MINUTE_KEY = "@chinese_master_study_notif_minute";

// Sprint reminder (Sprint screen) — sprint cycle reminder with quotes
export const SPRINT_NOTIF_PREF_KEY = "@chinese_master_sprint_notif_enabled";
export const SPRINT_NOTIF_HOUR_KEY = "@chinese_master_sprint_notif_hour";
export const SPRINT_NOTIF_MINUTE_KEY = "@chinese_master_sprint_notif_minute";

// Legacy keys (for one-time migration — old toggle was Profile + sprint content)
const LEGACY_NOTIF_PREF_KEY = "@chinese_master_notifications_enabled";
const LEGACY_NOTIF_HOUR_KEY = "@chinese_master_notification_hour";
const LEGACY_NOTIF_MINUTE_KEY = "@chinese_master_notification_minute";
const LEGACY_MIGRATION_DONE_KEY = "@chinese_master_notif_migration_v2_done";

export const DEFAULT_NOTIF_HOUR = 19;
export const DEFAULT_NOTIF_MINUTE = 0;

// ===== Sprint reminder content (motivating quotes) =====
const SPRINT_MESSAGES = [
  "今日のマスをクリアして、一歩前に進もう！",
  "継続は力なり！今日のスプリントを始めましょう。",
  "昨日より一つ多く覚えよう！頑張って！",
  "コツコツ積み重ねることが上達への近道です！",
  "今日もスプリントを進めよう。あなたならできる！",
  "一日一歩、着実に中国語が上達していきます！",
  "今日の学習が未来の自分への投資です。頑張ろう！",
];

function buildSprintNotification(): { title: string; body: string } {
  const motivating = SPRINT_MESSAGES[Math.floor(Math.random() * SPRINT_MESSAGES.length)];
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return {
    title: motivating,
    body: `今日の格言｜${quote.chinese}\n（${quote.source}）\n${quote.japanese}`,
  };
}

// ===== Study reminder content (status-based encouragement) =====
const STUDY_ENCOURAGEMENTS = [
  "今日も少しだけ、中国語に触れてみませんか？",
  "毎日の積み重ねが、必ず力になります。",
  "1単語でも前進。今日もファイト！",
  "継続しているあなたは素晴らしい！",
  "今日の学習が明日のあなたを作ります。",
  "焦らず、自分のペースで進めましょう。",
];

const STUDY_RECOMMENDATIONS_NOSTART = [
  "まずは「文字学習」から始めてみましょう。",
  "短い時間でも大丈夫。最初の1単語を覚えてみよう。",
  "音声学習で耳から慣れるのもおすすめです。",
];

const STUDY_RECOMMENDATIONS_INPROGRESS = [
  "「暗記必要」の単語を見直してみませんか？",
  "音声学習で発音を確認してみよう。",
  "スプリントで7日サイクルに挑戦してみよう。",
];

const STUDY_RECOMMENDATIONS_NEAR = [
  "あと少しで HSK{level} 級制覇！最後まで駆け抜けよう。",
  "残りわずか。今日中に新しい単語を覚えてみよう。",
  "ゴールは目前です。集中して取り組みましょう！",
];

const STUDY_RECOMMENDATIONS_COMPLETE = [
  "HSK{level} 級制覇おめでとうございます！次のレベルに挑戦してみませんか？",
  "復習で記憶を定着させましょう。",
  "音声学習で更に磨きをかけよう。",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function buildStudyNotification(): Promise<{ title: string; body: string }> {
  let level = 1;
  let total = 0;
  let memorized = 0;
  let needsWork = 0;
  try {
    level = await getSelectedHskLevel();
    const words = await getWords();
    total = words.length;
    memorized = words.filter((w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0).length;
    needsWork = words.filter((w) => (w.textUnmemorizedCount || 0) > 0).length;
  } catch {
    // Fallback to generic encouragement if storage read fails
  }

  const encouragement = pickRandom(STUDY_ENCOURAGEMENTS);
  const percentage = total > 0 ? Math.round((memorized / total) * 100) : 0;

  let recommendation: string;
  if (memorized === 0) {
    recommendation = pickRandom(STUDY_RECOMMENDATIONS_NOSTART);
  } else if (total > 0 && memorized >= total) {
    recommendation = pickRandom(STUDY_RECOMMENDATIONS_COMPLETE).replace("{level}", String(level));
  } else if (total > 0 && percentage >= 80) {
    recommendation = pickRandom(STUDY_RECOMMENDATIONS_NEAR).replace("{level}", String(level));
  } else {
    recommendation = pickRandom(STUDY_RECOMMENDATIONS_INPROGRESS);
  }

  const title = encouragement;
  const statusLine =
    total > 0
      ? `HSK${level}: 暗記済み ${memorized}/${total} (${percentage}%)${needsWork > 0 ? ` ・要復習 ${needsWork}` : ""}`
      : `HSK${level}: 学習を始めましょう`;
  const body = `${statusLine}\n${recommendation}`;
  return { title, body };
}

// ===== Notification handler (foreground display) =====
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ===== Common helpers =====
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function readBool(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === "true";
  } catch {
    return false;
  }
}

async function readTime(hourKey: string, minuteKey: string): Promise<{ hour: number; minute: number }> {
  try {
    const h = await AsyncStorage.getItem(hourKey);
    const m = await AsyncStorage.getItem(minuteKey);
    return {
      hour: h !== null ? parseInt(h, 10) : DEFAULT_NOTIF_HOUR,
      minute: m !== null ? parseInt(m, 10) : DEFAULT_NOTIF_MINUTE,
    };
  } catch {
    return { hour: DEFAULT_NOTIF_HOUR, minute: DEFAULT_NOTIF_MINUTE };
  }
}

async function cancelById(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Ignore — identifier may not exist yet
  }
}

// ===== STUDY reminder API =====
export async function getStudyNotifEnabled(): Promise<boolean> {
  return readBool(STUDY_NOTIF_PREF_KEY);
}

export async function getStudyNotifTime(): Promise<{ hour: number; minute: number }> {
  return readTime(STUDY_NOTIF_HOUR_KEY, STUDY_NOTIF_MINUTE_KEY);
}

async function scheduleStudyNotification(hour: number, minute: number): Promise<void> {
  await cancelById(STUDY_NOTIF_ID);
  const { title, body } = await buildStudyNotification();
  await Notifications.scheduleNotificationAsync({
    identifier: STUDY_NOTIF_ID,
    content: { title, body, data: { screen: "study" }, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function enableStudyNotification(hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestPermission();
  if (!granted) return false;
  try {
    await scheduleStudyNotification(hour, minute);
    await AsyncStorage.setItem(STUDY_NOTIF_PREF_KEY, "true");
    await AsyncStorage.setItem(STUDY_NOTIF_HOUR_KEY, String(hour));
    await AsyncStorage.setItem(STUDY_NOTIF_MINUTE_KEY, String(minute));
    return true;
  } catch (e) {
    console.warn("学習リマインダーの設定に失敗しました:", e);
    return false;
  }
}

export async function disableStudyNotification(): Promise<void> {
  await cancelById(STUDY_NOTIF_ID);
  await AsyncStorage.setItem(STUDY_NOTIF_PREF_KEY, "false");
}

export async function sendTestStudyNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { title, body } = await buildStudyNotification();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { screen: "study" }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    return true;
  } catch (e) {
    console.warn("学習リマインダーのテスト通知に失敗しました:", e);
    return false;
  }
}

// ===== SPRINT reminder API =====
export async function getSprintNotifEnabled(): Promise<boolean> {
  return readBool(SPRINT_NOTIF_PREF_KEY);
}

export async function getSprintNotifTime(): Promise<{ hour: number; minute: number }> {
  return readTime(SPRINT_NOTIF_HOUR_KEY, SPRINT_NOTIF_MINUTE_KEY);
}

async function scheduleSprintNotification(hour: number, minute: number): Promise<void> {
  await cancelById(SPRINT_NOTIF_ID);
  const { title, body } = buildSprintNotification();
  await Notifications.scheduleNotificationAsync({
    identifier: SPRINT_NOTIF_ID,
    content: { title, body, data: { screen: "sprint" }, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function enableSprintNotification(hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestPermission();
  if (!granted) return false;
  try {
    await scheduleSprintNotification(hour, minute);
    await AsyncStorage.setItem(SPRINT_NOTIF_PREF_KEY, "true");
    await AsyncStorage.setItem(SPRINT_NOTIF_HOUR_KEY, String(hour));
    await AsyncStorage.setItem(SPRINT_NOTIF_MINUTE_KEY, String(minute));
    return true;
  } catch (e) {
    console.warn("スプリントリマインダーの設定に失敗しました:", e);
    return false;
  }
}

export async function disableSprintNotification(): Promise<void> {
  await cancelById(SPRINT_NOTIF_ID);
  await AsyncStorage.setItem(SPRINT_NOTIF_PREF_KEY, "false");
}

export async function sendTestSprintNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { title, body } = buildSprintNotification();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { screen: "sprint" }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    return true;
  } catch (e) {
    console.warn("スプリントリマインダーのテスト通知に失敗しました:", e);
    return false;
  }
}

// ===== FORGETTING REVIEW reminder API =====
const FORGETTING_NOTIF_ID_36H = "chinese-master-forgetting-36h";
const FORGETTING_NOTIF_ID_2W = "chinese-master-forgetting-2w";

const FORGETTING_NOTIF_PREF_KEY = "@chinese_master_forgetting_notif_enabled";
const FORGETTING_NOTIF_36H_SCHEDULED_KEY = "@chinese_master_forgetting_36h_scheduled_at";
const FORGETTING_NOTIF_2W_NEXT_KEY = "@chinese_master_forgetting_2w_next_at";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_SIX_HOURS_S = 36 * 60 * 60;

async function buildForgetting36hNotification(): Promise<{ title: string; body: string }> {
  try {
    const words = await getWords();
    const level = await getSelectedHskLevel();
    const total = words.length;
    const notMemorized = words.filter((w) => !w.textMemorized).length;
    return {
      title: "忘れている単語があります",
      body:
        notMemorized > 0
          ? `HSK${level}: ${notMemorized}語が復習待ちです。忘れる前に確認しましょう！`
          : `HSK${level}: ${total}語の復習を始めましょう。継続が力です！`,
    };
  } catch {
    return { title: "忘れている単語があります", body: "復習の時間です。アプリを開いて確認しましょう！" };
  }
}

async function buildForgetting2WNotification(): Promise<{ title: string; body: string }> {
  try {
    const words = await getWords();
    const level = await getSelectedHskLevel();
    const total = words.length;
    const memorized = words.filter((w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0).length;
    const needsWork = words.filter((w) => (w.textUnmemorizedCount || 0) > 0).length;
    const percentage = total > 0 ? Math.round((memorized / total) * 100) : 0;
    return {
      title: needsWork > 0 ? `${needsWork}語が忘却の危機です` : "2週間の学習レポート",
      body: `HSK${level}: 暗記済み ${memorized}/${total}語 (${percentage}%)${
        needsWork > 0 ? `・要復習 ${needsWork}語` : "・よく頑張りました！"
      }`,
    };
  } catch {
    return { title: "2週間の学習レポート", body: "アプリを開いて学習状況を確認しましょう！" };
  }
}

export async function getForgettingNotifEnabled(): Promise<boolean> {
  return readBool(FORGETTING_NOTIF_PREF_KEY);
}

export async function enableForgettingNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestPermission();
  if (!granted) return false;
  try {
    // 36h one-time notification (only if not already scheduled)
    const alreadyScheduled = await AsyncStorage.getItem(FORGETTING_NOTIF_36H_SCHEDULED_KEY);
    if (!alreadyScheduled) {
      await cancelById(FORGETTING_NOTIF_ID_36H);
      const content36h = await buildForgetting36hNotification();
      await Notifications.scheduleNotificationAsync({
        identifier: FORGETTING_NOTIF_ID_36H,
        content: { ...content36h, data: { screen: "study" }, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: THIRTY_SIX_HOURS_S,
          repeats: false,
        },
      });
      await AsyncStorage.setItem(FORGETTING_NOTIF_36H_SCHEDULED_KEY, String(Date.now()));
    }

    // 2-week notification (schedule if not set or in the past)
    await scheduleOrRefresh2WeekForgettingNotification(true);

    await AsyncStorage.setItem(FORGETTING_NOTIF_PREF_KEY, "true");
    return true;
  } catch (e) {
    console.warn("忘却復習リマインダーの設定に失敗しました:", e);
    return false;
  }
}

async function scheduleOrRefresh2WeekForgettingNotification(force = false): Promise<void> {
  const nextStr = await AsyncStorage.getItem(FORGETTING_NOTIF_2W_NEXT_KEY);
  const nextTime = nextStr ? parseInt(nextStr, 10) : 0;
  const now = Date.now();

  // If still in the future and not forced, just refresh content at same date
  let targetTime = nextTime > now + 60_000 ? nextTime : now + TWO_WEEKS_MS;

  await cancelById(FORGETTING_NOTIF_ID_2W);
  const { title, body } = await buildForgetting2WNotification();
  await Notifications.scheduleNotificationAsync({
    identifier: FORGETTING_NOTIF_ID_2W,
    content: { title, body, data: { screen: "study" }, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(targetTime),
    },
  });
  await AsyncStorage.setItem(FORGETTING_NOTIF_2W_NEXT_KEY, String(targetTime));
}

export async function disableForgettingNotification(): Promise<void> {
  await cancelById(FORGETTING_NOTIF_ID_36H);
  await cancelById(FORGETTING_NOTIF_ID_2W);
  await AsyncStorage.setItem(FORGETTING_NOTIF_PREF_KEY, "false");
  await AsyncStorage.removeItem(FORGETTING_NOTIF_36H_SCHEDULED_KEY);
  await AsyncStorage.removeItem(FORGETTING_NOTIF_2W_NEXT_KEY);
}

export async function sendTestForgettingNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { title, body } = await buildForgetting36hNotification();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { screen: "study" }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    return true;
  } catch (e) {
    console.warn("忘却復習リマインダーのテスト通知に失敗しました:", e);
    return false;
  }
}

// ===== Forgetting reminder: auto-enable on first launch =====
const FORGETTING_NOTIF_AUTO_INIT_KEY = "@chinese_master_forgetting_auto_init_done";

/**
 * Called once on first app launch.
 * Silently enables the forgetting reminder if the user has not yet made a choice.
 * Does NOT show an alert on success — the first 36h notification itself is the signal.
 */
export async function autoEnableForgettingNotificationOnce(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const done = await AsyncStorage.getItem(FORGETTING_NOTIF_AUTO_INIT_KEY);
    if (done) return; // Already attempted once
    await AsyncStorage.setItem(FORGETTING_NOTIF_AUTO_INIT_KEY, "true");
    await enableForgettingNotification(); // requests permission + schedules if granted
  } catch {
    // Best-effort; ignore failures
  }
}

// ===== Migration & app-launch refresh =====
async function migrateLegacyIfNeeded(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(LEGACY_MIGRATION_DONE_KEY);
    if (done === "true") return;
    const legacyEnabled = await AsyncStorage.getItem(LEGACY_NOTIF_PREF_KEY);
    if (legacyEnabled === "true") {
      // Old toggle was Profile reminder → migrate to study reminder
      const studyAlreadySet = await AsyncStorage.getItem(STUDY_NOTIF_PREF_KEY);
      if (studyAlreadySet === null) {
        const h = await AsyncStorage.getItem(LEGACY_NOTIF_HOUR_KEY);
        const m = await AsyncStorage.getItem(LEGACY_NOTIF_MINUTE_KEY);
        await AsyncStorage.setItem(STUDY_NOTIF_PREF_KEY, "true");
        if (h !== null) await AsyncStorage.setItem(STUDY_NOTIF_HOUR_KEY, h);
        if (m !== null) await AsyncStorage.setItem(STUDY_NOTIF_MINUTE_KEY, m);
      }
    }
    await AsyncStorage.setItem(LEGACY_MIGRATION_DONE_KEY, "true");
  } catch {
    // Ignore migration failures
  }
}

/**
 * App launch: migrate legacy keys if needed, then re-schedule any enabled
 * reminders so the daily content is freshly generated (study reminder uses
 * latest learning stats; sprint uses a fresh quote).
 */
export async function refreshDailyNotificationsIfEnabled(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await migrateLegacyIfNeeded();
    const studyEnabled = await getStudyNotifEnabled();
    if (studyEnabled) {
      const { hour, minute } = await getStudyNotifTime();
      await scheduleStudyNotification(hour, minute);
    }
    const sprintEnabled = await getSprintNotifEnabled();
    if (sprintEnabled) {
      const { hour, minute } = await getSprintNotifTime();
      await scheduleSprintNotification(hour, minute);
    }
    // Forgetting reminder: refresh 2-week notification content on app open
    // (36h one-time notification is NOT refreshed here to preserve its schedule)
    const forgettingEnabled = await getForgettingNotifEnabled();
    if (forgettingEnabled) {
      await scheduleOrRefresh2WeekForgettingNotification();
    }
  } catch {
    // Ignore — notifications are best-effort
  }
}

// ===== Backward-compat re-exports (keep old imports working) =====
/** @deprecated Use refreshDailyNotificationsIfEnabled */
export const refreshDailyQuoteIfEnabled = refreshDailyNotificationsIfEnabled;
/** @deprecated Use getStudyNotifEnabled */
export const getNotificationEnabled = getStudyNotifEnabled;
/** @deprecated Use getStudyNotifTime */
export const getNotificationTime = getStudyNotifTime;
/** @deprecated Use sendTestStudyNotification */
export const sendTestNotification = sendTestStudyNotification;

export const NOTIF_PREF_KEY = STUDY_NOTIF_PREF_KEY;
export const NOTIF_HOUR_KEY = STUDY_NOTIF_HOUR_KEY;
export const NOTIF_MINUTE_KEY = STUDY_NOTIF_MINUTE_KEY;
