import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";
import { getWords, initializeData, resetWordsOnly } from "@/lib/storage";
import {
  DEFAULT_NOTIF_HOUR,
  DEFAULT_NOTIF_MINUTE,
  enableSprintNotification,
  disableSprintNotification,
} from "@/lib/notifications";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;
type SetupRouteProp = RouteProp<SprintStackParamList, "SprintSetup">;

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

export default function SprintSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SetupRouteProp>();
  const isChange = !!(route.params as any)?.isChange;
  const fromOnboarding = !!(route.params as any)?.fromOnboarding;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const { theme } = useTheme();
  const { t } = useI18n();
  const { setupSprint } = useSprint();

  const WORD_OPTIONS = [
    { label: `10${t("words_unit")}`, words: 10, description: t("words_10_desc") },
    { label: `20${t("words_unit")}`, words: 20, description: t("words_20_desc") },
    { label: `30${t("words_unit")}`, words: 30, description: t("words_30_desc") },
    { label: `50${t("words_unit")}`, words: 50, description: t("words_50_desc") },
  ];

  const [selectedWords, setSelectedWords] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalWords, setTotalWords] = useState(150);

  const [notifEnabled, setNotifEnabled] = useState(fromOnboarding);
  const [notifHour, setNotifHour] = useState(DEFAULT_NOTIF_HOUR);
  const [notifMinute, setNotifMinute] = useState(DEFAULT_NOTIF_MINUTE);
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(DEFAULT_NOTIF_HOUR, DEFAULT_NOTIF_MINUTE, 0, 0);
    return d;
  });
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    initializeData().then(() =>
      getWords().then((ws) => setTotalWords(Math.max(1, ws.length)))
    );
  }, []);

  const handleSelectPreset = (words: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWords(words);
    setShowCustom(false);
  };

  const handleSelectCustom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWords(null);
    setShowCustom(true);
  };

  const wordsPerDay = showCustom
    ? Math.max(5, parseInt(customInput, 10) || 0)
    : selectedWords || 0;

  const N = Math.max(1, Math.ceil(50 / Math.max(1, wordsPerDay)));
  const studySessionsNeeded = Math.ceil(totalWords / Math.max(1, wordsPerDay));
  const fullCycles = Math.max(1, Math.ceil(studySessionsNeeded / N));
  const expectedCells = 1 + fullCycles * (N + 1);
  const canStart = wordsPerDay >= 5;

  const handleToggleNotif = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifEnabled((prev) => !prev);
  };

  const handleOpenTimePicker = () => {
    if (!notifEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      const d = new Date();
      d.setHours(notifHour, notifMinute, 0, 0);
      setTempTime(d);
      setShowIOSPicker(true);
    } else {
      setShowAndroidPicker(true);
    }
  };

  const handleIOSPickerDone = () => {
    setNotifHour(tempTime.getHours());
    setNotifMinute(tempTime.getMinutes());
    setShowIOSPicker(false);
  };

  const applyNotifSetting = async () => {
    if (Platform.OS === "web") return;
    try {
      if (notifEnabled) {
        await enableSprintNotification(notifHour, notifMinute);
      } else {
        await disableSprintNotification();
      }
    } catch (e) {
      console.warn("Notification setup failed:", e);
    }
  };

  const handleStart = async () => {
    if (!canStart) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      await setupSprint(wordsPerDay, totalWords);
      await applyNotifSetting();
    } catch (e) {
      console.warn("Sprint setup failed:", e);
    }
    setLoading(false);
    if (fromOnboarding) {
      navigation.replace("TutorialSprint");
    } else {
      navigation.goBack();
    }
  };

  const handleStartWithReset = async () => {
    if (!canStart) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      await resetWordsOnly();
      await setupSprint(wordsPerDay, totalWords);
      await applyNotifSetting();
    } catch (e) {
      console.warn("Sprint setup with reset failed:", e);
    }
    setLoading(false);
    navigation.goBack();
  };

  const notifTimeLabel = `${padTwo(notifHour)}:${padTwo(notifMinute)}`;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.flagIcon, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="flag" size={32} color={Colors.light.success} />
            </View>
            <ThemedText style={styles.title}>{t("sprint_setup_title")}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              1日で覚える語数を選択してください。{"\n"}
              学習マスが自動で作られます。
            </ThemedText>
          </View>

          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            1日で覚える語数を選ぶ
          </ThemedText>

          <View style={styles.optionsGrid}>
            {WORD_OPTIONS.map((opt) => {
              const isSelected = !showCustom && selectedWords === opt.words;
              return (
                <Pressable
                  key={opt.words}
                  testID={`button-words-${opt.words}`}
                  onPress={() => handleSelectPreset(opt.words)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.optionChipLabel,
                      { color: isSelected ? "#fff" : theme.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.optionChipDesc,
                      { color: isSelected ? "rgba(255,255,255,0.85)" : theme.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.description}
                  </ThemedText>
                </Pressable>
              );
            })}

            <Pressable
              testID="button-time-custom"
              onPress={handleSelectCustom}
              style={[
                styles.optionChipWide,
                {
                  backgroundColor: showCustom ? theme.primary : theme.backgroundDefault,
                  borderColor: showCustom ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionChipLabel,
                  { color: showCustom ? "#fff" : theme.text },
                ]}
              >
                それ以外
              </ThemedText>
              <ThemedText
                style={[
                  styles.optionChipDesc,
                  { color: showCustom ? "rgba(255,255,255,0.85)" : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                分数を入力する
              </ThemedText>
            </Pressable>
          </View>

          {showCustom ? (
            <View
              style={[
                styles.customInputContainer,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
            >
              <TextInput
                testID="input-custom-minutes"
                style={[styles.customInput, { color: theme.text }]}
                placeholder={t("words_placeholder")}
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={customInput}
                onChangeText={setCustomInput}
                autoFocus
              />
              <ThemedText style={[styles.customUnit, { color: theme.textSecondary }]}>{t("words_unit")}</ThemedText>
            </View>
          ) : null}

          {canStart ? (
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.primary + "12", borderColor: theme.primary + "40" },
              ]}
            >
              <View style={styles.summaryRow}>
                <Feather name="book-open" size={16} color={theme.primary} />
                <ThemedText style={[styles.summaryText, { color: theme.primary }]}>
                  1日の学習語数: {wordsPerDay}語
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="repeat" size={16} color={theme.primary} />
                <ThemedText style={[styles.summaryText, { color: theme.primary }]}>
                  サイクル: 学習×{N} + テスト×1（50語ごと）
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="map" size={16} color={theme.primary} />
                <ThemedText style={[styles.summaryText, { color: theme.primary }]}>
                  マス数: {expectedCells - 1}マス（全{totalWords}語をカバー）
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* Push Notification Section — defaults ON during onboarding, configurable */}
          <View style={[styles.notifCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText style={[styles.notifTitle, { color: theme.text }]}>
              学習リマインダー
            </ThemedText>
            <ThemedText style={[styles.notifDesc, { color: theme.textSecondary }]}>
              毎日決まった時間に通知でスプリントの学習を促します。
            </ThemedText>

            <Pressable
              testID="button-toggle-notif"
              onPress={handleToggleNotif}
              style={styles.notifToggleRow}
            >
              <View style={styles.notifToggleLeft}>
                <View style={[styles.notifIcon, { backgroundColor: Colors.light.secondary + "18" }]}>
                  <Feather name="bell" size={18} color={Colors.light.secondary} />
                </View>
                <ThemedText style={[styles.notifToggleLabel, { color: theme.text }]}>
                  通知を受け取る
                </ThemedText>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: notifEnabled ? Colors.light.secondary : theme.border },
              ]}>
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: notifEnabled ? 20 : 2 }] },
                ]} />
              </View>
            </Pressable>

            {notifEnabled ? (
              <Pressable
                testID="button-notif-time"
                onPress={handleOpenTimePicker}
                style={[styles.notifTimeRow, { borderTopColor: theme.border }]}
              >
                <View style={styles.notifToggleLeft}>
                  <View style={[styles.notifIcon, { backgroundColor: theme.primary + "15" }]}>
                    <Feather name="clock" size={18} color={theme.primary} />
                  </View>
                  <ThemedText style={[styles.notifToggleLabel, { color: theme.text }]}>
                    {t("notif_time")}
                  </ThemedText>
                </View>
                <View style={styles.notifTimeRight}>
                  <ThemedText style={[styles.notifTimeValue, { color: theme.primary }]}>
                    {notifTimeLabel}
                  </ThemedText>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {isChange ? (
            <View style={styles.changeButtonsContainer}>
              <Button
                testID="button-change-keep-data"
                onPress={handleStart}
                disabled={!canStart || loading}
                style={styles.startButton}
              >
                {loading ? t("setting_up") : t("keep_data_change")}
              </Button>
              <Pressable
                testID="button-change-reset-data"
                onPress={handleStartWithReset}
                disabled={!canStart || loading}
                style={({ pressed }) => [
                  styles.resetDataButton,
                  { borderColor: Colors.light.alert + "60", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="refresh-cw" size={15} color={Colors.light.alert} />
                <ThemedText style={[styles.resetDataButtonText, { color: Colors.light.alert }]}>
                  {loading ? t("setting_up") : t("reset_data_change")}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Button
              testID="button-start-sprint"
              onPress={handleStart}
              disabled={!canStart || loading}
              style={styles.startButton}
            >
              {loading ? t("setting_up") : t("start_sprint")}
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Time Picker Modal */}
      {Platform.OS === "ios" && showIOSPicker ? (
        <Modal transparent animationType="slide" visible={showIOSPicker}>
          <View style={styles.iosPickerOverlay}>
            <View style={[styles.iosPickerSheet, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
                <ThemedText style={[styles.iosPickerTitle, { color: theme.textSecondary }]}>
                  {t("select_notification_time")}
                </ThemedText>
                <Pressable onPress={handleIOSPickerDone}>
                  <ThemedText style={[styles.iosPickerDone, { color: theme.primary }]}>{t("done")}</ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                locale="ja-JP"
                onChange={(_e, d) => { if (d) setTempTime(d); }}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Android Time Picker */}
      {Platform.OS === "android" && showAndroidPicker ? (
        <DateTimePicker
          value={(() => { const d = new Date(); d.setHours(notifHour, notifMinute, 0, 0); return d; })()}
          mode="time"
          display="default"
          onChange={(_e, d) => {
            setShowAndroidPicker(false);
            if (d) { setNotifHour(d.getHours()); setNotifMinute(d.getMinutes()); }
          }}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  header: { alignItems: "center", marginBottom: Spacing.lg },
  flagIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionChip: {
    width: "48%",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipWide: {
    width: "100%",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  optionChipDesc: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    height: 56,
  },
  customInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
  },
  customUnit: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  summaryText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  notifCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  notifTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  notifDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    lineHeight: 19,
  },
  notifToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  notifToggleLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md, flex: 1 },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  notifToggleLabel: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  notifTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  notifTimeRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  notifTimeValue: { fontSize: 17, fontFamily: "Nunito_700Bold" },
  startButton: { marginTop: Spacing.sm },
  changeButtonsContainer: { gap: Spacing.md, marginTop: Spacing.sm },
  resetDataButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
  },
  resetDataButtonText: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  iosPickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  iosPickerTitle: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  iosPickerDone: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  picker: { height: 200 },
});
