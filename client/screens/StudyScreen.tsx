import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { WordCard } from "@/components/WordCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, markAsUnmemorized, clearUnmemorizedMark, initializeData } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = "all" | "memorized" | "unmemorized";

const JUMP_INTERVAL = 50;

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const flatListRef = useRef<FlatList<Word>>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadWords = useCallback(async () => {
    await initializeData();
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  };

  const handleMarkUnmemorized = async (wordId: string) => {
    const updatedWord = await markAsUnmemorized(wordId);
    if (updatedWord) {
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? updatedWord : w))
      );
    }
  };

  const handleClearMark = async (wordId: string) => {
    const updatedWord = await clearUnmemorizedMark(wordId);
    if (updatedWord) {
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? updatedWord : w))
      );
    }
  };

  const handleWordPress = (word: Word) => {
    navigation.navigate("WordDetail", { wordId: word.id });
  };

  const filteredWords = useMemo(() => {
    switch (filter) {
      case "memorized":
        return words.filter((w) => w.isMemorized && (w.unmemorizedCount || 0) === 0);
      case "unmemorized":
        return words.filter((w) => (w.unmemorizedCount || 0) > 0);
      default:
        return words;
    }
  }, [words, filter]);

  const jumpTargets = useMemo(() => {
    const targets: number[] = [];
    for (let i = JUMP_INTERVAL; i <= words.length; i += JUMP_INTERVAL) {
      targets.push(i);
    }
    return targets;
  }, [words.length]);

  const handleJumpTo = (targetIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (filter !== "all") {
      setFilter("all");
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex - 1,
          animated: true,
          viewPosition: 0,
        });
      }, 100);
    } else {
      flatListRef.current?.scrollToIndex({
        index: targetIndex - 1,
        animated: true,
        viewPosition: 0,
      });
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  const stats = useMemo(() => {
    const memorized = words.filter((w) => w.isMemorized && (w.unmemorizedCount || 0) === 0).length;
    const unmemorized = words.filter((w) => (w.unmemorizedCount || 0) > 0).length;
    return { total: words.length, memorized, unmemorized };
  }, [words]);

  const renderWordItem = ({ item, index }: { item: Word; index: number }) => {
    const originalIndex = filter === "all" ? index + 1 : words.indexOf(item) + 1;

    return (
      <WordCard
        word={item}
        index={originalIndex}
        onPress={() => handleWordPress(item)}
        onMarkUnmemorized={() => handleMarkUnmemorized(item.id)}
        onClearMark={() => handleClearMark(item.id)}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={8} />;
    }
    if (filter === "memorized") {
      return (
        <View style={styles.emptyFilterState}>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            まだ覚えた単語がありません
          </ThemedText>
        </View>
      );
    }
    if (filter === "unmemorized") {
      return (
        <View style={styles.emptyFilterState}>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            マークした単語がありません
          </ThemedText>
        </View>
      );
    }
    return null;
  };

  const onScrollToIndexFailed = (info: { index: number; averageItemLength: number }) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0,
      });
    }, 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        {filter === "all" && jumpTargets.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jumpContainer}
          >
            <ThemedText style={[styles.jumpLabel, { color: theme.textSecondary }]}>
              移動:
            </ThemedText>
            {jumpTargets.map((target) => (
              <Pressable
                key={target}
                onPress={() => handleJumpTo(target)}
                style={[styles.jumpButton, { backgroundColor: theme.backgroundSecondary }]}
                testID={`jump-to-${target}`}
              >
                <ThemedText style={[styles.jumpButtonText, { color: theme.primary }]}>
                  {target}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => handleFilterChange("all")}
            style={[
              styles.filterButton,
              filter === "all" && { backgroundColor: theme.primary },
              filter !== "all" && { backgroundColor: theme.backgroundSecondary },
            ]}
            testID="filter-all"
          >
            <ThemedText
              style={[
                styles.filterButtonText,
                { color: filter === "all" ? "#FFFFFF" : theme.text },
              ]}
            >
              全部 ({stats.total})
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleFilterChange("memorized")}
            style={[
              styles.filterButton,
              filter === "memorized" && { backgroundColor: Colors.light.success },
              filter !== "memorized" && { backgroundColor: theme.backgroundSecondary },
            ]}
            testID="filter-memorized"
          >
            <ThemedText
              style={[
                styles.filterButtonText,
                { color: filter === "memorized" ? "#FFFFFF" : Colors.light.success },
              ]}
            >
              覚えた ({stats.memorized})
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleFilterChange("unmemorized")}
            style={[
              styles.filterButton,
              filter === "unmemorized" && { backgroundColor: Colors.light.secondary },
              filter !== "unmemorized" && { backgroundColor: theme.backgroundSecondary },
            ]}
            testID="filter-unmemorized"
          >
            <ThemedText
              style={[
                styles.filterButtonText,
                { color: filter === "unmemorized" ? "#FFFFFF" : Colors.light.secondary },
              ]}
            >
              まだ ({stats.unmemorized})
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          filteredWords.length === 0 && !loading && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : filteredWords}
        renderItem={renderWordItem}
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
        onScrollToIndexFailed={onScrollToIndexFailed}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  jumpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingRight: Spacing.lg,
  },
  jumpLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginRight: Spacing.xs,
  },
  jumpButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  jumpButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  filterButtonText: {
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
  emptyContainer: {
    flexGrow: 1,
  },
  emptyFilterState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
});
