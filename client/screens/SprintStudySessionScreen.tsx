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
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { SpeakButton } from "@/components/SpeakButton";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsMemorized, markAsUnmemorized } from "@/lib/storage";
import { speakChinese, stopSpeaking } from "@/lib/speech";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import { PlantIcon } from "@/components/SprintCellIcons";

type RouteProps = RouteProp<SprintStackParamList, "SprintStudySession">;
type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

type Phase = "text" | "audio" | "complete";

export default function SprintStudySessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { sprintData, completeSession, completePhase, getStudyWords, getCellPhaseProgress } = useSprint();

  const sessionMode = route.params?.mode ?? "study";
  const cellIndex = route.params?.cellIndex;

  const initialPhase: Phase = sessionMode === "audio-only" ? "audio" : "text";

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [textChoices, setTextChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [audioChoices, setAudioChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isPartialComplete, setIsPartialComplete] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);
  // Tracks whether we've already auto-saved this phase so we don't double-fire.
  const autoSavedPhase = useRef<string | null>(null);

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
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  };

  const currentWord = words[currentIndex] ?? null;
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const loadWords = useCallback(async () => {
    setLoading(true);
    await initializeData();
    const allWords = await getWords();
    // Pass cellIndex so words are calculated from this cell's position,
    // not from the global studiedWordCount (which reflects currentPosition).
    const study = getStudyWords(allWords, cellIndex);
    setWords(study);
    setLoading(false);
  }, [sessionMode, cellIndex, getStudyWords]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // Auto-save the phase as soon as all words are finished.
  // This guarantees the record is written even if the user presses the header
  // back arrow instead of the completion button.
  useEffect(() => {
    if (phase !== "complete") return;
    const key = `${sessionMode}-${cellIndex ?? "default"}`;
    if (autoSavedPhase.current === key) return;
    autoSavedPhase.current = key;
    const phaseArg =
      sessionMode === "text-only" ? "text" :
      sessionMode === "audio-only" ? "audio" : "both";
    completePhase(phaseArg, cellIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    setIsRevealed(false);
    if (!currentWord) return;
    let cancelled = false;
    const speak = async () => {
      await speakChinese(currentWord.word);
      if (cancelled) return;
      if (phase === "audio" && currentWord.exampleSentence) {
        await new Promise<void>((r) => setTimeout(r, 600));
        if (cancelled) return;
        await speakChinese(currentWord.exampleSentence);
      }
    };
    speak();
    return () => {
      cancelled = true;
      stopSpeaking().catch(() => {});
    };
  }, [currentIndex, phase]);

  const advanceOrFinish = (currentPhase: Phase, newIndex: number) => {
    if (newIndex < words.length) {
      setCurrentIndex(newIndex);
    } else {
      if (currentPhase === "text" && (sessionMode === "study")) {
        setPhase("audio");
        setCurrentIndex(0);
      } else {
        setPhase("complete");
      }
    }
  };

  const handleChoice = async (choice: "memorized" | "unmemorized") => {
    if (!currentWord) return;
    Haptics.impactAsync(
      choice === "memorized"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    if (phase === "text") {
      await (choice === "memorized"
        ? markAsMemorized(currentWord.id, "text")
        : markAsUnmemorized(currentWord.id, "text"));
      setTextChoices((prev) => ({ ...prev, [currentWord.id]: choice }));
    } else {
      await (choice === "memorized"
        ? markAsMemorized(currentWord.id, "audio")
        : markAsUnmemorized(currentWord.id, "audio"));
      setAudioChoices((prev) => ({ ...prev, [currentWord.id]: choice }));
    }

    advanceOrFinish(phase, currentIndex + 1);
  };

  const handleComplete = async () => {
    setCompleting(true);
    const phaseArg = sessionMode === "text-only" ? "text" : sessionMode === "audio-only" ? "audio" : "both";
    // Pass cellIndex so this specific cell gets marked, not whatever currentPosition happens to be.
    const advanced = await completePhase(phaseArg, cellIndex);
    setCompleting(false);
    if (advanced) {
      triggerStamp(() => navigation.navigate("SprintHome"));
    } else {
      setIsPartialComplete(true);
    }
  };

  const totalChoices = { ...textChoices, ...audioChoices };
  const memorizedCount = Object.values(totalChoices).filter((c) => c === "memorized").length;
  const totalCount = Object.keys(totalChoices).length;

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (phase === "complete" && isPartialComplete) {
    const donePhase = sessionMode === "text-only" ? "文字学習" : "音声学習";
    const nextPhase = sessionMode === "text-only" ? "音声学習" : "文字学習";
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <Animated.View entering={FadeIn} style={styles.completeContainer}>
          <View style={[styles.completeIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="check-circle" size={48} color={theme.primary} />
          </View>
          <ThemedText style={styles.completeTitle}>{donePhase}完了！</ThemedText>
          <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
            {words.length}語を学習しました
          </ThemedText>
          <View style={[styles.partialNotice, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
            <Feather name="info" size={15} color={Colors.light.alert} />
            <ThemedText style={[styles.partialNoticeText, { color: Colors.light.alert }]}>
              スタンプは{nextPhase}も完了すると獲得できます
            </ThemedText>
          </View>
        </Animated.View>
      </ThemedView>
    );
  }

  if (phase === "complete") {
    // Determine whether this session will actually award a stamp.
    // Use the explicit cellIndex so we check the right cell's progress.
    const targetPos = cellIndex ?? sprintData?.currentPosition ?? -1;
    const savedProgress = targetPos >= 0 ? getCellPhaseProgress(targetPos) : { text: false, audio: false };
    const willGetStamp =
      sessionMode === "study" ||
      (sessionMode === "text-only" && savedProgress.audio) ||
      (sessionMode === "audio-only" && savedProgress.text);
    const phaseDoneLabel =
      sessionMode === "text-only" ? "文字学習" :
      sessionMode === "audio-only" ? "音声学習" : "";

    return (
      <ThemedView style={styles.container}>
        {stampVisible && (
          <Animated.View style={[styles.stampOverlay, stampStyle]}>
            <View style={[styles.stampCircle, { backgroundColor: Colors.light.success }]}>
              <PlantIcon size={80} color="#fff" />
            </View>
            <ThemedText style={styles.stampLabel}>スタンプ獲得！</ThemedText>
          </Animated.View>
        )}
        <Animated.View entering={FadeIn} style={[styles.completeContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <View style={[styles.completeIcon, { backgroundColor: (willGetStamp ? Colors.light.success : theme.primary) + "20" }]}>
            <Feather name={willGetStamp ? "award" : "check-circle"} size={48} color={willGetStamp ? Colors.light.success : theme.primary} />
          </View>
          <ThemedText style={styles.completeTitle}>
            {phaseDoneLabel ? `${phaseDoneLabel}完了！` : "セッション完了！"}
          </ThemedText>
          <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
            {words.length}語を学習しました
          </ThemedText>
          {!willGetStamp ? (
            <View style={[styles.partialNotice, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
              <Feather name="info" size={15} color={Colors.light.alert} />
              <ThemedText style={[styles.partialNoticeText, { color: Colors.light.alert }]}>
                {sessionMode === "text-only" ? "音声学習" : "文字学習"}も完了するとスタンプ獲得！
              </ThemedText>
            </View>
          ) : null}
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
                {totalCount - memorizedCount}
              </ThemedText>
              <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>覚えていない</ThemedText>
            </View>
          </View>
          {willGetStamp ? (
            <Button
              testID="button-session-complete"
              onPress={handleComplete}
              disabled={completing}
              style={styles.completeButton}
            >
              {completing ? "保存中..." : "スタンプをもらう"}
            </Button>
          ) : null}
          {sessionMode === "text-only" && !savedProgress.audio ? (
            <Pressable
              testID="button-start-audio-study"
              onPress={() => navigation.replace("SprintStudySession", { mode: "audio-only", cellIndex: cellIndex ?? (sprintData?.currentPosition ?? 1) })}
              style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}
            >
              <Feather name="headphones" size={16} color={theme.primary} />
              <ThemedText style={[styles.audioStudyText, { color: theme.primary }]}>音声学習を始める</ThemedText>
            </Pressable>
          ) : null}
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
            学習する単語がありません
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

  const isAudioPhase = phase === "audio";
  const badgeColor = isAudioPhase ? Colors.light.secondary : theme.primary;
  const badgeBg = isAudioPhase ? Colors.light.secondary + "20" : theme.primary + "20";
  const badgeIcon: keyof typeof Feather.glyphMap = isAudioPhase ? "headphones" : "book-open";
  const badgeLabel = isAudioPhase ? "音声学習" : "文字学習";

  const phaseTotal = sessionMode === "study" ? 2 : 1;
  const phaseNum = isAudioPhase && sessionMode === "study" ? 2 : 1;

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
          <View style={styles.phaseLeft}>
            <View style={[styles.phaseBadge, { backgroundColor: badgeBg }]}>
              <Feather name={badgeIcon} size={13} color={badgeColor} />
              <ThemedText style={[styles.phaseBadgeText, { color: badgeColor }]}>
                {badgeLabel}
              </ThemedText>
            </View>
            {sessionMode === "study" ? (
              <ThemedText style={[styles.phaseStep, { color: theme.textSecondary }]}>
                {phaseNum}/{phaseTotal}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {words.length}
          </ThemedText>
        </View>

        <View style={styles.progressBarWrapper}>
          <ProgressBar progress={progress} height={6} />
        </View>

        <Animated.View
          key={`${phase}-${currentIndex}`}
          entering={FadeIn.duration(180)}
          style={[
            styles.wordCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {isAudioPhase ? (
            <AudioCard
              word={currentWord}
              isRevealed={isRevealed}
              onReveal={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRevealed(true);
              }}
              theme={theme}
              wordIndex={currentIndex + 1}
              totalWords={words.length}
            />
          ) : (
            <TextCard
              word={currentWord}
              isRevealed={isRevealed}
              onReveal={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRevealed(true);
              }}
              theme={theme}
              wordIndex={currentIndex + 1}
              totalWords={words.length}
            />
          )}
        </Animated.View>

        <View style={styles.choiceButtons}>
          <Pressable
            testID="button-unmemorized"
            onPress={() => handleChoice("unmemorized")}
            style={[
              styles.choiceButton,
              { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert },
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
              { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success },
            ]}
          >
            <Feather name="check" size={22} color={Colors.light.success} />
            <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>
              覚えた
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function getOriginalWordNum(wordId: string): number {
  const parts = wordId.split("_");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

interface CardProps {
  word: Word;
  isRevealed: boolean;
  onReveal: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  wordIndex: number;
  totalWords: number;
}

function MemoBadge({ word, mode, theme }: { word: Word; mode: "text" | "audio"; theme: ReturnType<typeof useTheme>["theme"] }) {
  const isMemorized = mode === "text" ? word.textMemorized : word.audioMemorized;
  const unmemorizedCount = mode === "text" ? (word.textUnmemorizedCount ?? 0) : (word.audioUnmemorizedCount ?? 0);

  if (isMemorized) {
    return (
      <View style={[styles.memoBadge, { backgroundColor: Colors.light.success + "20" }]}>
        <Feather name="check" size={11} color={Colors.light.success} />
        <ThemedText style={[styles.memoBadgeText, { color: Colors.light.success }]}>覚えた</ThemedText>
      </View>
    );
  }
  if (unmemorizedCount > 0) {
    return (
      <View style={[styles.memoBadge, { backgroundColor: Colors.light.alert + "20" }]}>
        <Feather name="flag" size={11} color={Colors.light.alert} />
        <ThemedText style={[styles.memoBadgeText, { color: Colors.light.alert }]}>覚えていない</ThemedText>
      </View>
    );
  }
  return (
    <View style={[styles.memoBadge, { backgroundColor: theme.backgroundSecondary }]}>
      <ThemedText style={[styles.memoBadgeText, { color: theme.textSecondary }]}>未学習</ThemedText>
    </View>
  );
}

function TextCard({ word, isRevealed, onReveal, theme, wordIndex, totalWords }: CardProps) {
  const origNum = getOriginalWordNum(word.id);
  return (
    <>
      <View style={styles.memoBadgeRow}>
        <MemoBadge word={word} mode="text" theme={theme} />
        <View style={styles.wordNumBadgeGroup}>
          {origNum > 0 ? (
            <View style={[styles.wordNumCircle, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}>
              <ThemedText style={[styles.wordNumCircleText, { color: theme.primary }]}>
                {origNum}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText style={[styles.wordNumBadge, { color: theme.textSecondary }]}>
            {wordIndex} / {totalWords}
          </ThemedText>
        </View>
      </View>
      <View style={styles.wordHeader}>
        <ThemedText style={styles.wordText}>{word.word}</ThemedText>
        <SpeakButton text={word.word} size="medium" />
      </View>
      <ThemedText style={[styles.pinyinText, { color: theme.primary }]}>
        {word.pinyin}
      </ThemedText>

      {isRevealed ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.translationText, { color: theme.textSecondary }]}>
            {word.translation}
          </ThemedText>
          {word.exampleSentence ? (
            <View style={styles.exampleSection}>
              <View style={styles.exampleRow}>
                <ThemedText style={[styles.exampleChinese, { color: theme.text }]}>
                  {word.exampleSentence}
                </ThemedText>
                <SpeakButton text={word.exampleSentence} size="small" />
              </View>
              <ThemedText style={[styles.exampleJp, { color: theme.textSecondary }]}>
                {word.exampleTranslation}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <Pressable
          testID="button-reveal-meaning"
          onPress={onReveal}
          style={[
            styles.revealButton,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <Feather name="eye" size={15} color={theme.textSecondary} />
          <ThemedText style={[styles.revealButtonText, { color: theme.textSecondary }]}>
            意味を確認する
          </ThemedText>
        </Pressable>
      )}
    </>
  );
}

function AudioCard({ word, isRevealed, onReveal, theme, wordIndex, totalWords }: CardProps) {
  const origNum = getOriginalWordNum(word.id);
  return (
    <>
      <View style={styles.memoBadgeRow}>
        <MemoBadge word={word} mode="audio" theme={theme} />
        <View style={styles.wordNumBadgeGroup}>
          {origNum > 0 ? (
            <View style={[styles.wordNumCircle, { backgroundColor: Colors.light.secondary + "18", borderColor: Colors.light.secondary + "40" }]}>
              <ThemedText style={[styles.wordNumCircleText, { color: Colors.light.secondary }]}>
                {origNum}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText style={[styles.wordNumBadge, { color: theme.textSecondary }]}>
            {wordIndex} / {totalWords}
          </ThemedText>
        </View>
      </View>
      {isRevealed ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <View style={styles.wordHeader}>
            <ThemedText style={styles.wordText}>{word.word}</ThemedText>
            <SpeakButton text={word.word} size="medium" />
          </View>
          <ThemedText style={[styles.pinyinText, { color: theme.primary }]}>
            {word.pinyin}
          </ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.translationText, { color: theme.textSecondary }]}>
            {word.translation}
          </ThemedText>
          {word.exampleSentence ? (
            <View style={styles.exampleSection}>
              <View style={styles.exampleRow}>
                <ThemedText style={[styles.exampleChinese, { color: theme.text }]}>
                  {word.exampleSentence}
                </ThemedText>
                <SpeakButton text={word.exampleSentence} size="small" />
              </View>
              <ThemedText style={[styles.exampleJp, { color: theme.textSecondary }]}>
                {word.exampleTranslation}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <Pressable
          testID="button-reveal-word"
          onPress={onReveal}
          style={styles.audioHiddenContent}
        >
          <View
            style={[
              styles.audioIconContainer,
              { backgroundColor: Colors.light.secondary + "18" },
            ]}
          >
            <SpeakButton text={word.word} size="large" />
          </View>
          <ThemedText style={[styles.pinyinTextCenter, { color: theme.primary }]}>
            {word.pinyin}
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
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  phaseHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  phaseLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  phaseBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  phaseBadgeText: { fontSize: 13, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  phaseStep: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  progress: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  progressBarWrapper: { marginBottom: Spacing.xl },
  wordCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.xl, minHeight: 160 },
  wordHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  wordText: { fontSize: 42, fontWeight: "700", fontFamily: "Nunito_700Bold", flex: 1 },
  pinyinText: { fontSize: 17, fontFamily: "Nunito_400Regular", marginBottom: Spacing.md },
  pinyinTextCenter: { fontSize: 20, fontFamily: "Nunito_400Regular", textAlign: "center" },
  divider: { height: 1, marginBottom: Spacing.md },
  translationText: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.md },
  exampleSection: { gap: Spacing.xs },
  exampleRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  exampleChinese: { fontSize: 15, fontFamily: "Nunito_400Regular", lineHeight: 22, flex: 1 },
  exampleJp: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 20 },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  revealButtonText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  memoBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xs },
  wordNumBadge: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  wordNumBadgeGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  wordNumCircle: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
  wordNumCircleText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  stampOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  stampCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  stampLabel: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    marginTop: 20,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  partialNotice: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.xl, width: "100%" },
  partialNoticeText: { fontSize: 13, fontFamily: "Nunito_400Regular", flex: 1, lineHeight: 20 },
  memoBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  memoBadgeText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  audioHiddenContent: { alignItems: "center", justifyContent: "center", gap: Spacing.lg, paddingVertical: Spacing.lg },
  audioIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  revealHint: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  revealHintText: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  choiceButtons: { flexDirection: "row", gap: Spacing.md },
  choiceButton: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 2, minHeight: 80 },
  choiceLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  completeContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing["3xl"] },
  completeIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl },
  completeTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: Spacing.sm, textAlign: "center" },
  completeSub: { fontSize: 15, fontFamily: "Nunito_400Regular", marginBottom: Spacing.xl, textAlign: "center" },
  resultStats: { flexDirection: "row", alignItems: "center", marginBottom: Spacing["2xl"], width: "100%", justifyContent: "center", gap: Spacing.xl },
  resultStat: { alignItems: "center", flex: 1 },
  resultValue: { fontSize: 36, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  resultLabel: { fontSize: 13, fontFamily: "Nunito_400Regular", marginTop: Spacing.xs },
  resultDivider: { width: 1, height: 40 },
  completeButton: { width: "100%" },
  audioStudyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, borderRadius: 999, borderWidth: 1.5, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  audioStudyText: { fontSize: 15, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", textAlign: "center", marginBottom: Spacing.sm },
  emptySub: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
});
