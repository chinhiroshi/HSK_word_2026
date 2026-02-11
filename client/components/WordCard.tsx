import React from "react";
import { StyleSheet, View, Pressable, GestureResponderEvent } from "react-native";
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
import { getPinyin } from "@/lib/pinyin";

interface WordCardProps {
  word: Word;
  index?: number;
  onPress: () => void;
  onMarkUnmemorized: () => void;
  onClearMark: () => void;
  onMarkMemorized?: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

export function WordCard({ 
  word, 
  index, 
  onPress, 
  onMarkUnmemorized, 
  onClearMark,
  onMarkMemorized,
}: WordCardProps) {
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

  const handleMarkUnmemorized = (e: GestureResponderEvent) => {
    e.stopPropagation();
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkUnmemorized();
  };

  const handleClearMark = (e: GestureResponderEvent) => {
    e.stopPropagation();
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearMark();
  };

  const handleMarkMemorized = (e: GestureResponderEvent) => {
    e.stopPropagation();
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkMemorized?.();
  };

  const unmemorizedCount = word.textUnmemorizedCount || 0;
  const isMarked = unmemorizedCount > 0;
  const isMemorized = word.textMemorized && !isMarked;

  const borderLeftColor = isMarked
    ? Colors.light.secondary
    : isMemorized
    ? Colors.light.success
    : "transparent";

  const speakText = `${word.word}。${word.exampleSentence}`;
  const wordPinyin = word.pinyin || getPinyin(word.word);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderLeftColor: borderLeftColor,
          borderLeftWidth: isMarked || isMemorized ? 3 : 1,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardContent}
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
            <View style={styles.wordWithPinyin}>
              <ThemedText style={styles.word}>{word.word}</ThemedText>
              {wordPinyin ? (
                <ThemedText style={[styles.pinyinText, { color: theme.textSecondary }]}>
                  {wordPinyin}
                </ThemedText>
              ) : null}
            </View>
            <SpeakButton text={speakText} size="small" />
          </View>

          <View style={styles.markActions}>
            {isMarked ? (
              <>
                <View style={[styles.countBadge, { backgroundColor: Colors.light.secondary }]}>
                  <ThemedText style={styles.countText}>{unmemorizedCount}</ThemedText>
                </View>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.secondary}20` }]}
                  hitSlop={8}
                  testID={`mark-unmemorized-${word.id}`}
                >
                  <Animated.View style={markAnimatedStyle}>
                    <Feather name="flag" size={16} color={Colors.light.secondary} />
                  </Animated.View>
                </Pressable>
                <Pressable
                  onPress={handleClearMark}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                  hitSlop={8}
                  testID={`clear-mark-${word.id}`}
                >
                  <Feather name="check" size={16} color={Colors.light.success} />
                </Pressable>
              </>
            ) : (
              <>
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
                {!isMemorized && onMarkMemorized ? (
                  <Pressable
                    onPress={handleMarkMemorized}
                    style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                    hitSlop={8}
                    testID={`mark-memorized-${word.id}`}
                  >
                    <Feather name="check" size={16} color={Colors.light.success} />
                  </Pressable>
                ) : null}
              </>
            )}
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </View>
        </View>

        <View style={styles.exampleRow}>
          <ThemedText style={[styles.exampleSentence, { color: theme.text }]} numberOfLines={1}>
            {word.exampleSentence}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cardContent: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
  wordWithPinyin: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  word: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  pinyinText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
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
  exampleRow: {
    paddingLeft: 40,
  },
  exampleSentence: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
});
