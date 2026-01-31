import React, { useEffect, useState, useCallback } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { WordCard } from "@/components/WordCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, toggleMemorized, initializeData } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnlyUnmemorized, setShowOnlyUnmemorized] = useState(false);

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

  const handleToggleMemorized = async (wordId: string) => {
    const updatedWord = await toggleMemorized(wordId);
    if (updatedWord) {
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? updatedWord : w))
      );
    }
  };

  const handleWordPress = (word: Word) => {
    navigation.navigate("WordDetail", { wordId: word.id });
  };

  const handleTogglePracticeMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowOnlyUnmemorized((prev) => !prev);
  };

  const filteredWords = showOnlyUnmemorized
    ? words.filter((w) => !w.isMemorized)
    : words;

  const allMemorized = words.length > 0 && words.every((w) => w.isMemorized);

  const renderItem = ({ item }: { item: Word }) => (
    <WordCard
      word={item}
      onPress={() => handleWordPress(item)}
      onToggleMemorized={() => handleToggleMemorized(item.id)}
    />
  );

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={6} />;
    }

    if (allMemorized && !showOnlyUnmemorized) {
      return (
        <EmptyState
          type="study"
          title="おめでとうございます！"
          message="すべての単語を覚えました。引き続き復習して記憶を定着させましょう。"
        />
      );
    }

    if (showOnlyUnmemorized && filteredWords.length === 0) {
      return (
        <EmptyState
          type="study"
          title="素晴らしい進捗です！"
          message="覚えていない単語はありません。全体モードに切り替えて復習しましょう。"
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 70,
          },
          filteredWords.length === 0 && loading === false && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : filteredWords}
        renderItem={renderItem}
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
      <FloatingActionButton
        icon={showOnlyUnmemorized ? "list" : "target"}
        onPress={handleTogglePracticeMode}
        bottom={tabBarHeight + Spacing.xl}
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
});
