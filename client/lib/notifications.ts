import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const NOTIF_PREF_KEY = "@chinese_master_notifications_enabled";
export const NOTIF_HOUR_KEY = "@chinese_master_notification_hour";
export const NOTIF_MINUTE_KEY = "@chinese_master_notification_minute";

export const DEFAULT_NOTIF_HOUR = 19;
export const DEFAULT_NOTIF_MINUTE = 0;

const MOTIVATING_MESSAGES = [
  "今日のマスをクリアして、一歩前に進もう！",
  "継続は力なり！今日の学習を始めましょう。",
  "昨日より一つ多く覚えよう！頑張って！",
  "コツコツ積み重ねることが上達への近道です！",
  "今日もスプリントを進めよう。あなたならできる！",
  "一日一歩、着実に中国語が上達していきます！",
  "今日の学習が未来の自分への投資です。頑張ろう！",
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getNotificationEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIF_PREF_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function getNotificationTime(): Promise<{ hour: number; minute: number }> {
  try {
    const h = await AsyncStorage.getItem(NOTIF_HOUR_KEY);
    const m = await AsyncStorage.getItem(NOTIF_MINUTE_KEY);
    return {
      hour: h !== null ? parseInt(h, 10) : DEFAULT_NOTIF_HOUR,
      minute: m !== null ? parseInt(m, 10) : DEFAULT_NOTIF_MINUTE,
    };
  } catch {
    return { hour: DEFAULT_NOTIF_HOUR, minute: DEFAULT_NOTIF_MINUTE };
  }
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function enableSprintNotification(hour = 19, minute = 0): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestPermission();
  if (!granted) return false;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const body = MOTIVATING_MESSAGES[Math.floor(Math.random() * MOTIVATING_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "スプリント学習の時間です！",
        body,
        data: { screen: "sprint" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await AsyncStorage.setItem(NOTIF_PREF_KEY, "true");
    await AsyncStorage.setItem(NOTIF_HOUR_KEY, String(hour));
    await AsyncStorage.setItem(NOTIF_MINUTE_KEY, String(minute));
    return true;
  } catch (e) {
    console.warn("通知のスケジュール設定に失敗しました:", e);
    return false;
  }
}

export async function disableSprintNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(NOTIF_PREF_KEY, "false");
}
