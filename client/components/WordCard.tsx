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
import { InlinePronunciationEvaluator } from "@/components/InlinePronunciationEvaluator";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getPinyin } from "@/lib/pinyin";
import { speakChinese } from "@/lib/speech";

interface WordCardProps {
  word: Word;
  index?: number;
  showLongExample?: boolean;
  isLocked?: boolean;
  onPress: () => void;
  onMarkUnmemorized: () => void;
  onClearMark: () => void;
  onMarkMemorized?: () => void;
  onPremiumPress?: () => void;
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
  showLongExample = true,
  isLocked = false,
  onPress, 
  onMarkUnmemorized, 
  onClearMark,
  onMarkMemorized,
  onPremiumPress,
}: WordCardProps) {
  const { theme } = useTheme();
  const { lang, t } = useI18n();
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
    if (isLocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPremiumPress?.();
      return;
    }
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkUnmemorized();
  };

  const handleClearMark = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (isLocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPremiumPress?.();
      return;
    }
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearMark();
  };

  const handleMarkMemorized = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (isLocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPremiumPress?.();
      return;
    }
    markScale.value = withSpring(1.3, springConfig, () => {
      markScale.value = withSpring(1, springConfig);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkMemorized?.();
  };

  const unmemorizedCount = word.textUnmemorizedCount || 0;
  const isCurrentlyMemorized = word.textMemorized;
  const isCurrentlyStruggling = !isCurrentlyMemorized && unmemorizedCount > 0;
  const hadDifficulty = unmemorizedCount > 0;

  const borderLeftColor = isCurrentlyStruggling
    ? Colors.light.secondary
    : isCurrentlyMemorized
    ? Colors.light.success
    : "transparent";

  const speakText = isLocked ? word.word : `${word.word}。${word.exampleSentence}`;
  const wordPinyin = word.pinyin || getPinyin(word.word);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderLeftColor: borderLeftColor,
          borderLeftWidth: isCurrentlyStruggling || isCurrentlyMemorized ? 3 : 1,
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
              {(lang === "ja" ? word.posJa : word.posEn) ? (
                <View style={[styles.posBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <ThemedText style={[styles.posText, { color: theme.primary }]}>
                    {lang === "ja" ? word.posJa : word.posEn}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <SpeakButton text={speakText} size="small" wordId={word.id} />
          </View>

          <View style={styles.markActions}>
            {isLocked ? (
              <>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                  testID={`mark-unmemorized-${word.id}`}
                >
                  <Feather name="flag" size={16} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={handleMarkMemorized}
                  style={[styles.markButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                  testID={`mark-memorized-${word.id}`}
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
                  testID={`mark-unmemorized-${word.id}`}
                >
                  <Animated.View style={markAnimatedStyle}>
                    <Feather name="flag" size={16} color={Colors.light.secondary} />
                  </Animated.View>
                </Pressable>
                <Pressable
                  onPress={handleMarkMemorized}
                  style={[styles.markButton, { backgroundColor: `${Colors.light.success}20` }]}
                  hitSlop={8}
                  testID={`mark-memorized-${word.id}`}
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
                  testID={`mark-unmemorized-${word.id}`}
                >
                  <Animated.View style={markAnimatedStyle}>
                    <Feather name="flag" size={16} color={theme.textSecondary} />
                  </Animated.View>
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
                {!isCurrentlyMemorized && onMarkMemorized ? (
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

        {isLocked ? (
          <View style={styles.exampleRow}>
            <ThemedText style={[styles.exampleSentence, { color: theme.text }]} numberOfLines={1}>
              {word.exampleSentence}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.exampleColumn}>
            <View style={styles.exampleRow}>
              <ThemedText style={[styles.exampleSentence, { color: theme.text }]} numberOfLines={1}>
                {word.exampleSentence}
              </ThemedText>
              <InlinePronunciationEvaluator
                referenceText={word.exampleSentence}
                wordId={word.id}
              />
            </View>
            {showLongExample && word.longExample ? (
              <View style={styles.longExampleRow}>
                <ThemedText style={[styles.longExample, { color: theme.textSecondary }]}>
                  {word.longExample}
                </ThemedText>
                <Pressable
                  testID={`button-speak-long-${word.id}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    speakChinese(word.longExample || "", { wordId: word.id });
                  }}
                  style={[styles.longExampleSpeakButton, { backgroundColor: `${theme.primary}15` }]}
                  hitSlop={8}
                >
                  <Feather name="volume-2" size={14} color={theme.primary} />
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
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
  posBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  posText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
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
  exampleColumn: {
    flexDirection: "column",
  },
  exampleRow: {
    paddingLeft: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  exampleSentence: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  longExampleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    gap: Spacing.xs,
  },
  longExample: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
  },
  longExampleSpeakButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  longExampleTranslation: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
    lineHeight: 20,
  },
  lockedExampleMask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  lockedExampleText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
