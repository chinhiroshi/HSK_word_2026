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
  onPress: () => void;
  onToggleMemorized: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WordCard({ word, onPress, onToggleMemorized }: WordCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handleToggle = () => {
    checkScale.value = withSpring(1.3, springConfig, () => {
      checkScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleMemorized();
  };

  const borderLeftColor = word.isMemorized
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
          borderLeftWidth: word.isMemorized ? 4 : 1,
        },
        animatedStyle,
      ]}
      testID={`word-card-${word.id}`}
    >
      <Pressable
        onPress={handleToggle}
        style={styles.checkContainer}
        hitSlop={12}
        testID={`toggle-memorized-${word.id}`}
      >
        <Animated.View style={checkAnimatedStyle}>
          <Feather
            name={word.isMemorized ? "check-circle" : "circle"}
            size={24}
            color={word.isMemorized ? Colors.light.success : theme.textSecondary}
          />
        </Animated.View>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.wordRow}>
          <ThemedText style={styles.word}>{word.word}</ThemedText>
          <SpeakButton text={word.word} size="small" />
        </View>
        <ThemedText style={[styles.pinyin, { color: theme.primary }]}>
          {word.pinyin}
        </ThemedText>
        <ThemedText style={[styles.translation, { color: theme.textSecondary }]}>
          {word.translation}
        </ThemedText>
      </View>

      <View style={styles.rightSection}>
        <View
          style={[styles.videoBadge, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="play-circle" size={14} color={theme.primary} />
          <ThemedText style={[styles.videoCount, { color: theme.primary }]}>
            {word.videoIds.length}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  checkContainer: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  word: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  pinyin: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xs,
  },
  translation: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  videoCount: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
