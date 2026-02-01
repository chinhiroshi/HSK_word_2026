import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, resetProgress, initializeData } from "@/lib/storage";

const avatarDefault = require("../../assets/images/avatar-default.png");

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    await initializeData();
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <Image source={avatarDefault} style={styles.avatar} contentFit="cover" />
        <ThemedText style={styles.userName}>学習者</ThemedText>
        <ThemedText style={[styles.userSubtitle, { color: theme.textSecondary }]}>
          単語マスターを目指して
        </ThemedText>
      </View>

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
    </KeyboardAwareScrollViewCompat>
  );
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
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  userSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
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
});
