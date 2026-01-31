import React, { useEffect, useState, useCallback } from "react";
import { SectionList, View, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { VideoThumbnail } from "@/components/VideoThumbnail";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Word, Video } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { getVideosForWord } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Section {
  word: Word;
  data: Video[];
}

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await initializeData();
    const words = await getWords();
    const sectionData: Section[] = words.map((word) => ({
      word,
      data: getVideosForWord(word.id),
    }));
    setSections(sectionData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleVideoPress = (video: Video, word: Word) => {
    navigation.navigate("WordDetail", { wordId: word.id });
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: theme.backgroundRoot },
      ]}
    >
      <ThemedText style={styles.sectionTitle}>{section.word.word}</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        {section.word.translation}
      </ThemedText>
    </View>
  );

  const renderItem = ({ item, section }: { item: Video; section: Section }) => (
    <View style={styles.videoRow}>
      <VideoThumbnail
        video={item}
        onPress={() => handleVideoPress(item, section.word)}
        size="large"
      />
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonLoader count={4} />;
    }

    return (
      <EmptyState
        type="videos"
        title="動画がありません"
        message="まだ動画が追加されていません。単語を追加すると関連動画が表示されます。"
      />
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
          },
        ]}
      >
        <SkeletonLoader count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <SectionList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          sections.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
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
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingHorizontal: Spacing.lg,
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
  sectionHeader: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginTop: Spacing.xs,
  },
  videoRow: {
    marginBottom: Spacing.sm,
  },
});
