import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet, RefreshControl, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { SpeakButton } from "@/components/SpeakButton";
import { InlinePronunciationEvaluator } from "@/components/InlinePronunciationEvaluator";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, markAsUnmemorized, clearUnmemorizedMark, markAsMemorized } from "@/lib/storage";
import { getPinyin } from "@/lib/pinyin";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useI18n } from "@/contexts/LanguageContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AudioWordListRouteProp = RouteProp<RootStackParamList, "AudioWordList">;

type FilterType = "all" | "memorized" | "unmemorized" | "struggled";

interface AudioWordCardProps {
  word: Word;
  index: number;
  isRevealed: boolean;
  isLocked: boolean;
  onToggleReveal: () => void;
  onMarkUnmemorized: () => void;
  onClearMark: () => void;
  onMarkMemorized: () => void;
  onNavigateToDetail: () => void;
  onPremiumPress: () => void;
}

function AudioWordCard({ 
  word, 
  index, 
  isRevealed,
  isLocked,
  onToggleReveal,
  onMarkUnmemorized, 
  onClearMark, 
  onMarkMemorized,
  onNavigateToDetail,
  onPremiumPress,
}: AudioWordCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const unmemorizedCount = word.audioUnmemorizedCount || 0;
  const isCurrentlyMemorized = word.audioMemorized;
  const isCurrentlyStruggling = !isCurrentlyMemorized && unmemorizedCount > 0;
  const hadDifficulty = unmemorizedCount > 0;

  const borderLeftColor = isCurrentlyStruggling
    ? Colors.light.secondary
    : isCurrentlyMemorized
    ? Colors.light.success
    : "transparent";

  const speakText = isLocked ? word.word : `${word.word}。${word.exampleSentence}`;

  const handleMarkUnmemorized = () => {
    if (isLocked) { onPremiumPress(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkUnmemorized();
  };

  const handleClearMark = () => {
    if (isLocked) { onPremiumPress(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearMark();
  };

  const handleMarkMemorized = () => {
    if (isLocked) { onPremiumPress(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkMemorized();
  };

  const handleToggleReveal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleReveal();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderLeftColor: borderLeftColor,
          borderLeftWidth: isCurrentlyStruggling || isCurrentlyMemorized ? 3 : 1,
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
            <SpeakButton text={speakText} size="medium" wordId={word.id} />
            <InlinePronunciationEvaluator
              referenceText={word.exampleSentence || word.word}
              wordId={word.id}
              showReferenceWhenActive
            />
          </View>

          <Pressable
            onPress={handleToggleReveal}
            style={[
              styles.revealButton, 
              { backgroundColor: isRevealed ? `${theme.primary}20` : theme.backgroundSecondary }
            ]}
            hitSlop={8}
          >
            <Feather 
              name={isRevealed ? "eye" : "eye-off"} 
              size={16} 
              color={isRevealed ? theme.primary : theme.textSecondary} 
            />
          </Pressable>

          <View style={styles.markActions}>
            {isLocked ? (
              <>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="flag" size={16} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={handleMarkMemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="check" size={16} color={theme.textSecondary} />
                </Pressable>
              </>
            ) : isCurrentlyStruggling ? (
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
                  onPress={handleMarkMemorized}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                  hitSlop={8}
                >
                  <Feather name="check" size={16} color={Colors.light.success} />
                </Pressable>
              </>
            ) : isCurrentlyMemorized && hadDifficulty ? (
              <>
                <View style={[styles.historyBadge, { backgroundColor: `${Colors.light.alert}15`, borderColor: `${Colors.light.alert}50` }]}>
                  <Feather name="flag" size={10} color={Colors.light.alert} />
                  <ThemedText style={[styles.historyBadgeText, { color: Colors.light.alert }]}>
                    {`×${unmemorizedCount}`}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="flag" size={16} color={theme.textSecondary} />
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
                {!isCurrentlyMemorized ? (
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
            <Pressable onPress={onNavigateToDetail} hitSlop={8}>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        {isRevealed ? (
          isLocked ? (
            <Pressable
              onPress={onPremiumPress}
              style={[styles.lockedRevealBlock, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}
            >
              <Feather name="lock" size={16} color={theme.primary} />
              <ThemedText style={[styles.lockedRevealText, { color: theme.primary }]}>
                {t("premium_unlock")}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.revealedContent}>
              <ThemedText style={styles.word}>{word.word}</ThemedText>
              <ThemedText style={[styles.revealedPinyin, { color: theme.primary }]}>
                {word.pinyin || getPinyin(word.word)}
              </ThemedText>
              <ThemedText style={[styles.exampleSentence, { color: theme.textSecondary }]}>
                {word.exampleSentence}
              </ThemedText>
            </View>
          )
        ) : null}
      </View>
    </View>
  );
}

export default function AudioWordListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AudioWordListRouteProp>();
  const { isWordIndexLocked } = useSubscription();

  const { startIndex, endIndex } = route.params;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

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
      headerRight: () => (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRevealAll(prev => !prev);
          }}
          style={[
            styles.eyeButton,
            { backgroundColor: revealAll ? `${theme.primary}20` : theme.backgroundSecondary },
          ]}
        >
          <Feather 
            name={revealAll ? "eye" : "eye-off"} 
            size={20} 
            color={revealAll ? theme.primary : theme.textSecondary} 
          />
        </Pressable>
      ),
    });
  }, [navigation, startIndex, endIndex, revealAll, theme]);

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
        return groupWords.filter((w) => w.audioMemorized);
      case "unmemorized":
        return groupWords.filter((w) => !w.audioMemorized && (w.audioUnmemorizedCount || 0) > 0);
      case "struggled":
        return groupWords.filter((w) => (w.audioUnmemorizedCount || 0) > 0);
      default:
        return groupWords;
    }
  }, [groupWords, filter]);

  const stats = useMemo(() => {
    const memorized = groupWords.filter((w) => w.audioMemorized).length;
    const unmemorized = groupWords.filter((w) => !w.audioMemorized && (w.audioUnmemorizedCount || 0) > 0).length;
    const struggled = groupWords.filter((w) => (w.audioUnmemorizedCount || 0) > 0).length;
    return { total: groupWords.length, memorized, unmemorized, struggled };
  }, [groupWords]);

  const handleMarkUnmemorized = async (wordId: string) => {
    const updatedWord = await markAsUnmemorized(wordId, "audio");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleClearMark = async (wordId: string) => {
    const updatedWord = await clearUnmemorizedMark(wordId, "audio");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleMarkMemorized = async (wordId: string) => {
    const updatedWord = await markAsMemorized(wordId, "audio");
    if (updatedWord) {
      setAllWords((prev) => prev.map((w) => (w.id === wordId ? updatedWord : w)));
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  const handleNavigateToDetail = (wordId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("WordDetail", { wordId });
  };

  const handleToggleReveal = (wordId: string) => {
    setRevealedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const renderWordItem = ({ item, index }: { item: Word; index: number }) => {
    const originalIndex = filter === "all" 
      ? startIndex + index
      : allWords.indexOf(item) + 1;

    const wordZeroIndex = allWords.indexOf(item);
    const locked = wordZeroIndex >= 0 ? isWordIndexLocked(wordZeroIndex, item.hskLevel) : false;

    const isRevealed = revealAll || revealedIds.has(item.id);

    return (
      <AudioWordCard
        word={item}
        index={originalIndex}
        isRevealed={isRevealed}
        isLocked={locked}
        onToggleReveal={() => handleToggleReveal(item.id)}
        onMarkUnmemorized={() => handleMarkUnmemorized(item.id)}
        onClearMark={() => handleClearMark(item.id)}
        onMarkMemorized={() => handleMarkMemorized(item.id)}
        onNavigateToDetail={() => handleNavigateToDetail(item.id)}
        onPremiumPress={() => navigation.navigate("Paywall")}
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
              未暗記 ({stats.unmemorized})
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleFilterChange("struggled")}
            style={[
              styles.filterButton,
              filter === "struggled" && { backgroundColor: Colors.light.alert },
              filter !== "struggled" && { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.filterButtonInner}>
              <Feather name="flag" size={14} color={filter === "struggled" ? "#FFFFFF" : Colors.light.alert} />
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
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
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
    flexDirection: "column",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  revealButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
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
  filterButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  revealedContent: {
    marginTop: Spacing.md,
    paddingLeft: 40,
  },
  word: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: 2,
  },
  revealedPinyin: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xs,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  exampleSentence: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  lockedRevealBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: 40,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  lockedRevealText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
