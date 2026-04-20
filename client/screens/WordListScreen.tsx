import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { WordCard } from "@/components/WordCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, markAsUnmemorized, clearUnmemorizedMark, markAsMemorized } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WordListRouteProp = RouteProp<RootStackParamList, "WordList">;

type FilterType = "all" | "memorized" | "unmemorized" | "struggled";

// Part-of-speech display order (JA labels → EN labels)
const POS_ORDER_JA = [
  "名詞", "動詞", "形容詞", "副詞", "量詞", "代名詞",
  "数詞", "接続詞", "前置詞", "助詞", "感嘆詞", "固有名詞",
];
const POS_ORDER_EN = [
  "noun", "verb", "adjective", "adverb", "measure word", "pronoun",
  "numeral", "conjunction", "preposition", "particle", "interjection", "proper noun",
];
const POS_OTHER_JA = "その他";
const POS_OTHER_EN = "other";

function posOrder(pos: string, lang: string): number {
  const list = lang === "ja" ? POS_ORDER_JA : POS_ORDER_EN;
  const idx = list.findIndex((p) => pos.toLowerCase().includes(p.toLowerCase()));
  return idx === -1 ? 999 : idx;
}

type ListItem =
  | { type: "word"; word: Word; originalIndex: number }
  | { type: "header"; pos: string; count: number };

export default function WordListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const { lang } = useI18n();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WordListRouteProp>();

  const { startIndex, endIndex } = route.params;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showLongExample, setShowLongExample] = useState(false);
  const [groupByPos, setGroupByPos] = useState(false);

  const loadWords = useCallback(async () => {
    const data = await getWords();
    setAllWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: `${startIndex}-${endIndex}`,
    });
  }, [navigation, startIndex, endIndex]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  };

  const groupWords = useMemo(() => {
    return allWords.slice(startIndex - 1, endIndex);
  }, [allWords, startIndex, endIndex]);

  const filteredWords = useMemo(() => {
    switch (filter) {
      case "memorized":
        return groupWords.filter((w) => w.textMemorized);
      case "unmemorized":
        return groupWords.filter((w) => !w.textMemorized && (w.textUnmemorizedCount || 0) > 0);
      case "struggled":
        return groupWords.filter((w) => (w.textUnmemorizedCount || 0) > 0);
      default:
        return groupWords;
    }
  }, [groupWords, filter]);

  const stats = useMemo(() => {
    const memorized = groupWords.filter((w) => w.textMemorized).length;
    const unmemorized = groupWords.filter((w) => !w.textMemorized && (w.textUnmemorizedCount || 0) > 0).length;
    const struggled = groupWords.filter((w) => (w.textUnmemorizedCount || 0) > 0).length;
    return { total: groupWords.length, memorized, unmemorized, struggled };
  }, [groupWords]);

  // Build flat list data — either plain words or words with POS section headers
  const listData = useMemo((): ListItem[] => {
    if (!groupByPos) {
      return filteredWords.map((word) => ({
        type: "word",
        word,
        originalIndex: groupWords.indexOf(word) + startIndex,
      }));
    }

    // Group by posJa (or posEn on EN mode)
    const otherLabel = lang === "ja" ? POS_OTHER_JA : POS_OTHER_EN;
    const map = new Map<string, Word[]>();
    for (const word of filteredWords) {
      const pos = (lang === "ja" ? word.posJa : word.posEn) || otherLabel;
      if (!map.has(pos)) map.set(pos, []);
      map.get(pos)!.push(word);
    }

    // Sort groups by canonical order
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      const oa = posOrder(a, lang);
      const ob = posOrder(b, lang);
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });

    const items: ListItem[] = [];
    for (const [pos, words] of sorted) {
      items.push({ type: "header", pos, count: words.length });
      for (const word of words) {
        items.push({
          type: "word",
          word,
          originalIndex: groupWords.indexOf(word) + startIndex,
        });
      }
    }
    return items;
  }, [filteredWords, groupByPos, groupWords, startIndex, lang]);

  const handleMarkUnmemorized = async (wordId: string) => {
    const updatedWord = await markAsUnmemorized(wordId, "text");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleClearMark = async (wordId: string) => {
    const updatedWord = await clearUnmemorizedMark(wordId, "text");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleMarkMemorized = async (wordId: string) => {
    const updatedWord = await markAsMemorized(wordId, "text");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleWordPress = (word: Word) => {
    navigation.navigate("WordDetail", { wordId: word.id });
  };

  const handleFilterChange = (newFilter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View style={[styles.posHeader, { borderLeftColor: theme.primary }]}>
          <ThemedText style={[styles.posHeaderText, { color: theme.primary }]}>
            {item.pos}
          </ThemedText>
          <View style={[styles.posHeaderBadge, { backgroundColor: `${theme.primary}18` }]}>
            <ThemedText style={[styles.posHeaderCount, { color: theme.primary }]}>
              {item.count}
            </ThemedText>
          </View>
        </View>
      );
    }

    return (
      <WordCard
        word={item.word}
        index={item.originalIndex}
        showLongExample={showLongExample}
        onPress={() => handleWordPress(item.word)}
        onMarkUnmemorized={() => handleMarkUnmemorized(item.word.id)}
        onClearMark={() => handleClearMark(item.word.id)}
        onMarkMemorized={() => handleMarkMemorized(item.word.id)}
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
    if (filter === "struggled") {
      return (
        <View style={styles.emptyFilterState}>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            苦手歴のある単語がありません
          </ThemedText>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: safeHeaderPadding + Spacing.sm }]}>
        {/* 絞り込みフィルター */}
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

          <Pressable
            onPress={() => handleFilterChange("struggled")}
            style={[
              styles.filterButton,
              filter === "struggled" && { backgroundColor: Colors.light.alert },
              filter !== "struggled" && { backgroundColor: theme.backgroundSecondary },
            ]}
            testID="filter-struggled"
          >
            <View style={styles.toggleContent}>
              <Feather name="flag" size={13} color={filter === "struggled" ? "#FFFFFF" : Colors.light.alert} />
              <ThemedText
                style={[
                  styles.filterButtonText,
                  { color: filter === "struggled" ? "#FFFFFF" : Colors.light.alert },
                ]}
              >
                苦手歴 ({stats.struggled})
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* 表示設定（小さめ） */}
        <View style={styles.displayRow}>
          <ThemedText style={[styles.displayLabel, { color: theme.textSecondary }]}>
            表示
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowLongExample(prev => !prev);
            }}
            style={[
              styles.displayButton,
              { backgroundColor: showLongExample ? `${theme.primary}20` : theme.backgroundSecondary,
                borderColor: showLongExample ? theme.primary : "transparent",
              },
            ]}
            testID="toggle-long-example"
          >
            <Feather name="file-text" size={12} color={showLongExample ? theme.primary : theme.textSecondary} />
            <ThemedText style={[styles.displayButtonText, { color: showLongExample ? theme.primary : theme.textSecondary }]}>
              長文
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGroupByPos(prev => !prev);
            }}
            style={[
              styles.displayButton,
              { backgroundColor: groupByPos ? `${theme.primary}20` : theme.backgroundSecondary,
                borderColor: groupByPos ? theme.primary : "transparent",
              },
            ]}
            testID="toggle-group-pos"
          >
            <Feather name="tag" size={12} color={groupByPos ? theme.primary : theme.textSecondary} />
            <ThemedText style={[styles.displayButtonText, { color: groupByPos ? theme.primary : theme.textSecondary }]}>
              品詞グループ
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
          listData.length === 0 && !loading && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : listData}
        renderItem={renderItem}
        keyExtractor={(item) =>
          item.type === "header" ? `header-${item.pos}` : item.word.id
        }
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
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  displayLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    marginRight: 2,
  },
  displayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  displayButtonText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },
  posHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 3,
  },
  posHeaderText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  posHeaderBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  posHeaderCount: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
