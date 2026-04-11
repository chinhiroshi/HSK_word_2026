import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Image } from "react-native";
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

const PANDA_SPECIAL = require("../../assets/images/panda-stamp-special.png");

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsMemorized, markAsUnmemorized } from "@/lib/storage";
import { speakChinese, stopSpeaking } from "@/lib/speech";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;
type RevealLevel = 0 | 1 | 2;

const PASS_PERCENTAGE = 85;
const REVIEW_COLOR = "#BE185D";
const REVIEW_COLOR_LIGHT = "#FCE7F3";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface AudioCardProps {
  word: Word;
  revealLevel: RevealLevel;
  theme: ReturnType<typeof useTheme>["theme"];
  wordIndex: number;
  totalWords: number;
}

function AudioCard({ word, revealLevel, theme, wordIndex, totalWords }: AudioCardProps) {
  const hasBadge = (word.textUnmemorizedCount || 0) > 0 || (word.audioUnmemorizedCount || 0) > 0;
  const badgeCount = Math.max(word.textUnmemorizedCount || 0, word.audioUnmemorizedCount || 0);
  return (
    <View style={cardStyles.root}>
      <View style={cardStyles.topRow}>
        {hasBadge ? (
          <View style={[cardStyles.badge, { backgroundColor: Colors.light.alert + "22" }]}>
            <ThemedText style={[cardStyles.badgeText, { color: Colors.light.alert }]}>
              苦手 {badgeCount}回
            </ThemedText>
          </View>
        ) : (
          <View style={cardStyles.badgePlaceholder} />
        )}
        <ThemedText style={[cardStyles.counter, { color: theme.textSecondary }]}>
          {wordIndex} / {totalWords}
        </ThemedText>
      </View>
      {revealLevel >= 1 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedText style={[cardStyles.chinese, { color: theme.text }]}>{word.word}</ThemedText>
          <ThemedText style={[cardStyles.pinyin, { color: theme.primary }]}>{word.pinyin}</ThemedText>
        </Animated.View>
      ) : (
        <View style={cardStyles.hiddenPlaceholder}>
          <Feather name="volume-2" size={32} color={REVIEW_COLOR} />
          <ThemedText style={[cardStyles.hiddenHint, { color: theme.textSecondary }]}>音声を聴いてください</ThemedText>
        </View>
      )}
      {revealLevel >= 2 ? (
        <Animated.View entering={FadeIn.duration(200)} style={[cardStyles.meaningBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={cardStyles.translation}>{word.translation}</ThemedText>
          {word.exampleSentence ? (
            <ThemedText style={[cardStyles.example, { color: theme.textSecondary }]}>{word.exampleSentence}</ThemedText>
          ) : null}
          {word.exampleTranslation ? (
            <ThemedText style={[cardStyles.exampleJa, { color: theme.textSecondary }]}>{word.exampleTranslation}</ThemedText>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, gap: Spacing.xl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  badgePlaceholder: { width: 1, height: 20 },
  counter: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  chinese: { fontSize: 44, fontWeight: "400" },
  pinyin: { fontSize: 17, fontFamily: "Nunito_400Regular", marginTop: Spacing.xs },
  hiddenPlaceholder: { alignItems: "center", paddingVertical: Spacing["2xl"], gap: Spacing.sm },
  hiddenHint: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  meaningBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.xs },
  translation: { fontSize: 22, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  example: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  exampleJa: { fontSize: 13, fontFamily: "Nunito_400Regular" },
});

export default function SprintReviewTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { completeSession, getReviewTestWords, sprintData } = useSprint();

  const [cardWords, setCardWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealLevel, setRevealLevel] = useState<RevealLevel>(0);
  const [choices, setChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);

  const reviewCellIndexRef = useRef<number>(sprintData?.currentPosition ?? 1);

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

  const load = useCallback(async () => {
    await initializeData();
    const allWords = await getWords();
    const reviewWords = getReviewTestWords(allWords);
    setCardWords(shuffleArray(reviewWords));
    setLoading(false);
  }, [getReviewTestWords]);

  useEffect(() => {
    load();
  }, [load]);

  const currentWord = cardWords[currentIndex] ?? null;
  const progress = cardWords.length > 0 ? ((currentIndex + 1) / cardWords.length) * 100 : 0;

  const lastSpokenIndex = useRef(-1);
  useEffect(() => {
    if (loading || !currentWord || isCompleted) return;
    if (lastSpokenIndex.current === currentIndex) return;
    lastSpokenIndex.current = currentIndex;
    const text = currentWord.exampleSentence
      ? `${currentWord.word}。${currentWord.exampleSentence}`
      : currentWord.word;
    speakChinese(text);
  }, [currentIndex, loading, currentWord, isCompleted]);

  useEffect(() => {
    setRevealLevel(0);
  }, [currentIndex]);

  useEffect(() => {
    return () => { stopSpeaking().catch(() => {}); };
  }, []);

  const handleCardChoice = async (choice: "memorized" | "unmemorized") => {
    if (!currentWord) return;
    Haptics.impactAsync(choice === "memorized" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    await (choice === "memorized"
      ? markAsMemorized(currentWord.id, "audio")
      : markAsUnmemorized(currentWord.id, "audio"));
    setChoices((prev) => ({ ...prev, [currentWord.id]: choice }));
    if (currentIndex < cardWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>復習テストを準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (cardWords.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={styles.emptyTitle}>復習対象がありません</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            学習済みの単語がまだありません。
          </ThemedText>
          <Button onPress={() => handleFinish(true)} style={styles.actionButton}>
            クリアして進む
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (isCompleted) {
    const memorized = Object.values(choices).filter((c) => c === "memorized").length;
    const total = Object.keys(choices).length;
    const percentage = total > 0 ? Math.round((memorized / total) * 100) : 0;
    const cleared = percentage >= PASS_PERCENTAGE;

    return (
      <ThemedView style={styles.container}>
        {stampVisible ? (
          <Animated.View style={[styles.stampOverlay, stampStyle]}>
            <View style={[styles.stampCircle, { backgroundColor: REVIEW_COLOR, borderWidth: 4, borderColor: "#fff" }]}>
              <Image source={PANDA_SPECIAL} style={{ width: 148, height: 148, borderRadius: 74 }} resizeMode="cover" />
            </View>
            <ThemedText style={styles.stampLabel}>復習クリア！</ThemedText>
          </Animated.View>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.resultScrollContent, { paddingTop: headerHeight + Spacing.xl }]}
        >
          <Animated.View entering={FadeIn} style={styles.resultInner}>
            <View style={[styles.scoreCircle, { borderColor: cleared ? REVIEW_COLOR : Colors.light.alert }]}>
              <ThemedText style={styles.scorePercentage}>{percentage}%</ThemedText>
              <ThemedText style={[styles.scoreLabel, { color: theme.textSecondary }]}>覚えた率</ThemedText>
            </View>
            {cleared ? (
              <View style={[styles.specialStampBadge, { backgroundColor: REVIEW_COLOR_LIGHT }]}>
                <Feather name="refresh-cw" size={20} color={REVIEW_COLOR} />
                <ThemedText style={[styles.specialStampText, { color: REVIEW_COLOR }]}>
                  復習クリア！
                </ThemedText>
              </View>
            ) : null}
            <ThemedText style={styles.resultTitle}>
              {cleared ? "復習テストクリア！" : "もう少し頑張りましょう！"}
            </ThemedText>
            <ThemedText style={[styles.passInfo, { color: theme.textSecondary }]}>
              合格ライン: {PASS_PERCENTAGE}%（覚えた）
            </ThemedText>
            <ThemedText style={[styles.resultStats, { color: theme.textSecondary }]}>
              {memorized} / {total} 語 覚えた
            </ThemedText>
            <View style={[styles.reviewInfoCard, { backgroundColor: REVIEW_COLOR_LIGHT, borderColor: "#F9A8D4" }]}>
              <Feather name="info" size={15} color={REVIEW_COLOR} />
              <ThemedText style={[styles.reviewInfoText, { color: REVIEW_COLOR }]}>
                過去200単語の苦手語から出題
              </ThemedText>
            </View>
            <Button
              testID="button-finish-review-test"
              onPress={() => handleFinish(cleared)}
              disabled={completing}
              style={[styles.actionButton, cleared ? { backgroundColor: REVIEW_COLOR } : {}]}
            >
              {completing ? "保存中..." : cleared ? "スタンプをもらう" : "次へ進む"}
            </Button>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    );
  }

  if (!currentWord) return null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <View style={styles.progressSection}>
          <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {cardWords.length}
          </ThemedText>
          <ProgressBar progress={progress} height={6} color={REVIEW_COLOR} />
        </View>

        <View style={styles.infoBar}>
          <View style={[styles.infoBadge, { backgroundColor: REVIEW_COLOR_LIGHT }]}>
            <Feather name="refresh-cw" size={13} color={REVIEW_COLOR} />
            <ThemedText style={[styles.infoBadgeText, { color: REVIEW_COLOR }]}>苦手語復習テスト</ThemedText>
          </View>
          <Pressable
            testID="button-replay-audio"
            onPress={() => {
              const text = currentWord.exampleSentence
                ? `${currentWord.word}。${currentWord.exampleSentence}`
                : currentWord.word;
              speakChinese(text);
            }}
            style={[styles.replayButton, { backgroundColor: REVIEW_COLOR_LIGHT, borderColor: REVIEW_COLOR + "60" }]}
          >
            <Feather name="volume-2" size={16} color={REVIEW_COLOR} />
            <ThemedText style={[styles.replayLabel, { color: REVIEW_COLOR }]}>再生</ThemedText>
          </Pressable>
        </View>

        <Animated.View
          key={`review-${currentIndex}-${revealLevel}`}
          entering={revealLevel === 0 ? FadeIn.duration(180) : undefined}
          style={[styles.wordCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
        >
          <AudioCard
            word={currentWord}
            revealLevel={revealLevel}
            theme={theme}
            wordIndex={currentIndex + 1}
            totalWords={cardWords.length}
          />
        </Animated.View>

        {revealLevel < 2 ? (
          <View style={styles.choiceButtonsWrapper}>
            <View style={styles.choiceButtons}>
              <Pressable
                testID="button-unmemorized-early"
                onPress={() => handleCardChoice("unmemorized")}
                style={[styles.choiceButton, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert }]}
              >
                <Feather name="flag" size={20} color={Colors.light.alert} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>覚えてない</ThemedText>
              </Pressable>
              <Pressable
                testID="button-memorized"
                onPress={() => handleCardChoice("memorized")}
                style={[styles.choiceButton, { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success }]}
              >
                <Feather name="check" size={20} color={Colors.light.success} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>覚えた</ThemedText>
              </Pressable>
            </View>
            <Pressable
              testID="button-reveal-next"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setRevealLevel((prev) => (prev < 2 ? ((prev + 1) as RevealLevel) : 2));
              }}
              style={[styles.earlyUnmemorizedButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="eye" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.earlyUnmemorizedLabel, { color: theme.textSecondary }]}>
                {revealLevel === 0 ? "文字を見る" : "意味を見る"}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.choiceButtons}>
            <Pressable
              testID="button-memorized"
              onPress={() => handleCardChoice("memorized")}
              style={[styles.choiceButton, { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success }]}
            >
              <Feather name="check" size={20} color={Colors.light.success} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>覚えた</ThemedText>
            </Pressable>
            <Pressable
              testID="button-unmemorized"
              onPress={() => handleCardChoice("unmemorized")}
              style={[styles.choiceButton, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert }]}
            >
              <Feather name="flag" size={20} color={Colors.light.alert} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>まだ</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  content: { paddingHorizontal: Spacing.lg },
  progressSection: { marginBottom: Spacing.md },
  progressText: { fontSize: 14, fontFamily: "Nunito_600SemiBold", textAlign: "right", marginBottom: Spacing.sm },
  infoBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  infoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.full },
  infoBadgeText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  replayButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1 },
  replayLabel: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  wordCard: { borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.xl },
  choiceButtonsWrapper: { gap: Spacing.md },
  choiceButtons: { flexDirection: "row", gap: Spacing.md },
  choiceButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 2,
  },
  choiceLabel: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  earlyUnmemorizedButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1,
  },
  earlyUnmemorizedLabel: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
  actionButton: { width: "100%", marginTop: Spacing.xl },
  resultScrollContent: { flexGrow: 1, paddingHorizontal: Spacing["3xl"], paddingBottom: Spacing["3xl"] },
  resultInner: { alignItems: "center", width: "100%" },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 6,
    justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl,
  },
  scorePercentage: { fontSize: 38, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  scoreLabel: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  specialStampBadge: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, marginBottom: Spacing.lg,
  },
  specialStampText: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  resultTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: Spacing.sm, textAlign: "center" },
  passInfo: { fontSize: 13, fontFamily: "Nunito_400Regular", marginBottom: Spacing.sm },
  resultStats: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.xl },
  reviewInfoCard: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: Spacing.md,
  },
  reviewInfoText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  stampOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", gap: Spacing.xl,
  },
  stampCircle: { width: 160, height: 160, borderRadius: 80, justifyContent: "center", alignItems: "center" },
  stampLabel: { fontSize: 26, fontWeight: "700", fontFamily: "Nunito_700Bold", color: "#fff" },
});
