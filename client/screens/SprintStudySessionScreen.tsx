import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { SpeakButton } from "@/components/SpeakButton";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsMemorized, markAsUnmemorized } from "@/lib/storage";
import { speakChinese } from "@/lib/speech";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type RouteProps = RouteProp<SprintStackParamList, "SprintStudySession">;
type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

type Phase = "study" | "review" | "complete";

export default function SprintStudySessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { sprintData, completeSession, getStudyWords, getReviewWords } = useSprint();

  const sessionMode = route.params?.mode ?? "study";

  const [phase, setPhase] = useState<Phase>(sessionMode === "review" ? "review" : "study");
  const [studyWords, setStudyWords] = useState<Word[]>([]);
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyChoices, setStudyChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [allChoices, setAllChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const loadedStudyWords = useRef<Word[]>([]);

  const currentWords = phase === "study" ? studyWords : reviewWords;
  const currentWord = currentWords[currentIndex] ?? null;
  const progress = currentWords.length > 0 ? (currentIndex / currentWords.length) * 100 : 0;

  const isAudioMode = currentIndex % 2 === 1 && phase === "study";

  const loadWords = useCallback(async () => {
    setLoading(true);
    await initializeData();
    const allWords = await getWords();
    if (sessionMode === "review") {
      const rev = getReviewWords(allWords);
      setReviewWords(rev);
    } else {
      const study = getStudyWords(allWords);
      loadedStudyWords.current = study;
      setStudyWords(study);
    }
    setLoading(false);
  }, [sessionMode, getStudyWords, getReviewWords]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    setIsRevealed(false);
    if (isAudioMode && currentWord) {
      speakChinese(currentWord.word);
    }
  }, [currentIndex, phase]);

  const buildReviewFromStudyPhase = useCallback(
    (choices: Record<string, "memorized" | "unmemorized">): Word[] => {
      if (!sprintData) return [];
      const failedInStudy = loadedStudyWords.current.filter(
        (w) => choices[w.id] === "unmemorized"
      );
      const shuffled = [...failedInStudy].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, sprintData.reviewCount);
    },
    [sprintData]
  );

  const handleChoice = async (choice: "memorized" | "unmemorized") => {
    if (!currentWord) return;
    Haptics.impactAsync(
      choice === "memorized"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    const memType = isAudioMode ? "audio" : "text";

    if (choice === "memorized") {
      await markAsMemorized(currentWord.id, memType);
    } else {
      await markAsUnmemorized(currentWord.id, memType);
    }

    const newStudyChoices =
      phase === "study"
        ? { ...studyChoices, [currentWord.id]: choice }
        : studyChoices;

    if (phase === "study") {
      setStudyChoices(newStudyChoices);
    }
    setAllChoices((prev) => ({ ...prev, [currentWord.id]: choice }));

    if (currentIndex < currentWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (phase === "study") {
        const finalStudyChoices = { ...studyChoices, [currentWord.id]: choice };
        const reviewPool = buildReviewFromStudyPhase(finalStudyChoices);
        if (reviewPool.length > 0) {
          setReviewWords(reviewPool);
          setPhase("review");
          setCurrentIndex(0);
        } else {
          setPhase("complete");
        }
      } else {
        setPhase("complete");
      }
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    await completeSession(false);
    setCompleting(false);
    navigation.navigate("SprintHome");
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={styles.loadingText}>準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (phase === "complete") {
    const memorizedCount = Object.values(allChoices).filter((c) => c === "memorized").length;
    const total = Object.keys(allChoices).length;
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <Animated.View entering={FadeIn} style={styles.completeContainer}>
          <View style={[styles.completeIcon, { backgroundColor: Colors.light.success + "20" }]}>
            <Feather name="award" size={48} color={Colors.light.success} />
          </View>
          <ThemedText style={styles.completeTitle}>セッション完了！</ThemedText>
          <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
            {total}語を学習しました
          </ThemedText>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <ThemedText style={[styles.resultValue, { color: Colors.light.success }]}>
                {memorizedCount}
              </ThemedText>
              <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>覚えた</ThemedText>
            </View>
            <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />
            <View style={styles.resultStat}>
              <ThemedText style={[styles.resultValue, { color: Colors.light.alert }]}>
                {total - memorizedCount}
              </ThemedText>
              <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>
                覚えていない
              </ThemedText>
            </View>
          </View>
          <Button
            testID="button-session-complete"
            onPress={handleComplete}
            disabled={completing}
            style={styles.completeButton}
          >
            {completing ? "保存中..." : "スタンプをもらう"}
          </Button>
        </Animated.View>
      </ThemedView>
    );
  }

  if (!currentWord) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={[styles.emptyTitle, { marginTop: Spacing.lg }]}>
            {phase === "review" ? "復習する単語がありません" : "学習する単語がありません"}
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
            すべての単語が学習済みです
          </ThemedText>
          <Button onPress={handleComplete} style={styles.completeButton}>
            完了する
          </Button>
        </View>
      </ThemedView>
    );
  }

  const modeBadgeColor = isAudioMode ? Colors.light.secondary : theme.primary;
  const modeBadgeBg = isAudioMode ? Colors.light.secondary + "20" : theme.primary + "20";
  const modeIcon: keyof typeof Feather.glyphMap = isAudioMode ? "headphones" : "book-open";
  const modeLabel = isAudioMode ? "音声モード" : "文字モード";

  const phaseBadgeColor = phase === "study" ? modeBadgeColor : Colors.light.secondary;
  const phaseBadgeBg = phase === "study" ? modeBadgeBg : Colors.light.secondary + "20";
  const phaseIcon: keyof typeof Feather.glyphMap =
    phase === "study" ? modeIcon : "refresh-cw";
  const phaseLabel = phase === "study" ? modeLabel : "復習フェーズ";

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.phaseHeader}>
          <View
            style={[styles.phaseBadge, { backgroundColor: phaseBadgeBg }]}
          >
            <Feather name={phaseIcon} size={14} color={phaseBadgeColor} />
            <ThemedText style={[styles.phaseLabel, { color: phaseBadgeColor }]}>
              {phaseLabel}
            </ThemedText>
          </View>
          <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {currentWords.length}
          </ThemedText>
        </View>

        <View style={styles.progressBarWrapper}>
          <ProgressBar progress={progress} height={6} />
        </View>

        <Animated.View
          key={`${phase}-${currentIndex}`}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.wordCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {isAudioMode && !isRevealed ? (
            <Pressable
              testID="button-reveal-word"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRevealed(true);
              }}
              style={styles.audioModeContent}
            >
              <View
                style={[
                  styles.audioPlayContainer,
                  { backgroundColor: Colors.light.secondary + "15" },
                ]}
              >
                <SpeakButton text={currentWord.word} size="large" />
              </View>
              <ThemedText style={[styles.pinyinText, { color: theme.primary }]}>
                {currentWord.pinyin}
              </ThemedText>
              <View
                style={[
                  styles.revealHint,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                ]}
              >
                <Feather name="eye" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.revealHintText, { color: theme.textSecondary }]}>
                  タップして表示
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <>
              <View style={styles.wordHeader}>
                <ThemedText style={styles.wordText}>{currentWord.word}</ThemedText>
                <SpeakButton text={currentWord.word} size="medium" />
              </View>
              <ThemedText style={[styles.pinyinText, { color: theme.primary }]}>
                {currentWord.pinyin}
              </ThemedText>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText style={[styles.translationText, { color: theme.textSecondary }]}>
                {currentWord.translation}
              </ThemedText>
              {currentWord.exampleSentence ? (
                <View style={styles.exampleSection}>
                  <View style={styles.exampleRow}>
                    <ThemedText style={[styles.exampleChinese, { color: theme.text }]}>
                      {currentWord.exampleSentence}
                    </ThemedText>
                    <SpeakButton text={currentWord.exampleSentence} size="small" />
                  </View>
                  <ThemedText style={[styles.exampleJp, { color: theme.textSecondary }]}>
                    {currentWord.exampleTranslation}
                  </ThemedText>
                </View>
              ) : null}
            </>
          )}
        </Animated.View>

        {!isAudioMode || isRevealed ? (
          <View style={styles.choiceButtons}>
            <Pressable
              testID="button-unmemorized"
              onPress={() => handleChoice("unmemorized")}
              style={[
                styles.choiceButton,
                {
                  backgroundColor: Colors.light.alert + "15",
                  borderColor: Colors.light.alert,
                },
              ]}
            >
              <Feather name="flag" size={22} color={Colors.light.alert} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>
                覚えていない
              </ThemedText>
            </Pressable>

            <Pressable
              testID="button-memorized"
              onPress={() => handleChoice("memorized")}
              style={[
                styles.choiceButton,
                {
                  backgroundColor: Colors.light.success + "15",
                  borderColor: Colors.light.success,
                },
              ]}
            >
              <Feather name="check" size={22} color={Colors.light.success} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>
                覚えた
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  loadingText: { fontSize: 16, fontFamily: "Nunito_400Regular" },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  progress: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  progressBarWrapper: { marginBottom: Spacing.xl },
  wordCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    minHeight: 200,
  },
  audioModeContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  audioPlayContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  revealHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  revealHintText: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  wordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  wordText: {
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    flex: 1,
  },
  pinyinText: {
    fontSize: 17,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  divider: { height: 1, marginBottom: Spacing.md },
  translationText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.md,
  },
  exampleSection: { gap: Spacing.xs },
  exampleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  exampleChinese: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
    flex: 1,
  },
  exampleJp: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    lineHeight: 20,
  },
  choiceButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  choiceButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minHeight: 80,
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  completeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["3xl"],
  },
  completeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  completeTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  completeSub: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  resultStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    width: "100%",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  resultStat: { alignItems: "center", flex: 1 },
  resultValue: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  resultLabel: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginTop: Spacing.xs,
  },
  resultDivider: { width: 1, height: 40 },
  completeButton: { width: "100%" },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
});
