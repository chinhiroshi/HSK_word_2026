import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { SpeakButton } from "@/components/SpeakButton";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, TestQuestion } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

const QUESTION_COUNT = 10;
const PASS_PERCENTAGE = 70;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSprintQuestions(words: Word[], count: number): TestQuestion[] {
  const sorted = [...words].sort(
    (a, b) =>
      (b.textUnmemorizedCount + b.audioUnmemorizedCount) -
      (a.textUnmemorizedCount + a.audioUnmemorizedCount)
  );
  const pool = sorted.slice(0, Math.max(count * 2, 20));
  const selected = shuffleArray(pool).slice(0, count);
  return selected.map((word) => {
    const correctAnswer = word.translation;
    const others = shuffleArray(words.filter((w) => w.id !== word.id))
      .slice(0, 3)
      .map((w) => w.translation);
    const options = shuffleArray([correctAnswer, ...others]);
    return { word, type: "word", options, correctAnswer };
  });
}

interface Answer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
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

  const loadQuestions = useCallback(async () => {
    await initializeData();
    const words = await getWords();
    const q = generateSprintQuestions(words, QUESTION_COUNT);
    setQuestions(q);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];
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
    navigation.navigate("SprintHome");
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
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
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
          <View style={styles.wordRow}>
            <ThemedText style={styles.questionWord}>{currentQuestion.word.word}</ThemedText>
            <SpeakButton text={currentQuestion.word.word} size="medium" />
          </View>
          <ThemedText style={[styles.questionPinyin, { color: theme.primary }]}>
            {currentQuestion.word.pinyin}
          </ThemedText>
          <ThemedText style={[styles.questionLabel, { color: theme.textSecondary }]}>
            この単語の意味は？
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
  wordRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  questionWord: { fontSize: 48, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  questionPinyin: { fontSize: 18, fontFamily: "Nunito_400Regular", marginTop: Spacing.sm, marginBottom: Spacing.lg },
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
  feedbackSection: { alignItems: "center" },
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
  resultStats: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
});
