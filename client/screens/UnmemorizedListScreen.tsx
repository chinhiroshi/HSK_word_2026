import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { WordCard } from "@/components/WordCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, markAsUnmemorized, clearUnmemorizedMark, markAsMemorized } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "UnmemorizedList">;

export default function UnmemorizedListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { type } = route.params;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      headerTitle: type === "text" ? "暗記必要な単語" : "暗記必要な単語（音声）",
    });
  }, [navigation, type]);

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

  const unmemorizedWords = useMemo(() => {
    if (type === "text") {
      return allWords.filter((w) => (w.textUnmemorizedCount || 0) > 0);
    }
    return allWords.filter((w) => (w.audioUnmemorizedCount || 0) > 0);
  }, [allWords, type]);

  const handleMarkUnmemorized = async (wordId: string) => {
    const updatedWord = await markAsUnmemorized(wordId, type);
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleClearMark = async (wordId: string) => {
    const updatedWord = await clearUnmemorizedMark(wordId, type);
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleMarkMemorized = async (wordId: string) => {
    const updatedWord = await markAsMemorized(wordId, type);
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleWordPress = (word: Word) => {
    navigation.navigate("WordDetail", { wordId: word.id });
  };

  const renderWordItem = ({ item }: { item: Word }) => {
    const originalIndex = allWords.indexOf(item) + 1;
    return (
      <WordCard
        word={item}
        index={originalIndex}
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
    return (
      <View style={styles.emptyState}>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          暗記必要な単語がありません
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          unmemorizedWords.length === 0 && !loading && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : unmemorizedWords}
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
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
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
