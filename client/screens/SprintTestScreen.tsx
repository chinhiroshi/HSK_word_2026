import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { MonsterIcon } from "@/components/SprintCellIcons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, TestQuestion } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import * as Speech from "expo-speech";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

const MAX_TEST_WORDS = 50;
const PASS_PERCENTAGE = 85;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build audio-format questions: hear Chinese, choose Japanese meaning.
// Uses unmemorized (audio) words, up to MAX_TEST_WORDS.
function generateAudioQuestions(words: Word[]): TestQuestion[] {
  const unmemorized = words.filter((w) => !w.audioMemorized);
  const pool = shuffleArray(unmemorized).slice(0, MAX_TEST_WORDS);
  if (pool.length === 0) return [];
  return pool.map((word) => {
    const correctAnswer = word.translation;
    const distractors = shuffleArray(words.filter((w) => w.id !== word.id))
      .slice(0, 3)
      .map((w) => w.translation);
    const options = shuffleArray([correctAnswer, ...distractors]);
    return { word, type: "word", options, correctAnswer };
  });
}

interface Answer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
}

function speakChinese(text: string) {
  Speech.stop();
  Speech.speak(text, { language: "zh-CN", rate: 0.9 });
}

export default function SprintTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { completeSession } = useSprint();

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);

  const stampScale = useSharedValue(0);
  const stampOpacity = useSharedValue(0);
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampScale.value }],
    opacity: stampOpacity.value,
  }));

  const triggerStamp = (onDone: () => void) => {
    setStampVisible(true);
    stampScale.value = 0;
    stampOpacity.value = 0;
    stampScale.value = withSequence(
      withTiming(1.25, { duration: 280 }),
      withTiming(1.0, { duration: 140 })
    );
    stampOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1100 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  };

  const loadQuestions = useCallback(async () => {
    await initializeData();
    const words = await getWords();
    const q = generateAudioQuestions(words);
    setQuestions(q);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Auto-play audio when question changes
  const currentQuestion = questions[currentIndex];
  const lastSpokenIndex = useRef(-1);
  useEffect(() => {
    if (!loading && currentQuestion && !isCompleted && lastSpokenIndex.current !== currentIndex) {
      lastSpokenIndex.current = currentIndex;
      speakChinese(currentQuestion.word.word);
    }
  }, [currentIndex, loading, currentQuestion, isCompleted]);

  // Stop speech on unmount
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAnswers((prev) => [...prev, { questionIndex: currentIndex, answer, isCorrect }]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleFinish = async (cleared: boolean) => {
    setCompleting(true);
    await completeSession(cleared);
    setCompleting(false);
    if (cleared) {
      triggerStamp(() => navigation.navigate("SprintHome"));
    } else {
      navigation.navigate("SprintHome");
    }
  };

  const getOptionStyle = (option: string) => {
    if (!showResult)
      return { backgroundColor: theme.backgroundDefault, borderColor: theme.border };
    if (option === currentQuestion.correctAnswer)
      return { backgroundColor: Colors.light.success + "20", borderColor: Colors.light.success };
    if (option === selectedAnswer && option !== currentQuestion.correctAnswer)
      return { backgroundColor: Colors.light.alert + "20", borderColor: Colors.light.alert };
    return { backgroundColor: theme.backgroundDefault, borderColor: theme.border };
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText>テストを準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (questions.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={styles.emptyTitle}>テスト対象がありません</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            覚えていない単語がありません。
          </ThemedText>
          <Button onPress={() => handleFinish(true)} style={styles.actionButton}>
            クリアして進む
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (isCompleted) {
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const cleared = percentage >= PASS_PERCENTAGE;

    return (
      <ThemedView style={styles.container}>
        {stampVisible ? (
          <Animated.View style={[styles.stampOverlay, stampStyle]}>
            <View style={[styles.stampCircle, { backgroundColor: "#7C3AED" }]}>
              <MonsterIcon size={80} color="#fff" />
            </View>
            <ThemedText style={styles.stampLabel}>特別スタンプ獲得！</ThemedText>
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeIn} style={[styles.resultContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <View
            style={[
              styles.scoreCircle,
              { borderColor: cleared ? Colors.light.success : Colors.light.alert },
            ]}
          >
            <ThemedText style={styles.scorePercentage}>{percentage}%</ThemedText>
            <ThemedText style={[styles.scoreLabel, { color: theme.textSecondary }]}>正解率</ThemedText>
          </View>

          {cleared ? (
            <View style={[styles.specialStampBadge, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="star" size={20} color={Colors.light.success} />
              <ThemedText style={[styles.specialStampText, { color: Colors.light.success }]}>
                特別スタンプ獲得！
              </ThemedText>
            </View>
          ) : null}

          <ThemedText style={styles.resultTitle}>
            {cleared ? "テストクリア！" : "もう少し頑張りましょう！"}
          </ThemedText>
          <ThemedText style={[styles.passInfo, { color: theme.textSecondary }]}>
            合格ライン: {PASS_PERCENTAGE}%
          </ThemedText>
          <ThemedText style={[styles.resultStats, { color: theme.textSecondary }]}>
            {correct} / {total} 問正解
          </ThemedText>

          <Button
            testID="button-finish-test"
            onPress={() => handleFinish(cleared)}
            disabled={completing}
            style={styles.actionButton}
          >
            {completing ? "保存中..." : cleared ? "スタンプをもらう" : "次へ進む"}
          </Button>
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.progressSection}>
          <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
            問題 {currentIndex + 1} / {questions.length}
          </ThemedText>
          <ProgressBar progress={progress} height={6} />
        </View>

        <View style={styles.questionSection}>
          <Pressable
            testID="button-replay-audio"
            onPress={() => speakChinese(currentQuestion.word.word)}
            style={[styles.speakerButton, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}
          >
            <Feather name="volume-2" size={36} color={theme.primary} />
          </Pressable>
          <ThemedText style={[styles.replayHint, { color: theme.textSecondary }]}>
            タップして再生
          </ThemedText>
          <ThemedText style={[styles.questionLabel, { color: theme.textSecondary }]}>
            この音声の意味は？
          </ThemedText>
        </View>

        <View style={styles.optionsSection}>
          {currentQuestion.options.map((option, index) => (
            <Pressable
              key={index}
              testID={`sprint-option-${index}`}
              onPress={() => handleAnswer(option)}
              disabled={!!showResult}
              style={[styles.optionButton, getOptionStyle(option)]}
            >
              <ThemedText style={styles.optionText}>{option}</ThemedText>
              {showResult && option === currentQuestion.correctAnswer ? (
                <Feather name="check" size={20} color={Colors.light.success} />
              ) : null}
              {showResult && option === selectedAnswer && option !== currentQuestion.correctAnswer ? (
                <Feather name="x" size={20} color={Colors.light.alert} />
              ) : null}
            </Pressable>
          ))}
        </View>

        {showResult ? (
          <Animated.View entering={FadeIn} style={styles.feedbackSection}>
            {showResult ? (
              <View style={[styles.answerReveal, { backgroundColor: theme.card }]}>
                <ThemedText style={[styles.answerRevealWord, { color: theme.primary }]}>
                  {currentQuestion.word.word}
                </ThemedText>
                <ThemedText style={[styles.answerRevealPinyin, { color: theme.textSecondary }]}>
                  {currentQuestion.word.pinyin}
                </ThemedText>
              </View>
            ) : null}
            <Button onPress={handleNext} style={styles.actionButton}>
              {currentIndex < questions.length - 1 ? "次の問題" : "結果を見る"}
            </Button>
          </Animated.View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  progressSection: { marginBottom: Spacing.xl },
  progressText: { fontSize: 14, fontFamily: "Nunito_600SemiBold", textAlign: "right", marginBottom: Spacing.sm },
  questionSection: { alignItems: "center", marginBottom: Spacing["2xl"] },
  speakerButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  replayHint: { fontSize: 13, fontFamily: "Nunito_400Regular", marginBottom: Spacing.lg },
  questionLabel: { fontSize: 16, fontFamily: "Nunito_400Regular" },
  optionsSection: { gap: Spacing.md, marginBottom: Spacing.xl },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  optionText: { fontSize: 16, fontFamily: "Nunito_600SemiBold", flex: 1 },
  feedbackSection: { gap: Spacing.md },
  answerReveal: {
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  answerRevealWord: { fontSize: 28, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  answerRevealPinyin: { fontSize: 15, fontFamily: "Nunito_400Regular" },
  actionButton: { width: "100%" },
  resultContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  scorePercentage: { fontSize: 38, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  scoreLabel: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  specialStampBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  specialStampText: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  resultTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: Spacing.sm, textAlign: "center" },
  passInfo: { fontSize: 13, fontFamily: "Nunito_400Regular", marginBottom: Spacing.sm },
  resultStats: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
  stampOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
  },
  stampCircle: {
    width: 160, height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  stampLabel: { fontSize: 26, fontWeight: "700", fontFamily: "Nunito_700Bold", color: "#fff" },
});
