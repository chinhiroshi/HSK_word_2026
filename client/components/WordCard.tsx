import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { SpeakButton } from "@/components/SpeakButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";

interface WordCardProps {
  word: Word;
  index?: number;
  onPress: () => void;
  onMarkUnmemorized: () => void;
  onClearMark: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WordCard({ word, index, onPress, onMarkUnmemorized, onClearMark }: WordCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const markScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const markAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: markScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handleMarkUnmemorized = () => {
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkUnmemorized();
  };

  const handleClearMark = () => {
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearMark();
  };

  const unmemorizedCount = word.unmemorizedCount || 0;
  const isMarked = unmemorizedCount > 0;

  const borderLeftColor = isMarked
    ? Colors.light.secondary
    : word.isMemorized
    ? Colors.light.success
    : "transparent";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderLeftColor: borderLeftColor,
          borderLeftWidth: isMarked || word.isMemorized ? 3 : 1,
        },
        animatedStyle,
      ]}
      testID={`word-card-${word.id}`}
    >
      <View style={styles.topRow}>
        {index !== undefined ? (
          <View style={[styles.indexContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.indexText, { color: theme.textSecondary }]}>
              {index}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.wordContainer}>
          <ThemedText style={styles.word}>{word.word}</ThemedText>
          <SpeakButton text={word.word} size="small" />
        </View>

        <View style={styles.markActions}>
          {isMarked ? (
            <Pressable
              onPress={handleClearMark}
              style={[styles.markBadge, { backgroundColor: Colors.light.secondary }]}
              hitSlop={8}
              testID={`clear-mark-${word.id}`}
            >
              <Animated.View style={markAnimatedStyle}>
                <View style={styles.markBadgeContent}>
                  <Feather name="x" size={12} color="#FFFFFF" />
                  <ThemedText style={styles.markCountText}>{unmemorizedCount}</ThemedText>
                </View>
              </Animated.View>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleMarkUnmemorized}
              style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
              hitSlop={8}
              testID={`mark-unmemorized-${word.id}`}
            >
              <Animated.View style={markAnimatedStyle}>
                <Feather name="flag" size={16} color={theme.textSecondary} />
              </Animated.View>
            </Pressable>
          )}
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      </View>

      <View style={styles.exampleRow}>
        <View style={styles.exampleContainer}>
          <ThemedText style={[styles.exampleSentence, { color: theme.text }]} numberOfLines={1}>
            {word.exampleSentence}
          </ThemedText>
        </View>
        <SpeakButton text={word.exampleSentence} size="small" />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  indexContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  indexText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  wordContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  word: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  markActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  markButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  markBadge: {
    minWidth: 40,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  markBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markCountText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 40,
  },
  exampleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  exampleSentence: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
});
