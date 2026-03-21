import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WordListRouteProp = RouteProp<RootStackParamList, "WordList">;

type FilterType = "all" | "memorized" | "unmemorized";

export default function WordListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WordListRouteProp>();

  const { startIndex, endIndex } = route.params;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showLongExample, setShowLongExample] = useState(false);

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
        // Words currently marked memorized (including those with past struggle history)
        return groupWords.filter((w) => w.textMemorized);
      case "unmemorized":
        // Words currently struggling: NOT memorized AND have been flagged at least once
        return groupWords.filter((w) => !w.textMemorized && (w.textUnmemorizedCount || 0) > 0);
      default:
        return groupWords;
    }
  }, [groupWords, filter]);

  const stats = useMemo(() => {
    const memorized = groupWords.filter((w) => w.textMemorized).length;
    const unmemorized = groupWords.filter((w) => !w.textMemorized && (w.textUnmemorizedCount || 0) > 0).length;
    return { total: groupWords.length, memorized, unmemorized };
  }, [groupWords]);

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

  const renderWordItem = ({ item, index }: { item: Word; index: number }) => {
    const originalIndex = filter === "all" 
      ? startIndex + index
      : allWords.indexOf(item) + 1;

    return (
      <WordCard
        word={item}
        index={originalIndex}
        showLongExample={showLongExample}
        onPress={() => handleWordPress(item)}
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
      <View style={[styles.header, { paddingTop: headerHeight + Spacing.sm }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowLongExample(prev => !prev);
            }}
            style={[
              styles.filterButton,
              { backgroundColor: showLongExample ? theme.primary : theme.backgroundSecondary },
            ]}
            testID="toggle-long-example"
          >
            <View style={styles.toggleContent}>
              <Feather name="file-text" size={14} color={showLongExample ? "#FFFFFF" : theme.textSecondary} />
              <ThemedText
                style={[
                  styles.filterButtonText,
                  { color: showLongExample ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                長文
              </ThemedText>
            </View>
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
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
});
