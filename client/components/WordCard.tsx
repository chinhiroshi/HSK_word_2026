import React, { useState } from "react";
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
  compact?: boolean;
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

export function WordCard({ word, index, compact = false, onPress, onToggleMemorized }: WordCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(1);
  const [showMeaning, setShowMeaning] = useState(false);

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

  const handlePeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMeaning(!showMeaning);
  };

  const borderLeftColor = word.isMemorized
    ? Colors.light.success
    : "transparent";

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            borderLeftColor: borderLeftColor,
            borderLeftWidth: word.isMemorized ? 3 : 1,
          },
          animatedStyle,
        ]}
        testID={`word-card-${word.id}`}
      >
        {index !== undefined ? (
          <View style={[styles.compactIndexContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.compactIndexText, { color: theme.textSecondary }]}>
              {index}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={handleToggle}
          style={styles.compactCheckContainer}
          hitSlop={8}
          testID={`toggle-memorized-${word.id}`}
        >
          <Animated.View style={checkAnimatedStyle}>
            <Feather
              name={word.isMemorized ? "check-circle" : "circle"}
              size={20}
              color={word.isMemorized ? Colors.light.success : theme.textSecondary}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.compactContent}>
          <ThemedText style={styles.compactWord}>{word.word}</ThemedText>
        </View>

        <View style={styles.rightActions}>
          <SpeakButton text={word.word} size="small" />
          <Pressable
            onPress={handlePeek}
            style={[
              styles.peekButton,
              {
                backgroundColor: showMeaning ? theme.primary : theme.backgroundSecondary,
              },
            ]}
            hitSlop={8}
            testID={`peek-meaning-${word.id}`}
          >
            <Feather
              name={showMeaning ? "eye" : "eye-off"}
              size={16}
              color={showMeaning ? "#FFFFFF" : theme.textSecondary}
            />
          </Pressable>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>

        {showMeaning ? (
          <View style={[styles.meaningOverlay, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.meaningText, { color: theme.primary }]}>
              {word.translation}
            </ThemedText>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  }

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
      {index !== undefined ? (
        <View style={[styles.indexContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.indexText, { color: theme.textSecondary }]}>
            {index}
          </ThemedText>
        </View>
      ) : null}

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

      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
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
  indexContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  indexText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
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
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    position: "relative",
  },
  compactIndexContainer: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  compactIndexText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  compactCheckContainer: {
    marginRight: Spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactWord: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  peekButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  meaningOverlay: {
    position: "absolute",
    right: 50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  meaningText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
