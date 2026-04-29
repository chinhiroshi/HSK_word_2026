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

interface GroupInfo {
  startIndex: number;
  endIndex: number;
  memorizedCount: number;
  notMemorizedCount: number;
  totalCount: number;
}

interface GroupCardProps {
  group: GroupInfo;
  groupIndex: number;
  locked: boolean;
  onPress: () => void;
}

function GroupCard({ group, groupIndex, locked, onPress }: GroupCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  
  const progress = group.totalCount > 0 
    ? Math.round((group.memorizedCount / group.totalCount) * 100) 
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.groupCard,
        { 
          backgroundColor: theme.backgroundDefault, 
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.groupHeader}>
        <View style={[styles.groupIconContainer, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name="headphones" size={20} color={theme.primary} />
        </View>
        <View style={styles.groupInfo}>
          <ThemedText style={styles.groupTitle}>
            {group.startIndex} - {group.endIndex}
          </ThemedText>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { backgroundColor: theme.backgroundSecondary }
              ]}
            >
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: Colors.light.success,
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
              {progress}%
            </ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {locked ? (
            <Feather name="lock" size={14} color={theme.textSecondary} />
          ) : null}
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Feather name="check-circle" size={14} color={Colors.light.success} />
          <ThemedText style={[styles.statText, { color: Colors.light.success }]}>
            {group.memorizedCount}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <Feather name="flag" size={14} color={Colors.light.alert} />
          <ThemedText style={[styles.statText, { color: Colors.light.alert }]}>
            {group.notMemorizedCount}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function AudioLearningScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isGroupLocked, isFreeLevel } = useSubscription();
  const { t } = useI18n();

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

  const groups = useMemo(() => {
    const result: GroupInfo[] = [];
    const totalWords = words.length;
    
    for (let i = 0; i < totalWords; i += GROUP_SIZE) {
      const startIndex = i + 1;
      const endIndex = Math.min(i + GROUP_SIZE, totalWords);
      const groupWords = words.slice(i, endIndex);
      
      const memorizedCount = groupWords.filter(
        (w) => w.audioMemorized && (w.audioUnmemorizedCount || 0) === 0
      ).length;
      const notMemorizedCount = groupWords.filter(
        (w) => !w.audioMemorized && (w.audioUnmemorizedCount || 0) > 0
      ).length;
      
      result.push({
        startIndex,
        endIndex,
        memorizedCount,
        notMemorizedCount,
        totalCount: groupWords.length,
      });
    }
    
    return result;
  }, [words]);

  const totalStats = useMemo(() => {
    const memorized = words.filter(
      (w) => w.audioMemorized && (w.audioUnmemorizedCount || 0) === 0
    ).length;
    const unmemorized = words.filter(
      (w) => !w.audioMemorized && (w.audioUnmemorizedCount || 0) > 0
    ).length;
    return { total: words.length, memorized, unmemorized };
  }, [words]);

  const currentHskLevel = words.length > 0 ? words[0].hskLevel : undefined;

  const handleGroupPress = (group: GroupInfo, groupIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AudioWordList", {
      startIndex: group.startIndex,
      endIndex: group.endIndex,
    });
  };

  const handleNotMemorizedPress = () => {
    if (totalStats.unmemorized > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("UnmemorizedList", { type: "audio", filter: "notMemorized" });
    }
  };

  const renderGroupItem = ({ item, index }: { item: GroupInfo; index: number }) => (
    <GroupCard 
      group={item} 
      groupIndex={index}
      locked={isGroupLocked(index, currentHskLevel)}
      onPress={() => handleGroupPress(item, index)} 
    />
  );

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
            marginTop: safeHeaderPadding + Spacing.lg,
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
            onPress={handleNotMemorizedPress}
            testID="not-memorized-button-audio"
          >
            <ThemedText style={[styles.summaryValue, { color: Colors.light.alert }]}>
              {totalStats.unmemorized}
            </ThemedText>
            <View style={styles.summaryLabelRow}>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {t("filter_unmemorized")}
              </ThemedText>
              {totalStats.unmemorized > 0 ? (
                <Feather name="chevron-right" size={14} color={Colors.light.alert} />
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
          groups.length === 0 && !loading && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={loading ? [] : groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => `${item.startIndex}-${item.endIndex}`}
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
  emptyContainer: {
    flexGrow: 1,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    minWidth: 36,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    paddingLeft: 52,
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
  lockedText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
});
