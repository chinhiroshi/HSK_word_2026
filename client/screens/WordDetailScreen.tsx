import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
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
import { SpeakButton } from "@/components/SpeakButton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWord, getWords, toggleMemorized } from "@/lib/storage";
import { getPinyin } from "@/lib/pinyin";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { Language } from "@/lib/i18n";

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
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { isWordIndexLocked } = useSubscription();
  const { wordId } = route.params;

  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const checkScale = useSharedValue(1);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const loadData = useCallback(async () => {
    const wordData = await getWord(wordId);
    if (wordData) {
      setWord(wordData);
      // Determine lock status by finding word's 0-based index in the full list
      const allWords = await getWords();
      const wordIndex = allWords.findIndex((w) => w.id === wordId);
      if (wordIndex >= 0) {
        setIsLocked(isWordIndexLocked(wordIndex, wordData.hskLevel));
      }
    }
    setLoading(false);
  }, [wordId, isWordIndexLocked]);

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

    if (isLocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("Paywall");
      return;
    }

    checkScale.value = withSpring(1.3, springConfig, () => {
      checkScale.value = withSpring(1, springConfig);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const updatedWord = await toggleMemorized(word.id);
    if (updatedWord) {
      setWord(updatedWord);
    }
  };

  const handleLockedAudioPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Paywall");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: safeHeaderPadding + Spacing["4xl"],
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
        <ThemedText>{t("word_not_found")}</ThemedText>
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
            paddingTop: safeHeaderPadding + Spacing["5xl"],
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
          <View style={styles.wordHeader}>
            <ThemedText style={styles.word}>{word.word}</ThemedText>
            <SpeakButton text={word.word} size="large" />
          </View>
          <ThemedText style={[styles.pinyin, { color: theme.primary }]}>
            {word.pinyin || getPinyin(word.word)}
          </ThemedText>
          <ThemedText style={[styles.translation, { color: theme.textSecondary }]}>
            {lang === "en" && word.translationEn ? word.translationEn : word.translation}
          </ThemedText>
          {(lang === "ja" ? word.posJa : word.posEn) ? (
            <View style={[styles.posBadge, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}30` }]}>
              <ThemedText style={[styles.posText, { color: theme.primary }]}>
                {lang === "ja" ? word.posJa : word.posEn}
              </ThemedText>
            </View>
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
              {word.isMemorized ? t("word_is_memorized") : t("word_is_not_memorized")}
            </ThemedText>
          </View>
        </View>

        {/* Example sentence card */}
        <View
          style={[
            styles.exampleCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.exampleHeader}>
            <ThemedText style={styles.sectionTitle}>{t("example_sentence")}</ThemedText>
            {isLocked ? (
              <Pressable
                onPress={handleLockedAudioPress}
                style={[styles.lockedAudioButton, { backgroundColor: theme.backgroundSecondary }]}
                hitSlop={8}
              >
                <Feather name="lock" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : (
              <SpeakButton text={word.exampleSentence} size="medium" />
            )}
          </View>
          {isLocked ? (
            <Pressable
              onPress={handleLockedAudioPress}
              style={[styles.lockedExampleBlock, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}
            >
              <Feather name="lock" size={18} color={theme.primary} />
              <ThemedText style={[styles.lockedExampleBlockText, { color: theme.primary }]}>
                {t("premium_unlock")}
              </ThemedText>
            </Pressable>
          ) : (
            <>
              <ThemedText style={styles.exampleSentence}>
                {word.exampleSentence}
              </ThemedText>
              <ThemedText style={[styles.examplePinyin, { color: theme.primary }]}>
                {word.examplePinyin || getPinyin(word.exampleSentence)}
              </ThemedText>
              <ThemedText style={[styles.exampleTranslation, { color: theme.textSecondary }]}>
                {lang === "en" && word.exampleEnglish ? word.exampleEnglish : word.exampleTranslation}
              </ThemedText>
            </>
          )}
        </View>

        {/* Long example card */}
        {word.longExample ? (
          <View
            style={[
              styles.exampleCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={styles.exampleHeader}>
              <ThemedText style={styles.sectionTitle}>{t("long_example")}</ThemedText>
              {isLocked ? (
                <Pressable
                  onPress={handleLockedAudioPress}
                  style={[styles.lockedAudioButton, { backgroundColor: theme.backgroundSecondary }]}
                  hitSlop={8}
                >
                  <Feather name="lock" size={16} color={theme.textSecondary} />
                </Pressable>
              ) : (
                <SpeakButton text={word.longExample} size="medium" />
              )}
            </View>
            {isLocked ? (
              <Pressable
                onPress={handleLockedAudioPress}
                style={[styles.lockedExampleBlock, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}
              >
                <Feather name="lock" size={18} color={theme.primary} />
                <ThemedText style={[styles.lockedExampleBlockText, { color: theme.primary }]}>
                  {t("premium_unlock")}
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <ThemedText style={styles.exampleSentence}>
                  {word.longExample}
                </ThemedText>
                {(lang === "en" ? (word.longExampleEnglish || word.longExampleTranslation) : word.longExampleTranslation) ? (
                  <ThemedText style={[styles.exampleTranslation, { color: theme.textSecondary }]}>
                    {lang === "en" && word.longExampleEnglish ? word.longExampleEnglish : word.longExampleTranslation}
                  </ThemedText>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={handleToggleMemorized}
          style={[
            styles.toggleButton,
            {
              backgroundColor: isLocked
                ? theme.primary
                : word.isMemorized
                ? Colors.light.alert
                : Colors.light.success,
            },
          ]}
          testID="toggle-memorized-button"
        >
          <Animated.View style={[styles.toggleContent, checkAnimatedStyle]}>
            <Feather
              name={isLocked ? "lock" : word.isMemorized ? "x-circle" : "check-circle"}
              size={24}
              color="#FFFFFF"
            />
            <ThemedText style={styles.toggleText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {isLocked
                ? t("premium_unlock")
                : word.isMemorized
                ? t("mark_unmemorized")
                : t("mark_memorized")}
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  wordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  word: {
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 56,
  },
  pinyin: {
    fontSize: 18,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xs,
  },
  translation: {
    fontSize: 18,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xs,
  },
  translationSub: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.sm,
    opacity: 0.65,
  },
  posBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    alignSelf: "center",
  },
  posText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
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
  exampleCard: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  exampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  exampleSentence: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  examplePinyin: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.sm,
  },
  exampleTranslation: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
  },
  exampleTranslationSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginTop: Spacing.xs,
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.md,
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
  lockedAudioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  lockedExampleBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  lockedExampleBlockText: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
