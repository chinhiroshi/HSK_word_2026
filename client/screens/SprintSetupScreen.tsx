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
import { useNavigation } from "@react-navigation/native";
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
import { getWords, initializeData } from "@/lib/storage";
import {
  DEFAULT_NOTIF_HOUR,
  DEFAULT_NOTIF_MINUTE,
  enableSprintNotification,
  disableSprintNotification,
} from "@/lib/notifications";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

const WORD_OPTIONS = [
  { label: "20語", words: 20, description: "初級・コツコツペース" },
  { label: "30語", words: 30, description: "標準ペース" },
  { label: "50語", words: 50, description: "集中ペース" },
];

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

export default function SprintSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setupSprint } = useSprint();

  const [selectedWords, setSelectedWords] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalWords, setTotalWords] = useState(150);

  const [notifEnabled, setNotifEnabled] = useState(false);
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

  const handleStart = async () => {
    if (!canStart) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    await setupSprint(wordsPerDay, totalWords);
    if (notifEnabled && Platform.OS !== "web") {
      await enableSprintNotification(notifHour, notifMinute);
    } else if (!notifEnabled) {
      await disableSprintNotification();
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
            { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.flagIcon, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="flag" size={32} color={Colors.light.success} />
            </View>
            <ThemedText style={styles.title}>スプリント設定</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              1日で覚える語数を選択してください。{"\n"}
              学習マスが自動で作られます。
            </ThemedText>
          </View>

          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            1日で覚える語数を選ぶ
          </ThemedText>

          <View style={styles.optionsContainer}>
            {WORD_OPTIONS.map((opt) => {
              const isSelected = !showCustom && selectedWords === opt.words;
              return (
                <Pressable
                  key={opt.words}
                  testID={`button-words-${opt.words}`}
                  onPress={() => handleSelectPreset(opt.words)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      { color: isSelected ? "#fff" : theme.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.optionDesc,
                      { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                    ]}
                  >
                    {opt.description}
                  </ThemedText>
                  {isSelected ? (
                    <View style={styles.checkIcon}>
                      <Feather name="check" size={16} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              testID="button-time-custom"
              onPress={handleSelectCustom}
              style={[
                styles.optionCard,
                {
                  backgroundColor: showCustom ? theme.primary : theme.backgroundDefault,
                  borderColor: showCustom ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionLabel,
                  { color: showCustom ? "#fff" : theme.text },
                ]}
              >
                それ以外
              </ThemedText>
              <ThemedText
                style={[
                  styles.optionDesc,
                  { color: showCustom ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                ]}
              >
                分数を入力する
              </ThemedText>
              {showCustom ? (
                <View style={styles.checkIcon}>
                  <Feather name="check" size={16} color="#fff" />
                </View>
              ) : null}
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
                placeholder="語数を入力 (例: 40)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={customInput}
                onChangeText={setCustomInput}
                autoFocus
              />
              <ThemedText style={[styles.customUnit, { color: theme.textSecondary }]}>語</ThemedText>
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

          {/* Push Notification Section */}
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
                    通知時刻
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

          <Button
            testID="button-start-sprint"
            onPress={handleStart}
            disabled={!canStart || loading}
            style={styles.startButton}
          >
            {loading ? "設定中..." : "スプリントを開始"}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Time Picker Modal */}
      {Platform.OS === "ios" && showIOSPicker ? (
        <Modal transparent animationType="slide" visible={showIOSPicker}>
          <View style={styles.iosPickerOverlay}>
            <View style={[styles.iosPickerSheet, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
                <ThemedText style={[styles.iosPickerTitle, { color: theme.textSecondary }]}>
                  通知時刻を選択
                </ThemedText>
                <Pressable onPress={handleIOSPickerDone}>
                  <ThemedText style={[styles.iosPickerDone, { color: theme.primary }]}>完了</ThemedText>
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
  header: { alignItems: "center", marginBottom: Spacing["2xl"] },
  flagIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsContainer: { gap: Spacing.md, marginBottom: Spacing.lg },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginRight: Spacing.md,
    minWidth: 50,
  },
  optionDesc: { fontSize: 13, fontFamily: "Nunito_400Regular", flex: 1 },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
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
