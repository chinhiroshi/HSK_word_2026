import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { WordCard } from "@/components/WordCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, toggleMemorized, initializeData } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GROUP_SIZE = 20;

interface WordGroup {
  id: string;
  groupNumber: number;
  startIndex: number;
  endIndex: number;
  words: Word[];
  memorizedCount: number;
  totalCount: number;
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  const wordGroups = useMemo((): WordGroup[] => {
    const groups: WordGroup[] = [];
    for (let i = 0; i < words.length; i += GROUP_SIZE) {
      const groupWords = words.slice(i, i + GROUP_SIZE);
      const memorizedCount = groupWords.filter((w) => w.isMemorized).length;
      const groupNumber = Math.floor(i / GROUP_SIZE) + 1;
      groups.push({
        id: `group-${groupNumber}`,
        groupNumber,
        startIndex: i + 1,
        endIndex: Math.min(i + GROUP_SIZE, words.length),
        words: groupWords,
        memorizedCount,
        totalCount: groupWords.length,
      });
    }
    return groups;
  }, [words]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return wordGroups.find((g) => g.id === selectedGroupId) || null;
  }, [wordGroups, selectedGroupId]);

  const handleGroupPress = (group: WordGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGroupId(group.id);
  };

  const handleBackToGroups = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGroupId(null);
  };

  const renderGroupItem = ({ item }: { item: WordGroup }) => {
    const progress = item.totalCount > 0 ? item.memorizedCount / item.totalCount : 0;
    const isComplete = item.memorizedCount === item.totalCount;

    return (
      <Pressable
        onPress={() => handleGroupPress(item)}
        style={[
          styles.groupCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isComplete ? Colors.light.success : theme.border,
            borderWidth: isComplete ? 2 : 1,
          },
        ]}
        testID={`group-card-${item.groupNumber}`}
      >
        <View style={styles.groupHeader}>
          <View style={[styles.groupBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.groupBadgeText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {item.groupNumber}
            </ThemedText>
          </View>
          <View style={styles.groupInfo}>
            <ThemedText style={styles.groupTitle}>
              単語 {item.startIndex} - {item.endIndex}
            </ThemedText>
            <ThemedText style={[styles.groupSubtitle, { color: theme.textSecondary }]}>
              {item.totalCount}語
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={24} color={theme.textSecondary} />
        </View>

        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isComplete ? Colors.light.success : theme.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Feather
                name="check-circle"
                size={14}
                color={Colors.light.success}
              />
              <ThemedText style={[styles.statText, { color: Colors.light.success }]}>
                {item.memorizedCount}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather
                name="clock"
                size={14}
                color={Colors.light.alert}
              />
              <ThemedText style={[styles.statText, { color: Colors.light.alert }]}>
                {item.totalCount - item.memorizedCount}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderWordItem = ({ item, index }: { item: Word; index: number }) => {
    const globalIndex = selectedGroup
      ? selectedGroup.startIndex + index
      : index + 1;

    return (
      <WordCard
        word={item}
        index={globalIndex}
        onPress={() => handleWordPress(item)}
        onToggleMemorized={() => handleToggleMemorized(item.id)}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={6} />;
    }
    return null;
  };

  if (selectedGroup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View
          style={[
            styles.groupDetailHeader,
            {
              paddingTop: headerHeight + Spacing.lg,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <Pressable
            onPress={handleBackToGroups}
            style={styles.backButton}
            testID="back-to-groups"
          >
            <Feather name="arrow-left" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>
              グループ一覧
            </ThemedText>
          </Pressable>
          <ThemedText style={styles.groupDetailTitle}>
            単語 {selectedGroup.startIndex} - {selectedGroup.endIndex}
          </ThemedText>
          <View style={styles.groupDetailStats}>
            <View style={[styles.detailStatBadge, { backgroundColor: `${Colors.light.success}20` }]}>
              <Feather name="check-circle" size={14} color={Colors.light.success} />
              <ThemedText style={[styles.detailStatText, { color: Colors.light.success }]}>
                暗記: {selectedGroup.memorizedCount}
              </ThemedText>
            </View>
            <View style={[styles.detailStatBadge, { backgroundColor: `${Colors.light.alert}20` }]}>
              <Feather name="clock" size={14} color={Colors.light.alert} />
              <ThemedText style={[styles.detailStatText, { color: Colors.light.alert }]}>
                未暗記: {selectedGroup.totalCount - selectedGroup.memorizedCount}
              </ThemedText>
            </View>
          </View>
        </View>
        <FlatList
          style={styles.list}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          data={selectedGroup.words}
          renderItem={renderWordItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          wordGroups.length === 0 && loading === false && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : wordGroups}
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
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  groupCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  groupBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  groupBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  groupSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  progressSection: {
    gap: Spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  progressStats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  groupDetailHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
  },
  groupDetailTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
  },
  groupDetailStats: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  detailStatBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  detailStatText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
