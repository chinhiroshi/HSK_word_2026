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
  const memorizedCount = words.filter((w) => w.isMemorized).length;
  const percentage = totalWords > 0 ? Math.round((memorizedCount / totalWords) * 100) : 0;

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
        <ThemedText style={styles.statsTitle}>学習進捗</ThemedText>

        <View style={styles.progressContainer}>
          <ProgressBar progress={percentage} height={10} />
          <ThemedText style={[styles.progressText, { color: theme.primary }]}>
            {percentage}%
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>
              {totalWords}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              総単語数
            </ThemedText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors.light.success }]}>
              {memorizedCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              暗記済み
            </ThemedText>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors.light.alert }]}>
              {totalWords - memorizedCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              未暗記
            </ThemedText>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.featuresCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <ThemedText style={styles.featuresTitle}>今後の機能</ThemedText>

        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="refresh-cw" size={18} color={theme.primary} />
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureName}>間隔反復</ThemedText>
            <ThemedText style={[styles.featureDesc, { color: theme.textSecondary }]}>
              復習タイミングを最適化
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="target" size={18} color={theme.primary} />
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureName}>毎日の目標</ThemedText>
            <ThemedText style={[styles.featureDesc, { color: theme.textSecondary }]}>
              1日の暗記目標を設定
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="zap" size={18} color={theme.primary} />
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureName}>連続学習記録</ThemedText>
            <ThemedText style={[styles.featureDesc, { color: theme.textSecondary }]}>
              毎日の学習を継続
            </ThemedText>
          </View>
        </View>
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
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    minWidth: 45,
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
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  featuresCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.xs,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  resetButton: {
    marginBottom: Spacing.xl,
  },
});
