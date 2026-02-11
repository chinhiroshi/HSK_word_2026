import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GROUP_SIZE = 50;

interface WordGroup {
  id: string;
  startIndex: number;
  endIndex: number;
  words: Word[];
  memorizedCount: number;
  unmemorizedCount: number;
}

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWords = useCallback(async () => {
    await initializeData();
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadWords();
    });
    return unsubscribe;
  }, [navigation, loadWords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  };

  const totalStats = useMemo(() => {
    const memorized = words.filter(
      (w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0
    ).length;
    const needsWork = words.filter(
      (w) => (w.textUnmemorizedCount || 0) > 0
    ).length;
    return { total: words.length, memorized, needsWork };
  }, [words]);

  const groups = useMemo(() => {
    const result: WordGroup[] = [];
    for (let i = 0; i < words.length; i += GROUP_SIZE) {
      const groupWords = words.slice(i, Math.min(i + GROUP_SIZE, words.length));
      const memorizedCount = groupWords.filter(
        (w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0
      ).length;
      const unmemorizedCount = groupWords.filter(
        (w) => (w.textUnmemorizedCount || 0) > 0
      ).length;

      result.push({
        id: `group-${i}`,
        startIndex: i + 1,
        endIndex: Math.min(i + GROUP_SIZE, words.length),
        words: groupWords,
        memorizedCount,
        unmemorizedCount,
      });
    }
    return result;
  }, [words]);

  const handleGroupPress = (group: WordGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("WordList", {
      startIndex: group.startIndex,
      endIndex: group.endIndex,
    });
  };

  const handleNeedsWorkPress = () => {
    if (totalStats.needsWork > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("UnmemorizedList", { type: "text" });
    }
  };

  const renderGroupItem = ({ item }: { item: WordGroup }) => {
    const totalInGroup = item.words.length;
    const neutralCount = totalInGroup - item.memorizedCount - item.unmemorizedCount;

    return (
      <Pressable
        onPress={() => handleGroupPress(item)}
        style={({ pressed }) => [
          styles.groupCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        testID={`group-${item.startIndex}`}
      >
        <View style={styles.groupHeader}>
          <View style={[styles.groupIndex, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.groupIndexText}>
              {item.startIndex}-{item.endIndex}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: `${Colors.light.success}20` }]}>
            <Feather name="check" size={14} color={Colors.light.success} />
            <ThemedText style={[styles.statText, { color: Colors.light.success }]}>
              {item.memorizedCount}
            </ThemedText>
          </View>

          <View style={[styles.statBadge, { backgroundColor: `${Colors.light.secondary}20` }]}>
            <Feather name="flag" size={14} color={Colors.light.secondary} />
            <ThemedText style={[styles.statText, { color: Colors.light.secondary }]}>
              {item.unmemorizedCount}
            </ThemedText>
          </View>

          <View style={[styles.statBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>
              {neutralCount} 未学習
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={6} />;
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.summaryCard,
          {
            marginTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryValue, { color: theme.primary }]}>
              {totalStats.total}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              総単語
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryValue, { color: Colors.light.success }]}>
              {totalStats.memorized}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              暗記済み
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <Pressable
            style={styles.summaryItem}
            onPress={handleNeedsWorkPress}
            testID="needs-work-button"
          >
            <ThemedText style={[styles.summaryValue, { color: Colors.light.secondary }]}>
              {totalStats.needsWork}
            </ThemedText>
            <View style={styles.summaryLabelRow}>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                暗記必要
              </ThemedText>
              {totalStats.needsWork > 0 ? (
                <Feather name="chevron-right" size={14} color={Colors.light.secondary} />
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  groupIndex: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  groupIndexText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
