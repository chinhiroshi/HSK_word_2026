import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { SpeakButton } from "@/components/SpeakButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, markAsUnmemorized, clearUnmemorizedMark, markAsMemorized, initializeData } from "@/lib/storage";

type FilterType = "all" | "memorized" | "unmemorized";

interface AudioWordCardProps {
  word: Word;
  index: number;
  onMarkUnmemorized: () => void;
  onClearMark: () => void;
  onMarkMemorized: () => void;
}

function AudioWordCard({ word, index, onMarkUnmemorized, onClearMark, onMarkMemorized }: AudioWordCardProps) {
  const { theme } = useTheme();
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed(true);
  };

  const unmemorizedCount = word.unmemorizedCount || 0;
  const isMarked = unmemorizedCount > 0;
  const isMemorized = word.isMemorized && !isMarked;

  const borderLeftColor = isMarked
    ? Colors.light.secondary
    : isMemorized
    ? Colors.light.success
    : "transparent";

  const speakText = `${word.word}。${word.exampleSentence}`;

  const handleMarkUnmemorized = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkUnmemorized();
  };

  const handleClearMark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearMark();
  };

  const handleMarkMemorized = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkMemorized();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderLeftColor: borderLeftColor,
          borderLeftWidth: isMarked || isMemorized ? 3 : 1,
        },
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={[styles.indexContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.indexText, { color: theme.textSecondary }]}>
              {index}
            </ThemedText>
          </View>

          <View style={styles.speakContainer}>
            <SpeakButton text={speakText} size="medium" />
          </View>

          <Pressable
            onPress={handleReveal}
            style={[
              styles.revealButton,
              { 
                backgroundColor: revealed ? `${theme.primary}20` : theme.backgroundSecondary,
              },
            ]}
            disabled={revealed}
          >
            <Feather 
              name={revealed ? "eye" : "eye-off"} 
              size={18} 
              color={revealed ? theme.primary : theme.textSecondary} 
            />
          </Pressable>

          <View style={styles.markActions}>
            {isMarked ? (
              <>
                <View style={[styles.countBadge, { backgroundColor: Colors.light.secondary }]}>
                  <ThemedText style={styles.countText}>{unmemorizedCount}</ThemedText>
                </View>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.secondary}20` }]}
                  hitSlop={8}
                >
                  <Feather name="flag" size={16} color={Colors.light.secondary} />
                </Pressable>
                <Pressable
                  onPress={handleClearMark}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                  hitSlop={8}
                >
                  <Feather name="check" size={16} color={Colors.light.success} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="flag" size={16} color={theme.textSecondary} />
                </Pressable>
                {!isMemorized ? (
                  <Pressable
                    onPress={handleMarkMemorized}
                    style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                    hitSlop={8}
                  >
                    <Feather name="check" size={16} color={Colors.light.success} />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>

        {revealed ? (
          <View style={styles.revealedContent}>
            <ThemedText style={styles.word}>{word.word}</ThemedText>
            <ThemedText style={[styles.exampleSentence, { color: theme.textSecondary }]}>
              {word.exampleSentence}
            </ThemedText>
          </View>
        ) : (
          <Pressable onPress={handleReveal} style={styles.hiddenContent}>
            <ThemedText style={[styles.tapToReveal, { color: theme.textSecondary }]}>
              タップして表示
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function AudioLearningScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

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

  const stats = useMemo(() => {
    const memorized = words.filter((w) => w.isMemorized && (w.unmemorizedCount || 0) === 0).length;
    const unmemorized = words.filter((w) => (w.unmemorizedCount || 0) > 0).length;
    return { total: words.length, memorized, unmemorized };
  }, [words]);

  const handleMarkUnmemorized = async (wordId: string) => {
    const updatedWord = await markAsUnmemorized(wordId);
    if (updatedWord) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleClearMark = async (wordId: string) => {
    const updatedWord = await clearUnmemorizedMark(wordId);
    if (updatedWord) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleMarkMemorized = async (wordId: string) => {
    const updatedWord = await markAsMemorized(wordId);
    if (updatedWord) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  const renderWordItem = ({ item, index }: { item: Word; index: number }) => {
    const originalIndex = filter === "all" ? index + 1 : words.indexOf(item) + 1;

    return (
      <AudioWordCard
        word={item}
        index={originalIndex}
        onMarkUnmemorized={() => handleMarkUnmemorized(item.id)}
        onClearMark={() => handleClearMark(item.id)}
        onMarkMemorized={() => handleMarkMemorized(item.id)}
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
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => handleFilterChange("all")}
            style={[
              styles.filterButton,
              filter === "all" && { backgroundColor: theme.primary },
              filter !== "all" && { backgroundColor: theme.backgroundSecondary },
            ]}
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
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cardContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  indexContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  speakContainer: {
    flex: 1,
  },
  revealButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  markActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  markButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  hiddenContent: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.md,
  },
  tapToReveal: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  revealedContent: {
    marginTop: Spacing.md,
    paddingLeft: 40,
  },
  word: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  exampleSentence: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
});
