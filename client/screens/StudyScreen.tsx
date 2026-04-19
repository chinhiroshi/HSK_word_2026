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
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useI18n } from "@/contexts/LanguageContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GROUP_SIZE = 50;

type GroupMode = "number" | "pos";

interface WordGroup {
  id: string;
  startIndex: number;
  endIndex: number;
  words: Word[];
  memorizedCount: number;
  unmemorizedCount: number;
}

interface PosWordGroup {
  id: string;
  pos: string;
  subGroupIndex: number;
  startNum: number;
  endNum: number;
  wordIds: string[];
  words: Word[];
  memorizedCount: number;
  unmemorizedCount: number;
}

const POS_ORDER = [
  "名詞", "動詞", "形容詞", "副詞", "代名詞",
  "前置詞", "接続詞", "助詞", "感嘆詞", "数詞", "助動詞",
];

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isGroupLocked, isFreeLevel } = useSubscription();
  const { t } = useI18n();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("number");

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

  const posGroups = useMemo((): PosWordGroup[] => {
    const posMap = new Map<string, Word[]>();
    for (const word of words) {
      const pos = word.posJa || t("pos_other");
      if (!posMap.has(pos)) posMap.set(pos, []);
      posMap.get(pos)!.push(word);
    }

    const sortedEntries = [...posMap.entries()].sort((a, b) => {
      const ai = POS_ORDER.indexOf(a[0]);
      const bi = POS_ORDER.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const result: PosWordGroup[] = [];
    for (const [pos, posWords] of sortedEntries) {
      for (let i = 0; i < posWords.length; i += GROUP_SIZE) {
        const chunk = posWords.slice(i, Math.min(i + GROUP_SIZE, posWords.length));
        result.push({
          id: `pos-${pos}-${i}`,
          pos,
          subGroupIndex: Math.floor(i / GROUP_SIZE),
          startNum: i + 1,
          endNum: Math.min(i + GROUP_SIZE, posWords.length),
          wordIds: chunk.map((w) => w.id),
          words: chunk,
          memorizedCount: chunk.filter(
            (w) => w.textMemorized && (w.textUnmemorizedCount || 0) === 0
          ).length,
          unmemorizedCount: chunk.filter(
            (w) => (w.textUnmemorizedCount || 0) > 0
          ).length,
        });
      }
    }
    return result;
  }, [words, t]);

  const currentHskLevel = words.length > 0 ? words[0].hskLevel : undefined;

  const handleGroupPress = (group: WordGroup, groupIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isGroupLocked(groupIndex, currentHskLevel)) {
      navigation.navigate("Paywall");
      return;
    }
    navigation.navigate("WordList", {
      startIndex: group.startIndex,
      endIndex: group.endIndex,
    });
  };

  const handlePosGroupPress = (group: PosWordGroup, groupIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isGroupLocked(groupIndex, currentHskLevel)) {
      navigation.navigate("Paywall");
      return;
    }
    const title =
      group.subGroupIndex === 0
        ? group.pos
        : `${group.pos} ${group.startNum}-${group.endNum}`;
    navigation.navigate("WordList", {
      startIndex: 1,
      endIndex: 1,
      wordIds: group.wordIds,
      groupTitle: title,
    });
  };

  const handleNeedsWorkPress = () => {
    if (totalStats.needsWork > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("UnmemorizedList", { type: "text" });
    }
  };

  const handleToggleMode = (mode: GroupMode) => {
    Haptics.selectionAsync();
    setGroupMode(mode);
  };

  const renderNumberGroupItem = ({ item, index }: { item: WordGroup; index: number }) => {
    const totalInGroup = item.words.length;
    const neutralCount = totalInGroup - item.memorizedCount - item.unmemorizedCount;
    const locked = isGroupLocked(index, currentHskLevel);

    return (
      <Pressable
        onPress={() => handleGroupPress(item, index)}
        style={({ pressed }) => [
          styles.groupCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : locked ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        testID={`group-${item.startIndex}`}
      >
        <View style={styles.groupHeader}>
          <View style={[styles.groupIndex, { backgroundColor: locked ? theme.textSecondary : theme.primary }]}>
            <ThemedText style={styles.groupIndexText}>
              {item.startIndex}-{item.endIndex}
            </ThemedText>
          </View>
          {locked ? (
            <Feather name="lock" size={18} color={theme.textSecondary} />
          ) : (
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          )}
        </View>

        {locked ? (
          <View style={styles.lockedRow}>
            <ThemedText style={[styles.lockedText, { color: theme.textSecondary }]}>
              {t("premium_unlock")}
            </ThemedText>
          </View>
        ) : (
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
                {neutralCount}
              </ThemedText>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderPosGroupItem = ({ item, index }: { item: PosWordGroup; index: number }) => {
    const totalInGroup = item.words.length;
    const neutralCount = totalInGroup - item.memorizedCount - item.unmemorizedCount;
    const locked = isGroupLocked(index, currentHskLevel);

    return (
      <Pressable
        onPress={() => handlePosGroupPress(item, index)}
        style={({ pressed }) => [
          styles.groupCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : locked ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        testID={`pos-group-${item.id}`}
      >
        <View style={styles.groupHeader}>
          <View style={styles.posLabelRow}>
            <View style={[styles.groupIndex, { backgroundColor: locked ? theme.textSecondary : theme.primary }]}>
              <ThemedText style={styles.groupIndexText}>{item.pos}</ThemedText>
            </View>
            {item.subGroupIndex > 0 ? (
              <ThemedText style={[styles.posSubLabel, { color: theme.textSecondary }]}>
                {item.startNum}-{item.endNum}
              </ThemedText>
            ) : null}
          </View>
          {locked ? (
            <Feather name="lock" size={18} color={theme.textSecondary} />
          ) : (
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          )}
        </View>

        {locked ? (
          <View style={styles.lockedRow}>
            <ThemedText style={[styles.lockedText, { color: theme.textSecondary }]}>
              {t("premium_unlock")}
            </ThemedText>
          </View>
        ) : (
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
                {neutralCount}
              </ThemedText>
            </View>
            <View style={[styles.statBadge, { backgroundColor: `${theme.primary}15` }]}>
              <ThemedText style={[styles.statText, { color: theme.primary }]}>
                {totalInGroup}{t("words_unit")}
              </ThemedText>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={6} />;
    }
    return null;
  };

  const activeData = groupMode === "number" ? groups : posGroups;

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
              {t("total")}
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryValue, { color: Colors.light.success }]}>
              {totalStats.memorized}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              {t("memorized")}
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
                {t("text_needs_work")}
              </ThemedText>
              {totalStats.needsWork > 0 ? (
                <Feather name="chevron-right" size={14} color={Colors.light.secondary} />
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      <View style={[styles.toggleRow, { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }]}>
        <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Pressable
            onPress={() => handleToggleMode("number")}
            style={[
              styles.toggleButton,
              groupMode === "number" && { backgroundColor: theme.primary },
            ]}
            testID="toggle-number-mode"
          >
            <Feather
              name="hash"
              size={14}
              color={groupMode === "number" ? "#fff" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.toggleLabel,
                { color: groupMode === "number" ? "#fff" : theme.textSecondary },
              ]}
            >
              {t("group_by_number")}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleToggleMode("pos")}
            style={[
              styles.toggleButton,
              groupMode === "pos" && { backgroundColor: theme.primary },
            ]}
            testID="toggle-pos-mode"
          >
            <Feather
              name="tag"
              size={14}
              color={groupMode === "pos" ? "#fff" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.toggleLabel,
                { color: groupMode === "pos" ? "#fff" : theme.textSecondary },
              ]}
            >
              {t("group_by_pos")}
            </ThemedText>
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
        data={loading ? [] : (activeData as any[])}
        renderItem={
          groupMode === "number"
            ? renderNumberGroupItem as any
            : renderPosGroupItem as any
        }
        keyExtractor={(item: any) => item.id}
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
  toggleRow: {
    flexDirection: "row",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
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
  posLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  posSubLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
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
    flexWrap: "wrap",
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
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  lockedText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
});
