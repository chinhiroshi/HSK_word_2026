import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, Modal, Linking, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import Constants from "expo-constants";
import {
  getNotificationEnabled,
  getNotificationTime,
  enableSprintNotification,
  disableSprintNotification,
  DEFAULT_NOTIF_HOUR,
  DEFAULT_NOTIF_MINUTE,
} from "@/lib/notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, HskLevel } from "@/types";
import { getWords, resetProgress, initializeData, getSelectedHskLevel, setSelectedHskLevel, getSilentModeAudio, setSilentModeAudio } from "@/lib/storage";
import { speakChinese } from "@/lib/speech";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const HSK_AVATARS: Record<HskLevel, any> = {
  1: require("../../assets/images/avatar-hsk1.png"),
  2: require("../../assets/images/avatar-hsk2.png"),
  3: require("../../assets/images/avatar-hsk3.png"),
  4: require("../../assets/images/avatar-hsk4.png"),
  5: require("../../assets/images/avatar-hsk5.png"),
  6: require("../../assets/images/avatar-hsk6.png"),
};

const HSK_TITLES: Record<HskLevel, string> = {
  1: "入門者",
  2: "初級者",
  3: "中級者",
  4: "上級者",
  5: "達人",
  6: "マスター",
};

interface QuoteData {
  original: string;
  source: string;
  literal: string;
  modern: string;
}

const HSK_QUOTES: Record<HskLevel, QuoteData> = {
  1: {
    original: "学而不厌，诲人不倦。",
    source: "論語",
    literal: "学んで飽きず、人を教えて疲れない。",
    modern: "学ぶことをやめず、教えることにも情熱を失わない姿勢。",
  },
  2: {
    original: "温故而知新，可以为师矣。",
    source: "論語",
    literal: "故（ふる）きを温（たず）ねて新しきを知れば、師となることができる。",
    modern: "過去の学びを振り返り、そこから新たな理解を生み出せる人こそ、教えるに値する。",
  },
  3: {
    original: "三人行，必有我师焉。择其善者而从之，其不善者而改之。",
    source: "論語",
    literal: "三人で行けば、必ず我が師となる者がいる。その善き者を選んでこれに従い、その善からざる者はこれを改める。",
    modern: "誰といても、必ず学ぶべき相手がいる。良いところは取り入れ、悪いところは自分を省みて正せ。",
  },
  4: {
    original: "山穷水尽疑无路，柳暗花明又一村。",
    source: "陸游",
    literal: "山が尽き水が尽き、道なきかと疑う。柳は暗く花は明るく、また一つの村あり。",
    modern: "もう道はないと思ったその先に、思いがけず新しい世界が開けることがある。",
  },
  5: {
    original: "长风破浪会有时，直挂云帆济沧海。",
    source: "李白",
    literal: "長風が波を破る時は必ず来る。まっすぐ雲の帆を掲げて大海を渡る。",
    modern: "今は逆風でも、必ず大きく前進できる時が来る。その時は堂々と進めばよい。",
  },
  6: {
    original: "会当凌绝顶，一览众山小。",
    source: "杜甫",
    literal: "必ずまさに絶頂に凌（のぼ）り、ひとたび見渡せば群山は小さい。",
    modern: "頂点に立てば、それまで大きく見えた困難も小さく感じられる。だから高みを目指せ。",
  },
};

const HSK_LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6];

const HSK_WORD_COUNTS: Record<HskLevel, number> = {
  1: 150,
  2: 150,
  3: 300,
  4: 600,
  5: 1300,
  6: 2500,
} as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isPremium } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(4);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifHour, setNotifHour] = useState(DEFAULT_NOTIF_HOUR);
  const [notifMinute, setNotifMinute] = useState(DEFAULT_NOTIF_MINUTE);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [silentModeAudio, setSilentModeAudioState] = useState(false);

  const REVIEW_PROMPTED_KEY = "@chinese_master_review_prompted";
  const REVIEW_THRESHOLD = 10;

  const checkAndPromptReview = useCallback(async (wordData: Word[]) => {
    try {
      const alreadyPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
      if (alreadyPrompted === "true") return;

      // 条件1: プレミアム会員 + 10語以上暗記済み
      const totalMemorized = wordData.filter(
        (w) => (w.textMemorized && (w.textUnmemorizedCount || 0) === 0) ||
               (w.audioMemorized && (w.audioUnmemorizedCount || 0) === 0)
      ).length;
      const premiumCondition = isPremium && totalMemorized >= REVIEW_THRESHOLD;

      // 条件2: 無料ユーザーでも 10語以上閲覧 + ボタン2回以上タップ
      const interactedCount = wordData.filter(
        (w) => w.textMemorized || w.audioMemorized ||
               (w.textUnmemorizedCount || 0) > 0 || (w.audioUnmemorizedCount || 0) > 0
      ).length;
      const totalButtonPresses = wordData.reduce(
        (acc, w) =>
          acc +
          (w.textMemorized ? 1 : 0) +
          (w.textUnmemorizedCount || 0) +
          (w.audioMemorized ? 1 : 0) +
          (w.audioUnmemorizedCount || 0),
        0
      );
      const freeCondition = interactedCount >= REVIEW_THRESHOLD && totalButtonPresses >= 2;

      if (premiumCondition || freeCondition) {
        await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, "true");
        setTimeout(async () => {
          try {
            if (await StoreReview.hasAction()) {
              await StoreReview.requestReview();
            }
          } catch (e) {
            console.warn("Auto review prompt failed:", e);
          }
        }, 1500);
      }
    } catch {}
  }, [isPremium]);

  const loadData = useCallback(async () => {
    const level = await getSelectedHskLevel();
    setSelectedLevel(level);
    await initializeData(level);
    const data = await getWords();
    setWords(data);
    setLoading(false);
    checkAndPromptReview(data);
    const notifOn = await getNotificationEnabled();
    setNotifEnabled(notifOn);
    const { hour, minute } = await getNotificationTime();
    setNotifHour(hour);
    setNotifMinute(minute);
    const silentAudio = await getSilentModeAudio();
    setSilentModeAudioState(silentAudio);
  }, [checkAndPromptReview]);

  const handleNotifToggle = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("通知", "通知はモバイルアプリでのみ利用できます。");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const ok = await enableSprintNotification(notifHour, notifMinute);
      if (ok) {
        setNotifEnabled(true);
        const timeStr = `${String(notifHour).padStart(2, "0")}:${String(notifMinute).padStart(2, "0")}`;
        Alert.alert("通知を設定しました", `毎日${timeStr}にスプリント学習のリマインダーをお送りします。`);
      } else {
        Alert.alert(
          "通知を設定できませんでした",
          "通知の許可が必要です。設定アプリから通知を許可してください。\n\nExpo Goでは通知機能が制限されている場合があります。本番ビルドでは正常に動作します。"
        );
      }
    } else {
      await disableSprintNotification();
      setNotifEnabled(false);
    }
  };

  const handleTimeChange = async (_: any, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS === "android") setShowTimePicker(false);
      return;
    }
    const newHour = selectedDate.getHours();
    const newMinute = selectedDate.getMinutes();
    setNotifHour(newHour);
    setNotifMinute(newMinute);
    // Android: dialog closes on confirm, save immediately
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (notifEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await enableSprintNotification(newHour, newMinute);
      }
    }
    // iOS: user taps 完了 button which calls handleIOSPickerDone
  };

  const handleIOSPickerDone = async () => {
    setShowTimePicker(false);
    if (notifEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await enableSprintNotification(notifHour, notifMinute);
    }
  };

  const handleSilentModeAudioToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSilentModeAudioState(value);
    await setSilentModeAudio(value);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLevelChange = (level: HskLevel) => {
    if (level === selectedLevel) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const performChange = async () => {
      setSelectedLevel(level);
      setLoading(true);
      await setSelectedHskLevel(level);
      const data = await getWords();
      setWords(data);
      setLoading(false);
    };

    if (Platform.OS === "web") {
      if (confirm(`HSK ${level}級に切り替えますか？`)) {
        performChange();
      }
    } else {
      Alert.alert(
        "級の切り替え",
        `HSK ${level}級に切り替えますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          { text: "切り替え", onPress: performChange },
        ]
      );
    }
  };

  const totalWords = words.length;
  
  const textStats = {
    memorized: words.filter((w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0).length,
    needsWork: words.filter((w) => (w.textUnmemorizedCount || 0) > 0).length,
    notStarted: words.filter((w) => !w.textMemorized && (w.textUnmemorizedCount || 0) === 0).length,
  };
  
  const audioStats = {
    memorized: words.filter((w) => w.audioMemorized && (w.audioUnmemorizedCount || 0) === 0).length,
    needsWork: words.filter((w) => (w.audioUnmemorizedCount || 0) > 0).length,
    notStarted: words.filter((w) => !w.audioMemorized && (w.audioUnmemorizedCount || 0) === 0).length,
  };

  const textPercentage = totalWords > 0 ? Math.round((textStats.memorized / totalWords) * 100) : 0;
  const audioPercentage = totalWords > 0 ? Math.round((audioStats.memorized / totalWords) * 100) : 0;

  const handleResetProgress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === "web") {
      if (confirm("進捗をリセットしますか？すべての暗記状態がクリアされます。")) {
        performReset();
      }
    } else {
      Alert.alert(
        "進捗をリセット",
        "すべての暗記状態がクリアされます。よろしいですか？",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "リセット",
            style: "destructive",
            onPress: performReset,
          },
        ]
      );
    }
  };

  const performReset = async () => {
    await resetProgress();
    await loadData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const hasWordsForLevel = totalWords > 0;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.avatarSection}>
        <Image source={HSK_AVATARS[selectedLevel]} style={styles.avatar} contentFit="cover" />
        <ThemedText style={styles.userName}>HSK {selectedLevel}級 - {HSK_TITLES[selectedLevel]}</ThemedText>
      </View>

      <View
        style={[
          styles.quoteCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <ThemedText style={styles.quoteText}>
          {HSK_QUOTES[selectedLevel].original}
        </ThemedText>
        <View style={styles.quoteActions}>
          <Pressable
            testID="button-speak-quote"
            style={[styles.quoteButton, { backgroundColor: theme.primary + "15" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              speakChinese(HSK_QUOTES[selectedLevel].original);
            }}
          >
            <Feather name="volume-2" size={16} color={theme.primary} />
            <ThemedText style={[styles.quoteButtonText, { color: theme.primary }]}>
              発音
            </ThemedText>
          </Pressable>
          <Pressable
            testID="button-show-translation"
            style={[styles.quoteButton, { backgroundColor: theme.primary + "15" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuoteModalVisible(true);
            }}
          >
            <Feather name="book" size={16} color={theme.primary} />
            <ThemedText style={[styles.quoteButtonText, { color: theme.primary }]}>
              訳を見る
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.levelRow}>
        <ThemedText style={[styles.levelLabel, { color: theme.textSecondary }]}>HSK</ThemedText>
        {HSK_LEVELS.map((level) => {
          const isSelected = level === selectedLevel;
          const hasData = mockWordsHasLevel(level);
          return (
            <Pressable
              key={level}
              testID={`button-hsk-level-${level}`}
              style={[
                styles.levelPill,
                {
                  backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                  borderColor: isSelected ? theme.primary : theme.border,
                  opacity: hasData ? 1 : 0.45,
                },
              ]}
              onPress={() => handleLevelChange(level)}
            >
              <ThemedText
                style={[
                  styles.levelPillText,
                  { color: isSelected ? "#FFFFFF" : theme.text },
                ]}
              >
                {level}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuoteModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setQuoteModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {HSK_QUOTES[selectedLevel].original}
              </ThemedText>
              <Pressable
                testID="button-close-modal"
                onPress={() => setQuoteModalVisible(false)}
              >
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ThemedText style={[styles.modalSource, { color: theme.textSecondary }]}>
              {'― '}
              {HSK_QUOTES[selectedLevel].source}
            </ThemedText>

            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalSectionLabel, { color: theme.primary }]}>
              直訳
            </ThemedText>
            <ThemedText style={styles.modalTranslation}>
              {HSK_QUOTES[selectedLevel].literal}
            </ThemedText>

            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalSectionLabel, { color: theme.primary }]}>
              現代語訳
            </ThemedText>
            <ThemedText style={styles.modalTranslation}>
              {HSK_QUOTES[selectedLevel].modern}
            </ThemedText>

            <Pressable
              testID="button-modal-speak"
              style={[styles.modalSpeakButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                speakChinese(HSK_QUOTES[selectedLevel].original);
              }}
            >
              <Feather name="volume-2" size={18} color="#FFFFFF" />
              <ThemedText style={styles.modalSpeakText}>発音を聞く</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {!isPremium ? (
        <Pressable
          testID="button-upgrade-premium"
          onPress={() => navigation.navigate("Paywall")}
          style={[
            styles.subscriptionCard,
            { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          <View style={styles.subscriptionContent}>
            <View style={styles.subscriptionIcon}>
              <Feather name="star" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.subscriptionTextContainer}>
              <ThemedText style={styles.subscriptionTitle}>プレミアムにアップグレード</ThemedText>
              <ThemedText style={styles.subscriptionDesc}>
                全単語をアンロック - ¥380/月
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </Pressable>
      ) : (
        <View
          style={[
            styles.subscriptionCard,
            { backgroundColor: `${Colors.light.success}15`, borderColor: Colors.light.success },
          ]}
        >
          <View style={styles.subscriptionContent}>
            <View style={[styles.subscriptionIcon, { backgroundColor: `${Colors.light.success}30` }]}>
              <Feather name="check-circle" size={22} color={Colors.light.success} />
            </View>
            <View style={styles.subscriptionTextContainer}>
              <ThemedText style={[styles.subscriptionTitle, { color: Colors.light.success }]}>
                プレミアム会員
              </ThemedText>
              <ThemedText style={[styles.subscriptionDesc, { color: Colors.light.success }]}>
                全機能がアンロック済み
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      <View
        style={[
          styles.notifCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        {/* Toggle row */}
        <View style={styles.notifContent}>
          <View style={[styles.notifIcon, { backgroundColor: notifEnabled ? theme.primary + "15" : theme.textSecondary + "12" }]}>
            <Feather
              name={notifEnabled ? "bell" : "bell-off"}
              size={20}
              color={notifEnabled ? theme.primary : theme.textSecondary}
            />
          </View>
          <View style={styles.notifTextContainer}>
            <ThemedText style={styles.notifTitle}>毎日のリマインダー</ThemedText>
            <ThemedText style={[styles.notifDesc, { color: theme.textSecondary }]}>
              スプリント学習の時間をお知らせします
            </ThemedText>
          </View>
          <Switch
            testID="switch-notification"
            value={notifEnabled}
            onValueChange={handleNotifToggle}
            trackColor={{ false: theme.border, true: theme.primary + "80" }}
            thumbColor={notifEnabled ? theme.primary : theme.textSecondary}
          />
        </View>

        {/* Description (always visible) */}
        <View style={[styles.notifInfoBox, { backgroundColor: theme.backgroundSubtle ?? theme.border + "30", borderColor: theme.border }]}>
          <Feather name="info" size={13} color={theme.textSecondary} />
          <ThemedText style={[styles.notifInfoText, { color: theme.textSecondary }]}>
            毎日設定した時刻に「今日のスプリントを進めましょう」という通知が届きます。スプリントの学習習慣を維持するお手伝いをします。
          </ThemedText>
        </View>

        {/* Time picker row — shown when enabled */}
        {notifEnabled ? (
          <>
            <View style={[styles.notifDivider, { backgroundColor: theme.border }]} />
            <Pressable
              testID="button-notif-time"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTimePicker(true);
              }}
              style={styles.notifTimeRow}
            >
              <Feather name="clock" size={16} color={theme.primary} />
              <ThemedText style={[styles.notifTimeLabel, { color: theme.text }]}>通知時刻</ThemedText>
              <ThemedText style={[styles.notifTimeValue, { color: theme.primary }]}>
                {`${String(notifHour).padStart(2, "0")}:${String(notifMinute).padStart(2, "0")}`}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={theme.textSecondary} />
            </Pressable>

            {/* iOS: inline picker inside the card */}
            {showTimePicker && Platform.OS === "ios" ? (
              <View style={styles.iOSPickerWrapper}>
                <DateTimePicker
                  value={(() => { const d = new Date(); d.setHours(notifHour, notifMinute, 0, 0); return d; })()}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="ja-JP"
                />
                <Pressable
                  onPress={handleIOSPickerDone}
                  style={[styles.iOSPickerDone, { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={styles.iOSPickerDoneText}>完了</ThemedText>
                </Pressable>
              </View>
            ) : null}

            {/* Android: modal picker */}
            {showTimePicker && Platform.OS === "android" ? (
              <DateTimePicker
                value={(() => { const d = new Date(); d.setHours(notifHour, notifMinute, 0, 0); return d; })()}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            ) : null}
          </>
        ) : null}
      </View>

      {/* マナーモードでも音を出す設定 */}
      {Platform.OS === "ios" ? (
        <View style={[styles.notifCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, marginBottom: Spacing.lg }]}>
          <View style={styles.notifContent}>
            <View style={[styles.notifIcon, { backgroundColor: Colors.light.secondary + "15" }]}>
              <Feather name="volume-2" size={20} color={Colors.light.secondary} />
            </View>
            <View style={styles.notifTextContainer}>
              <ThemedText style={styles.notifTitle}>マナーモードでも音を出す</ThemedText>
              <ThemedText style={[styles.notifDesc, { color: theme.textSecondary }]}>
                サイレントモード中も発音・音声を再生します
              </ThemedText>
            </View>
            <Switch
              testID="switch-silent-mode-audio"
              value={silentModeAudio}
              onValueChange={handleSilentModeAudioToggle}
              trackColor={{ false: theme.border, true: Colors.light.secondary + "80" }}
              thumbColor={silentModeAudio ? Colors.light.secondary : theme.textSecondary}
            />
          </View>
          <View style={[styles.notifInfoBox, { backgroundColor: theme.backgroundSubtle ?? theme.border + "30", borderColor: theme.border }]}>
            <Feather name="info" size={13} color={theme.textSecondary} />
            <ThemedText style={[styles.notifInfoText, { color: theme.textSecondary }]}>
              iPhoneのマナーモード（消音）スイッチをオンにしていても、単語の発音や音声学習の音が再生されます。
            </ThemedText>
          </View>
        </View>
      ) : null}

      <Pressable
        testID="button-review-app"
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          try {
            if (await StoreReview.hasAction()) {
              await StoreReview.requestReview();
            } else {
              const storeUrl = Platform.select({
                ios: "https://apps.apple.com/app/id{YOUR_APP_ID}",
                android: "https://play.google.com/store/apps/details?id=com.hskhsk.app",
                default: "",
              });
              if (storeUrl) {
                Linking.openURL(storeUrl);
              }
            }
          } catch (e) {
            console.warn("Review request failed:", e);
          }
        }}
        style={[
          styles.reviewCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <View style={styles.reviewContent}>
          <View style={[styles.reviewIcon, { backgroundColor: `${theme.secondary}15` }]}>
            <Feather name="heart" size={20} color={theme.secondary} />
          </View>
          <View style={styles.reviewTextContainer}>
            <ThemedText style={styles.reviewTitle}>
              アプリを評価する
            </ThemedText>
            <ThemedText style={[styles.reviewDesc, { color: theme.textSecondary }]}>
              レビューやコメントで応援してください
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      {hasWordsForLevel ? (
        <>
          <View
            style={[
              styles.statsCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={styles.statsTitleRow}>
              <Feather name="book-open" size={18} color={theme.primary} />
              <ThemedText style={styles.statsTitle}>文字暗記</ThemedText>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar progress={textPercentage} height={8} />
              <ThemedText style={[styles.progressText, { color: theme.primary }]}>
                {textPercentage}%
              </ThemedText>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.success }]}>
                  {textStats.memorized}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  暗記済み
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.secondary }]}>
                  {textStats.needsWork}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  暗記必要
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }]}>
                  {textStats.notStarted}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  未暗記
                </ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statsCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={styles.statsTitleRow}>
              <Feather name="headphones" size={18} color={theme.primary} />
              <ThemedText style={styles.statsTitle}>音声暗記</ThemedText>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar progress={audioPercentage} height={8} />
              <ThemedText style={[styles.progressText, { color: theme.primary }]}>
                {audioPercentage}%
              </ThemedText>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.success }]}>
                  {audioStats.memorized}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  暗記済み
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.secondary }]}>
                  {audioStats.needsWork}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  暗記必要
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }]}>
                  {audioStats.notStarted}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  未暗記
                </ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.totalCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <ThemedText style={styles.totalLabel}>総単語数</ThemedText>
            <ThemedText style={[styles.totalValue, { color: theme.primary }]}>
              {totalWords}
            </ThemedText>
          </View>

          <Button onPress={handleResetProgress} style={styles.resetButton}>
            進捗をリセット
          </Button>
        </>
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <Feather name="info" size={24} color={theme.textSecondary} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            HSK {selectedLevel}級の単語データは準備中です
          </ThemedText>
        </View>
      )}

      {/* バージョン情報 & アップデート確認 */}
      <View style={[styles.versionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={styles.versionRow}>
          <View style={[styles.versionIconWrap, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="smartphone" size={20} color={theme.primary} />
          </View>
          <View style={styles.versionTextWrap}>
            <ThemedText style={styles.versionLabel}>アプリバージョン</ThemedText>
            <ThemedText style={[styles.versionNumber, { color: theme.textSecondary }]}>
              {Constants.expoConfig?.version ?? "—"}
            </ThemedText>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

import { mockWords as allMockWords } from "@/data/mockData";

function mockWordsHasLevel(level: HskLevel): boolean {
  return allMockWords.some(w => w.hskLevel === level);
}

function getWordCountForLevel(level: HskLevel): number {
  return allMockWords.filter(w => w.hskLevel === level).length;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    justifyContent: "center",
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginRight: 2,
  },
  levelPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  levelPillText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  statsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    minWidth: 40,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  totalCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  resetButton: {
    marginBottom: Spacing.xl,
  },
  subscriptionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  subscriptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  subscriptionTextContainer: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subscriptionDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  notifCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  notifContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 2,
  },
  notifDesc: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  notifInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  notifInfoText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    lineHeight: 16,
  },
  notifDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  notifTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  notifTimeLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  notifTimeValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    letterSpacing: 1,
  },
  iOSPickerWrapper: {
    paddingBottom: Spacing.md,
  },
  iOSPickerDone: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  iOSPickerDoneText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  reviewContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  reviewTextContainer: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 2,
  },
  reviewDesc: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  versionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  versionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  versionTextWrap: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 2,
  },
  versionNumber: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  emptyCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  quoteCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  quoteText: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  quoteSource: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.md,
  },
  quoteActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quoteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  quoteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 28,
    flex: 1,
    marginRight: Spacing.md,
  },
  modalSource: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.md,
  },
  modalDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  modalTranslation: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Nunito_400Regular",
  },
  modalSpeakButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  modalSpeakText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
});
