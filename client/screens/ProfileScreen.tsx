import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, HskLevel } from "@/types";
import { getWords, resetProgress, initializeData, getSelectedHskLevel, setSelectedHskLevel } from "@/lib/storage";

const avatarDefault = require("../../assets/images/avatar-default.png");

const HSK_LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6];

const HSK_WORD_COUNTS: Record<HskLevel, number> = {
  1: 150,
  2: 150,
  3: 300,
  4: 600,
  5: 1300,
  6: 2500,
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(4);

  const loadData = useCallback(async () => {
    const level = await getSelectedHskLevel();
    setSelectedLevel(level);
    await initializeData(level);
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLevelChange = async (level: HskLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLevel(level);
    setLoading(true);
    await setSelectedHskLevel(level);
    const data = await getWords();
    setWords(data);
    setLoading(false);
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
        <Image source={avatarDefault} style={styles.avatar} contentFit="cover" />
        <ThemedText style={styles.userName}>学習者</ThemedText>
        <ThemedText style={[styles.userSubtitle, { color: theme.textSecondary }]}>
          単語マスターを目指して
        </ThemedText>
      </View>

      <View
        style={[
          styles.levelCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <View style={styles.statsTitleRow}>
          <Feather name="layers" size={18} color={theme.primary} />
          <ThemedText style={styles.statsTitle}>HSK 級を選択</ThemedText>
        </View>

        <View style={styles.levelGrid}>
          {HSK_LEVELS.map((level) => {
            const isSelected = level === selectedLevel;
            const hasData = mockWordsHasLevel(level);
            return (
              <Pressable
                key={level}
                testID={`button-hsk-level-${level}`}
                style={[
                  styles.levelButton,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundRoot,
                    borderColor: isSelected ? theme.primary : theme.border,
                    opacity: hasData ? 1 : 0.5,
                  },
                ]}
                onPress={() => handleLevelChange(level)}
              >
                <ThemedText
                  style={[
                    styles.levelButtonText,
                    { color: isSelected ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {level}級
                </ThemedText>
                <ThemedText
                  style={[
                    styles.levelWordCount,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                  ]}
                >
                  {hasData ? `${getWordCountForLevel(level)}語` : "準備中"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

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
  levelCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  levelButton: {
    width: "30%",
    flexGrow: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  levelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  levelWordCount: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
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
});
