import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

const TIME_OPTIONS = [
  { label: "15分", minutes: 15, description: "約10単語/日" },
  { label: "30分", minutes: 30, description: "約20単語/日" },
  { label: "45分", minutes: 45, description: "約30単語/日" },
];

export default function SprintSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setupSprint } = useSprint();

  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelectPreset = (minutes: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMinutes(minutes);
    setShowCustom(false);
  };

  const handleSelectCustom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMinutes(null);
    setShowCustom(true);
  };

  const effectiveMinutes = showCustom
    ? parseInt(customInput, 10) || 0
    : selectedMinutes || 0;

  const wordsPerDay = Math.max(5, Math.floor(effectiveMinutes * (2 / 3)));
  const reviewCount = Math.max(3, Math.floor(wordsPerDay / 3));
  const canStart = effectiveMinutes >= 5;

  const handleStart = async () => {
    if (!canStart) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    await setupSprint(effectiveMinutes);
    setLoading(false);
    navigation.goBack();
  };

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
              1日の勉強時間を選択してください。{"\n"}
              学習量が自動で決まります。
            </ThemedText>
          </View>

          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            勉強時間を選ぶ
          </ThemedText>

          <View style={styles.optionsContainer}>
            {TIME_OPTIONS.map((opt) => {
              const isSelected = !showCustom && selectedMinutes === opt.minutes;
              return (
                <Pressable
                  key={opt.minutes}
                  testID={`button-time-${opt.minutes}`}
                  onPress={() => handleSelectPreset(opt.minutes)}
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
                placeholder="分数を入力 (例: 20)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={customInput}
                onChangeText={setCustomInput}
                autoFocus
              />
              <ThemedText style={[styles.customUnit, { color: theme.textSecondary }]}>分</ThemedText>
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
                  1日の学習単語: {wordsPerDay}語
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="refresh-cw" size={16} color={theme.primary} />
                <ThemedText style={[styles.summaryText, { color: theme.primary }]}>
                  復習単語数: {reviewCount}語
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="calendar" size={16} color={theme.primary} />
                <ThemedText style={[styles.summaryText, { color: theme.primary }]}>
                  7日サイクル: 学習×4 + 復習×2 + テスト×1
                </ThemedText>
              </View>
            </View>
          ) : null}

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
  startButton: { marginTop: Spacing.sm },
});
