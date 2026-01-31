import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
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
  withSequence,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SpeakButton } from "@/components/SpeakButton";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word, TestQuestion, TestType } from "@/types";
import { getWords, toggleMemorized, initializeData } from "@/lib/storage";
import { generateTestQuestions, calculateScore } from "@/lib/testUtils";
import { speakChinese } from "@/lib/speech";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "Test">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Answer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
}

export default function TestScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { testType } = route.params;

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const buttonScale = useSharedValue(1);

  const loadQuestions = useCallback(async () => {
    await initializeData();
    const words = await getWords();
    const generatedQuestions = generateTestQuestions(words, testType);
    setQuestions(generatedQuestions);
    setLoading(false);

    if (testType === "sentence" && generatedQuestions.length > 0) {
      setTimeout(() => {
        speakChinese(generatedQuestions[0].word.exampleSentence);
      }, 500);
    }
  }, [testType]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const title = testType === "word" ? "単語テスト" : "例文テスト";
    navigation.setOptions({ headerTitle: title });
  }, [testType, navigation]);

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

    setAnswers((prev) => [
      ...prev,
      { questionIndex: currentIndex, answer, isCorrect },
    ]);

    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);

      if (testType === "sentence") {
        setTimeout(() => {
          speakChinese(questions[currentIndex + 1].word.exampleSentence);
        }, 300);
      }
    } else {
      setIsCompleted(true);
      const lastAnswer = answers[answers.length - 1];
      if (lastAnswer?.isCorrect && currentQuestion) {
        await toggleMemorized(currentQuestion.word.id);
      }
    }
  };

  const handleMarkAsMemorized = async () => {
    if (currentQuestion && answers[currentIndex]?.isCorrect) {
      await toggleMemorized(currentQuestion.word.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    handleNext();
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const handleRetry = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCompleted(false);
    await loadQuestions();
  };

  const getOptionStyle = (option: string) => {
    if (!showResult) {
      return {
        backgroundColor: theme.backgroundDefault,
        borderColor: theme.border,
      };
    }

    if (option === currentQuestion.correctAnswer) {
      return {
        backgroundColor: `${Colors.light.success}20`,
        borderColor: Colors.light.success,
      };
    }

    if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
      return {
        backgroundColor: `${Colors.light.alert}20`,
        borderColor: Colors.light.alert,
      };
    }

    return {
      backgroundColor: theme.backgroundDefault,
      borderColor: theme.border,
    };
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>テストを準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (questions.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.emptyContainer}>
          <Feather name="check-circle" size={64} color={Colors.light.success} />
          <ThemedText style={styles.emptyTitle}>テスト対象がありません</ThemedText>
          <ThemedText style={[styles.emptyMessage, { color: theme.textSecondary }]}>
            未暗記の単語がありません。{"\n"}すべての単語を覚えました！
          </ThemedText>
          <Button onPress={handleFinish} style={styles.finishButton}>
            戻る
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (isCompleted) {
    const score = calculateScore(answers);
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <Animated.View entering={FadeIn} style={styles.resultContainer}>
          <View
            style={[
              styles.scoreCircle,
              {
                borderColor:
                  score.percentage >= 70 ? Colors.light.success : Colors.light.alert,
              },
            ]}
          >
            <ThemedText style={styles.scorePercentage}>{score.percentage}%</ThemedText>
            <ThemedText style={[styles.scoreLabel, { color: theme.textSecondary }]}>
              正解率
            </ThemedText>
          </View>

          <ThemedText style={styles.resultTitle}>
            {score.percentage >= 70 ? "素晴らしい！" : "もう少し頑張りましょう！"}
          </ThemedText>

          <ThemedText style={[styles.resultStats, { color: theme.textSecondary }]}>
            {score.correct} / {score.total} 問正解
          </ThemedText>

          <View style={styles.resultButtons}>
            <Button onPress={handleRetry} style={styles.retryButton}>
              もう一度
            </Button>
            <Button onPress={handleFinish} style={styles.finishButton}>
              終了
            </Button>
          </View>
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
          <View style={styles.progressHeader}>
            <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
              問題 {currentIndex + 1} / {questions.length}
            </ThemedText>
          </View>
          <ProgressBar progress={progress} height={6} />
        </View>

        <View style={styles.questionSection}>
          {testType === "word" ? (
            <View style={styles.wordQuestion}>
              <View style={styles.wordRow}>
                <ThemedText style={styles.questionWord}>
                  {currentQuestion.word.word}
                </ThemedText>
                <SpeakButton text={currentQuestion.word.word} size="medium" />
              </View>
              <ThemedText style={[styles.questionPinyin, { color: theme.primary }]}>
                {currentQuestion.word.pinyin}
              </ThemedText>
              <ThemedText style={[styles.questionLabel, { color: theme.textSecondary }]}>
                この単語の意味は？
              </ThemedText>
            </View>
          ) : (
            <View style={styles.sentenceQuestion}>
              <View style={styles.speakRow}>
                <SpeakButton
                  text={currentQuestion.word.exampleSentence}
                  size="large"
                />
              </View>
              <ThemedText style={styles.questionSentence}>
                {currentQuestion.word.exampleSentence}
              </ThemedText>
              <ThemedText style={[styles.sentencePinyin, { color: theme.primary }]}>
                {currentQuestion.word.examplePinyin}
              </ThemedText>
              <ThemedText style={[styles.questionLabel, { color: theme.textSecondary }]}>
                この文の意味は？
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.optionsSection}>
          {currentQuestion.options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
              style={[
                styles.optionButton,
                getOptionStyle(option),
              ]}
              testID={`option-${index}`}
            >
              <ThemedText style={styles.optionText}>{option}</ThemedText>
              {showResult && option === currentQuestion.correctAnswer ? (
                <Feather name="check" size={20} color={Colors.light.success} />
              ) : null}
              {showResult &&
              option === selectedAnswer &&
              option !== currentQuestion.correctAnswer ? (
                <Feather name="x" size={20} color={Colors.light.alert} />
              ) : null}
            </Pressable>
          ))}
        </View>

        {showResult ? (
          <Animated.View entering={FadeIn} style={styles.feedbackSection}>
            {answers[currentIndex]?.isCorrect ? (
              <View style={styles.correctFeedback}>
                <Feather name="check-circle" size={24} color={Colors.light.success} />
                <ThemedText style={[styles.feedbackText, { color: Colors.light.success }]}>
                  正解！
                </ThemedText>
              </View>
            ) : (
              <View style={styles.incorrectFeedback}>
                <Feather name="x-circle" size={24} color={Colors.light.alert} />
                <ThemedText style={[styles.feedbackText, { color: Colors.light.alert }]}>
                  不正解
                </ThemedText>
              </View>
            )}

            <Button onPress={handleNext} style={styles.nextButton}>
              {currentIndex < questions.length - 1 ? "次の問題" : "結果を見る"}
            </Button>
          </Animated.View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
  questionSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  wordQuestion: {
    alignItems: "center",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  questionWord: {
    fontSize: 48,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  questionPinyin: {
    fontSize: 18,
    fontFamily: "Nunito_400Regular",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  questionLabel: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
  },
  sentenceQuestion: {
    alignItems: "center",
    width: "100%",
  },
  speakRow: {
    marginBottom: Spacing.lg,
  },
  questionSentence: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  sentencePinyin: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  optionsSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  feedbackSection: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  correctFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  incorrectFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  nextButton: {
    width: "100%",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  scorePercentage: {
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
  },
  resultStats: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    marginBottom: Spacing["2xl"],
  },
  resultButtons: {
    width: "100%",
    gap: Spacing.md,
  },
  retryButton: {
    width: "100%",
  },
  finishButton: {
    width: "100%",
  },
});
