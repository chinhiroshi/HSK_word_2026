import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, Modal, Linking, Switch, ActivityIndicator } from "react-native";
import { reloadAppAsync } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  tryRequestReview,
  getReviewHistory,
  clearReviewHistory,
  ReviewPromptEntry,
} from "@/lib/reviewPrompt";
import Constants from "expo-constants";
import {
  getNotificationEnabled,
  getNotificationTime,
  enableSprintNotification,
  disableSprintNotification,
  sendTestNotification,
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
import { HSK_QUOTES } from "@/data/hskQuotes";
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
import { useAppUpdate } from "@/navigation/MainTabNavigator";
import { useI18n } from "@/contexts/LanguageContext";

const HSK_AVATARS: Record<HskLevel, any> = {
  1: require("../../assets/images/avatar-hsk1.png"),
  2: require("../../assets/images/avatar-hsk2.png"),
  3: require("../../assets/images/avatar-hsk3.png"),
  4: require("../../assets/images/avatar-hsk4.png"),
  5: require("../../assets/images/avatar-hsk5.png"),
  6: require("../../assets/images/avatar-hsk6.png"),
};


interface QuoteData {
  original: string;
  source: string;
  sourceEn: string;
  literal: string;
  modern: string;
  literalEn: string;
  modernEn: string;
}

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
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { isPremium, devPremiumOverride, setDevPremiumOverride } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { updateInfo, recheckUpdate } = useAppUpdate();

  const HSK_TITLES: Record<HskLevel, string> = {
    1: t("hsk_title_1"), 2: t("hsk_title_2"), 3: t("hsk_title_3"),
    4: t("hsk_title_4"), 5: t("hsk_title_5"), 6: t("hsk_title_6"),
  };

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(4);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifHour, setNotifHour] = useState(DEFAULT_NOTIF_HOUR);
  const [notifMinute, setNotifMinute] = useState(DEFAULT_NOTIF_MINUTE);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [silentModeAudio, setSilentModeAudioState] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const [reviewDevModalVisible, setReviewDevModalVisible] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<ReviewPromptEntry[]>([]);
  const longPressConsumedRef = React.useRef(false);

  const openReviewDevModal = useCallback(async () => {
    longPressConsumedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const history = await getReviewHistory();
    setReviewHistory(history);
    setReviewDevModalVisible(true);
  }, []);

  const loadData = useCallback(async () => {
    const level = await getSelectedHskLevel();
    setSelectedLevel(level);
    await initializeData(level);
    const data = await getWords();
    setWords(data);
    setLoading(false);
    const notifOn = await getNotificationEnabled();
    setNotifEnabled(notifOn);
    const { hour, minute } = await getNotificationTime();
    setNotifHour(hour);
    setNotifMinute(minute);
    const silentAudio = await getSilentModeAudio();
    setSilentModeAudioState(silentAudio);
  }, []);

  const handleNotifToggle = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert(t("daily_reminder"), t("notif_web_msg"));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const ok = await enableSprintNotification(notifHour, notifMinute);
      if (ok) {
        setNotifEnabled(true);
        const timeStr = `${String(notifHour).padStart(2, "0")}:${String(notifMinute).padStart(2, "0")}`;
        Alert.alert(t("notif_set_title"), `${timeStr}`);
      } else {
        Alert.alert(t("notif_error_title"), t("notif_web_msg"));
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
        t("level_switch_title"),
        `HSK ${level}`,
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("switch_btn"), onPress: performChange },
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
      if (confirm(t("reset_confirm_msg"))) {
        performReset();
      }
    } else {
      Alert.alert(
        t("reset_confirm_title"),
        t("reset_confirm_msg"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("reset_btn"),
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

  const performRestartOnboarding = async () => {
    try {
      await AsyncStorage.multiRemove([
        "@chinese_master_onboarding_complete",
        "@chinese_master_tutorial_sprint_done",
        "@chinese_master_tutorial_stamp_earned",
      ]);
    } catch (e) {
      console.warn("Failed to clear onboarding flags:", e);
    }
    try {
      await reloadAppAsync();
    } catch (e) {
      console.warn("reloadAppAsync failed:", e);
      if (Platform.OS === "web") {
        try {
          window.location.reload();
        } catch {}
      }
    }
  };

  const handleRestartOnboarding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const title = t("restart_onboarding");
    const msg = t("restart_onboarding_msg");
    if (Platform.OS === "web") {
      if (confirm(`${title}\n\n${msg}`)) {
        performRestartOnboarding();
      }
    } else {
      Alert.alert(title, msg, [
        { text: t("cancel"), style: "cancel" },
        { text: t("restart_onboarding_btn"), onPress: performRestartOnboarding },
      ]);
    }
  };

  const hasWordsForLevel = totalWords > 0;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: safeHeaderPadding + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      {/* アップデート通知バナー */}
      {updateInfo.available ? (
        <Pressable
          testID="button-update-banner"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (updateInfo.storeUrl) {
              Linking.openURL(updateInfo.storeUrl);
            }
          }}
          style={[styles.updateBanner, { backgroundColor: Colors.light.primary }]}
        >
          <View style={styles.updateBannerLeft}>
            <Feather name="arrow-up-circle" size={22} color="#fff" />
            <View style={styles.updateBannerText}>
              <ThemedText style={styles.updateBannerTitle}>{t("update_available")}</ThemedText>
              <ThemedText style={styles.updateBannerSub}>
                v{updateInfo.latestVersion}
              </ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#fff" />
        </Pressable>
      ) : null}

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
              {t("speak")}
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
              {t("word_detail_header")}
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
              {lang === "en" ? HSK_QUOTES[selectedLevel].sourceEn : HSK_QUOTES[selectedLevel].source}
            </ThemedText>

            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalSectionLabel, { color: theme.primary }]}>
              {t("quote_literal")}
            </ThemedText>
            <ThemedText style={styles.modalTranslation}>
              {lang === "en" ? HSK_QUOTES[selectedLevel].literalEn : HSK_QUOTES[selectedLevel].literal}
            </ThemedText>

            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalSectionLabel, { color: theme.primary }]}>
              {t("quote_modern")}
            </ThemedText>
            <ThemedText style={styles.modalTranslation}>
              {lang === "en" ? HSK_QUOTES[selectedLevel].modernEn : HSK_QUOTES[selectedLevel].modern}
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
              <ThemedText style={styles.modalSpeakText}>{t("speak")}</ThemedText>
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
              <ThemedText style={styles.subscriptionTitle}>{t("premium_upgrade")}</ThemedText>
              <ThemedText style={styles.subscriptionDesc}>
                ¥380/month
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
                {t("subscription_active")}
              </ThemedText>
              <ThemedText style={[styles.subscriptionDesc, { color: Colors.light.success }]}>
                {t("paywall_hero_title")}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Language toggle */}
      <View style={[styles.notifCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={styles.notifContent}>
          <View style={[styles.notifIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="globe" size={20} color={theme.primary} />
          </View>
          <View style={styles.notifTextContainer}>
            <ThemedText style={styles.notifTitle}>{t("language_setting")}</ThemedText>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              testID="button-lang-ja"
              onPress={() => setLang("ja")}
              style={[
                styles.langBtn,
                { borderColor: lang === "ja" ? theme.primary : theme.border,
                  backgroundColor: lang === "ja" ? theme.primary + "15" : "transparent" }
              ]}
            >
              <ThemedText style={[styles.langBtnText, { color: lang === "ja" ? theme.primary : theme.textSecondary }]}>
                {t("language_japanese")}
              </ThemedText>
            </Pressable>
            <Pressable
              testID="button-lang-en"
              onPress={() => setLang("en")}
              style={[
                styles.langBtn,
                { borderColor: lang === "en" ? theme.primary : theme.border,
                  backgroundColor: lang === "en" ? theme.primary + "15" : "transparent" }
              ]}
            >
              <ThemedText style={[styles.langBtnText, { color: lang === "en" ? theme.primary : theme.textSecondary }]}>
                {t("language_english")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

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
            <ThemedText style={styles.notifTitle}>{t("daily_reminder")}</ThemedText>
            <ThemedText style={[styles.notifDesc, { color: theme.textSecondary }]}>
              {t("sprint_header")}
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
            {t("review_prompt_title")}
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
              <ThemedText style={[styles.notifTimeLabel, { color: theme.text }]}>{t("notif_time")}</ThemedText>
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
                  <ThemedText style={styles.iOSPickerDoneText}>{t("done")}</ThemedText>
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

            <View style={[styles.notifDivider, { backgroundColor: theme.border }]} />
            <Pressable
              testID="button-test-notification"
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const ok = await sendTestNotification();
                if (ok) {
                  setTestNotifSent(true);
                  setTimeout(() => setTestNotifSent(false), 6000);
                }
              }}
              style={styles.notifTimeRow}
            >
              <Feather name="send" size={16} color={testNotifSent ? Colors.light.success : theme.primary} />
              <ThemedText style={[styles.notifTimeLabel, { color: theme.text, flex: 1 }]}>
                {t("send_test_notif")}
              </ThemedText>
              <ThemedText style={[styles.notifTimeValue, { color: testNotifSent ? Colors.light.success : theme.textSecondary, fontSize: 12 }]}>
                {testNotifSent ? t("test_notif_sent") : t("test_notif_hint")}
              </ThemedText>
            </Pressable>
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
              <ThemedText style={styles.notifTitle}>{t("silent_mode_sound")}</ThemedText>
              <ThemedText style={[styles.notifDesc, { color: theme.textSecondary }]}>
                {t("speak")}
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
              {t("silent_mode_sound")}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <Pressable
        testID="button-review-app"
        delayLongPress={3000}
        onLongPress={openReviewDevModal}
        onPress={async () => {
          if (longPressConsumedRef.current) {
            longPressConsumedRef.current = false;
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          try {
            const requested = await tryRequestReview("manual_button", { force: true });
            if (!requested) {
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
              {t("review_btn")}
            </ThemedText>
            <ThemedText style={[styles.reviewDesc, { color: theme.textSecondary }]}>
              {t("review_prompt_title")}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        testID="button-restart-onboarding"
        onPress={handleRestartOnboarding}
        style={[
          styles.reviewCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <View style={styles.reviewContent}>
          <View style={[styles.reviewIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="refresh-cw" size={20} color={theme.primary} />
          </View>
          <View style={styles.reviewTextContainer}>
            <ThemedText style={styles.reviewTitle}>
              {t("restart_onboarding")}
            </ThemedText>
            <ThemedText style={[styles.reviewDesc, { color: theme.textSecondary }]}>
              {t("restart_onboarding_subtitle")}
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
              <ThemedText style={styles.statsTitle}>{t("text_memorization")}</ThemedText>
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
                  {t("memorized")}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.secondary }]}>
                  {textStats.needsWork}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("needs_work")}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }]}>
                  {textStats.notStarted}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("not_started")}
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
              <ThemedText style={styles.statsTitle}>{t("audio_memorization")}</ThemedText>
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
                  {t("memorized")}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.light.secondary }]}>
                  {audioStats.needsWork}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("needs_work")}
                </ThemedText>
              </View>

              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }]}>
                  {audioStats.notStarted}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("not_started")}
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
            <ThemedText style={styles.totalLabel}>{t("total_words")}</ThemedText>
            <ThemedText style={[styles.totalValue, { color: theme.primary }]}>
              {totalWords}
            </ThemedText>
          </View>

          <Button onPress={handleResetProgress} style={styles.resetButton}>
            {t("reset_progress")}
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


      {/* バージョン情報 */}
      <View style={[styles.versionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={styles.versionRow}>
          <View style={[styles.versionIconWrap, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="smartphone" size={20} color={theme.primary} />
          </View>
          <View style={styles.versionTextWrap}>
            <ThemedText style={styles.versionLabel}>{t("app_version")}</ThemedText>
            <ThemedText style={[styles.versionNumber, { color: theme.textSecondary }]}>
              {Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "—"}
              {updateInfo.available ? `  →  v${updateInfo.latestVersion}` : ""}
            </ThemedText>
          </View>
          <Pressable
            testID="button-check-update"
            onPress={async () => {
              if (checkingUpdate) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCheckingUpdate(true);
              setUpToDate(false);
              const result = await recheckUpdate();
              setCheckingUpdate(false);
              if (!result.available) {
                setUpToDate(true);
                setTimeout(() => setUpToDate(false), 4000);
              }
            }}
            style={[styles.checkUpdateButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          >
            {checkingUpdate ? (
              <Feather name="loader" size={14} color={theme.textSecondary} />
            ) : upToDate ? (
              <Feather name="check" size={14} color={Colors.light.success} />
            ) : (
              <Feather name="refresh-cw" size={14} color={theme.primary} />
            )}
            <ThemedText style={[styles.checkUpdateText, {
              color: checkingUpdate ? theme.textSecondary : upToDate ? Colors.light.success : theme.primary
            }]}>
              {checkingUpdate ? t("checking_update") : upToDate ? t("up_to_date") : t("check_update")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
      {/* 開発者モード: プレミアム切り替え */}
      <View style={[styles.devPremiumCard, { backgroundColor: theme.backgroundDefault, borderColor: `${theme.primary}40` }]}>
        <View style={styles.devPremiumHeader}>
          <View style={[styles.devPremiumIconWrap, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="code" size={18} color={theme.primary} />
          </View>
          <View style={styles.devPremiumTitleWrap}>
            <ThemedText style={[styles.devPremiumTitle, { color: theme.text }]}>
              開発者モード
            </ThemedText>
            <ThemedText style={[styles.devPremiumSubtitle, { color: theme.textSecondary }]}>
              {devPremiumOverride === null
                ? `実際の状態 (${isPremium ? "プレミアム" : "非プレミアム"})`
                : devPremiumOverride
                ? "強制: プレミアム"
                : "強制: 非プレミアム"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.devPremiumButtons}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDevPremiumOverride(false);
            }}
            style={[
              styles.devPremiumBtn,
              {
                backgroundColor: devPremiumOverride === false
                  ? Colors.light.secondary
                  : theme.backgroundSecondary,
                borderColor: devPremiumOverride === false
                  ? Colors.light.secondary
                  : theme.border,
              },
            ]}
          >
            <Feather
              name="lock"
              size={14}
              color={devPremiumOverride === false ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText style={[
              styles.devPremiumBtnText,
              { color: devPremiumOverride === false ? "#FFFFFF" : theme.textSecondary },
            ]}>
              非プレミアム
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDevPremiumOverride(null);
            }}
            style={[
              styles.devPremiumBtn,
              {
                backgroundColor: devPremiumOverride === null
                  ? theme.primary
                  : theme.backgroundSecondary,
                borderColor: devPremiumOverride === null
                  ? theme.primary
                  : theme.border,
              },
            ]}
          >
            <Feather
              name="refresh-cw"
              size={14}
              color={devPremiumOverride === null ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText style={[
              styles.devPremiumBtnText,
              { color: devPremiumOverride === null ? "#FFFFFF" : theme.textSecondary },
            ]}>
              実際の状態
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDevPremiumOverride(true);
            }}
            style={[
              styles.devPremiumBtn,
              {
                backgroundColor: devPremiumOverride === true
                  ? Colors.light.success
                  : theme.backgroundSecondary,
                borderColor: devPremiumOverride === true
                  ? Colors.light.success
                  : theme.border,
              },
            ]}
          >
            <Feather
              name="star"
              size={14}
              color={devPremiumOverride === true ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText style={[
              styles.devPremiumBtnText,
              { color: devPremiumOverride === true ? "#FFFFFF" : theme.textSecondary },
            ]}>
              プレミアム
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={reviewDevModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewDevModalVisible(false)}
      >
        <Pressable
          style={styles.devModalBackdrop}
          onPress={() => setReviewDevModalVisible(false)}
        >
          <Pressable
            style={[styles.devModalCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.devModalHeader}>
              <Feather name="activity" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.devModalTitle, { color: theme.text }]}>
                評価依頼ログ（開発用）
              </ThemedText>
            </View>

            <ThemedText style={[styles.devModalSummary, { color: theme.textSecondary }]}>
              累計: {reviewHistory.length}回 / 過去365日: {
                reviewHistory.filter(e => e.requested && e.ts > Date.now() - 365 * 24 * 60 * 60 * 1000).length
              }回
            </ThemedText>

            {reviewHistory.length === 0 ? (
              <ThemedText style={[styles.devModalEmpty, { color: theme.textSecondary }]}>
                まだ評価依頼を提案していません
              </ThemedText>
            ) : (
              <View style={{ maxHeight: 320 }}>
                {reviewHistory.slice().reverse().slice(0, 20).map((entry, idx) => {
                  const d = new Date(entry.ts);
                  const stamp = `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`;
                  const statusColor = entry.requested
                    ? Colors.light.success
                    : entry.hadAction === false ? theme.textSecondary : Colors.light.alert;
                  const statusLabel = entry.requested
                    ? "実行"
                    : entry.hadAction === false ? "未対応" : "ｽｷｯﾌﾟ";
                  return (
                    <View
                      key={`${entry.ts}-${idx}`}
                      style={[styles.devModalRow, { borderBottomColor: theme.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.devModalRowDate, { color: theme.text }]}>
                          {stamp}
                        </ThemedText>
                        <ThemedText style={[styles.devModalRowTrigger, { color: theme.textSecondary }]}>
                          {entry.trigger}
                        </ThemedText>
                      </View>
                      <View style={[styles.devModalBadge, { backgroundColor: `${statusColor}22` }]}>
                        <ThemedText style={[styles.devModalBadgeText, { color: statusColor }]}>
                          {statusLabel}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.devModalFooter}>
              <Pressable
                style={[styles.devModalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={async () => {
                  await clearReviewHistory();
                  const fresh = await getReviewHistory();
                  setReviewHistory(fresh);
                }}
              >
                <ThemedText style={[styles.devModalButtonText, { color: theme.text }]}>
                  履歴をクリア
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.devModalButton, { backgroundColor: theme.primary }]}
                onPress={() => setReviewDevModalVisible(false)}
              >
                <ThemedText style={[styles.devModalButtonText, { color: "#FFFFFF" }]}>
                  閉じる
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  langBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: "center",
  },
  langBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
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
  updateButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    marginTop: Spacing.sm,
  },
  updateButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  checkUpdateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: BorderRadius.full ?? 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  checkUpdateText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  updateBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  updateBannerText: {
    flex: 1,
    gap: 2,
  },
  updateBannerTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
  },
  updateBannerSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.85)",
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
  devModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  devModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  devModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  devModalTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  devModalSummary: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.md,
  },
  devModalEmpty: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  devModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devModalRowDate: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  devModalRowTrigger: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    marginTop: 1,
  },
  devModalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  devModalBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  devModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  devModalButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  devModalButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  devPremiumCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  devPremiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  devPremiumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  devPremiumTitleWrap: {
    flex: 1,
  },
  devPremiumTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  devPremiumSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  devPremiumButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  devPremiumBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  devPremiumBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
