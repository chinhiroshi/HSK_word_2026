import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { Button } from "@/components/Button";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, Video } from "@/types";
import { getWord, toggleMemorized } from "@/lib/storage";
import { getVideosForWord } from "@/data/mockData";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "WordDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
};

export default function WordDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { wordId } = route.params;

  const [word, setWord] = useState<Word | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const checkScale = useSharedValue(1);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const loadData = useCallback(async () => {
    const wordData = await getWord(wordId);
    if (wordData) {
      setWord(wordData);
      setVideos(getVideosForWord(wordId));
    }
    setLoading(false);
  }, [wordId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (word) {
      navigation.setOptions({
        headerTitle: word.word,
      });
    }
  }, [word, navigation]);

  const handleToggleMemorized = async () => {
    if (!word) return;

    checkScale.value = withSpring(1.3, springConfig, () => {
      checkScale.value = withSpring(1, springConfig);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const updatedWord = await toggleMemorized(word.id);
    if (updatedWord) {
      setWord(updatedWord);
    }
  };

  const handleVideoPress = (video: Video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <SkeletonLoader count={3} />
      </View>
    );
  }

  if (!word) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText>単語が見つかりませんでした</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.wordCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.word}>{word.word}</ThemedText>
          <ThemedText style={[styles.translation, { color: theme.textSecondary }]}>
            {word.translation}
          </ThemedText>
          {word.pronunciation ? (
            <ThemedText style={[styles.pronunciation, { color: theme.primary }]}>
              {word.pronunciation}
            </ThemedText>
          ) : null}

          <View
            style={[styles.statusBadge, {
              backgroundColor: word.isMemorized
                ? `${Colors.light.success}20`
                : `${Colors.light.alert}20`,
            }]}
          >
            <Feather
              name={word.isMemorized ? "check-circle" : "clock"}
              size={16}
              color={word.isMemorized ? Colors.light.success : Colors.light.alert}
            />
            <ThemedText
              style={[
                styles.statusText,
                { color: word.isMemorized ? Colors.light.success : Colors.light.alert },
              ]}
            >
              {word.isMemorized ? "暗記済み" : "未暗記"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>関連動画</ThemedText>
          <View style={styles.videosGrid}>
            {videos.map((video) => (
              <View key={video.id} style={styles.videoItem}>
                <VideoThumbnail
                  video={video}
                  onPress={() => handleVideoPress(video)}
                  size="large"
                />
              </View>
            ))}
          </View>
          {videos.length === 0 ? (
            <ThemedText style={[styles.noVideos, { color: theme.textSecondary }]}>
              この単語に関連する動画はまだありません
            </ThemedText>
          ) : null}
        </View>

        <Pressable
          onPress={handleToggleMemorized}
          style={[
            styles.toggleButton,
            {
              backgroundColor: word.isMemorized
                ? Colors.light.alert
                : Colors.light.success,
            },
          ]}
          testID="toggle-memorized-button"
        >
          <Animated.View style={[styles.toggleContent, checkAnimatedStyle]}>
            <Feather
              name={word.isMemorized ? "x-circle" : "check-circle"}
              size={24}
              color="#FFFFFF"
            />
            <ThemedText style={styles.toggleText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {word.isMemorized ? "未暗記に戻す" : "暗記済みにする"}
            </ThemedText>
          </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  wordCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  word: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
  },
  translation: {
    fontSize: 20,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xs,
  },
  pronunciation: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.md,
  },
  videosGrid: {
    gap: Spacing.sm,
  },
  videoItem: {
    marginBottom: Spacing.xs,
  },
  noVideos: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  toggleButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
