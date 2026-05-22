import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Image } from "react-native";
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

import { getSpecialPandaImage } from "@/data/pandaStamps";
import { getPandaName } from "@/data/pandaStampNames";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ConfettiAnimation from "@/components/ConfettiAnimation";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { SpeakButton } from "@/components/SpeakButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsMemorized, markAsUnmemorized, getSelectedHskLevel } from "@/lib/storage";
import { capture as captureAnalytics } from "@/lib/analytics";
import { speakChinese, stopSpeaking } from "@/lib/speech";
import { tryRequestReview } from "@/lib/reviewPrompt";
import { useSprint } from "@/contexts/SprintContext";
import { getQuoteForStamp } from "@/data/quotes";
import { useI18n } from "@/contexts/LanguageContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;
type RouteProps = RouteProp<SprintStackParamList, "SprintTest">;
type RevealLevel = 0 | 1 | 2;

const PASS_PERCENTAGE = 85;

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
  const { t } = useI18n();
  const hasBadge = (word.audioUnmemorizedCount || 0) > 0;
  return (
    <View style={cardStyles.root}>
      <View style={cardStyles.topRow}>
        {hasBadge ? (
          <View style={[cardStyles.badge, { backgroundColor: Colors.light.alert + "22" }]}>
            <ThemedText style={[cardStyles.badgeText, { color: Colors.light.alert }]}>
              苦手 {word.audioUnmemorizedCount}回
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
          <Feather name="volume-2" size={32} color={theme.primary} />
          <ThemedText style={[cardStyles.hiddenHint, { color: theme.textSecondary }]}>{t("listen_audio")}</ThemedText>
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

interface ReviewWordRowProps {
  word: Word;
  showMeaning: boolean;
  hideChinese: boolean;
  onToggleMeaning: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function maskChinese(text: string): string {
  return text.replace(/[\u3400-\u9FFF\uF900-\uFAFF]/g, "？");
}

function ReviewWordRow({
  word,
  showMeaning,
  hideChinese,
  onToggleMeaning,
  theme,
}: ReviewWordRowProps) {
  const { t } = useI18n();
  const wordDisplay = hideChinese ? maskChinese(word.word) : word.word;
  const sentenceDisplay = hideChinese
    ? maskChinese(word.exampleSentence)
    : word.exampleSentence;

  return (
    <View
      style={[
        reviewStyles.row,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View style={reviewStyles.rowMain}>
        <ThemedText style={reviewStyles.rowWord}>{wordDisplay}</ThemedText>
        {!hideChinese && word.pinyin ? (
          <ThemedText style={[reviewStyles.rowPinyin, { color: theme.textSecondary }]}>
            {word.pinyin}
          </ThemedText>
        ) : null}
        {word.exampleSentence ? (
          <ThemedText
            style={[reviewStyles.rowSentence, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {sentenceDisplay}
          </ThemedText>
        ) : null}
        <View style={reviewStyles.rowActions}>
          <Pressable
            testID={`button-toggle-meaning-${word.id}`}
            onPress={onToggleMeaning}
            style={[
              reviewStyles.toggleChip,
              { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
            hitSlop={6}
          >
            <Feather name={showMeaning ? "eye-off" : "eye"} size={12} color={theme.textSecondary} />
            <ThemedText style={[reviewStyles.toggleChipLabel, { color: theme.textSecondary }]}>
              {showMeaning ? t("review_hide_meaning") : t("review_show_meaning")}
            </ThemedText>
          </Pressable>
          <SpeakButton
            text={word.exampleSentence ? `${word.word}。${word.exampleSentence}` : word.word}
            size="small"
            wordId={word.id}
          />
        </View>
      </View>
      {showMeaning ? (
        <View
          style={[
            reviewStyles.meaningBox,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <ThemedText style={reviewStyles.meaningTranslation}>{word.translation}</ThemedText>
          {word.exampleTranslation ? (
            <ThemedText style={[reviewStyles.meaningExample, { color: theme.textSecondary }]}>
              {word.exampleTranslation}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface ReviewWordListProps {
  words: Word[];
  theme: ReturnType<typeof useTheme>["theme"];
}

function ReviewWordList({ words, theme }: ReviewWordListProps) {
  const { t } = useI18n();
  const [meaningRevealed, setMeaningRevealed] = useState<Set<string>>(new Set());
  const [allChineseHidden, setAllChineseHidden] = useState(false);

  return (
    <View>
      <View style={reviewStyles.listHeader}>
        <Pressable
          testID="button-toggle-all-chinese"
          onPress={() => setAllChineseHidden((v) => !v)}
          style={[
            reviewStyles.toggleChip,
            { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
          ]}
          hitSlop={6}
        >
          <Feather
            name={allChineseHidden ? "unlock" : "lock"}
            size={12}
            color={theme.textSecondary}
          />
          <ThemedText style={[reviewStyles.toggleChipLabel, { color: theme.textSecondary }]}>
            {allChineseHidden ? t("review_show_chinese") : t("review_hide_chinese")}
          </ThemedText>
        </Pressable>
      </View>
      <View style={reviewStyles.list}>
        {words.map((w) => (
          <ReviewWordRow
            key={w.id}
            word={w}
            showMeaning={meaningRevealed.has(w.id)}
            hideChinese={allChineseHidden}
            onToggleMeaning={() => {
              const next = new Set(meaningRevealed);
              if (next.has(w.id)) next.delete(w.id); else next.add(w.id);
              setMeaningRevealed(next);
            }}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  listHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  list: { gap: Spacing.xs },
  row: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rowWord: { fontSize: 17, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  rowPinyin: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  rowSentence: { flex: 1, fontSize: 13, fontFamily: "Nunito_400Regular" },
  rowActions: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  meaningBox: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 2,
  },
  meaningTranslation: { fontSize: 14, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  meaningExample: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  toggleChipLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
});

const cardStyles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, gap: Spacing.xl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  badgePlaceholder: { width: 1, height: 20 },
  counter: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  chinese: { fontSize: 44, lineHeight: 62, fontWeight: "400", includeFontPadding: false, textAlignVertical: "center", paddingVertical: 4 },
  pinyin: { fontSize: 17, fontFamily: "Nunito_400Regular", marginTop: Spacing.xs },
  hiddenPlaceholder: { alignItems: "center", paddingVertical: Spacing["2xl"], gap: Spacing.sm },
  hiddenHint: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  meaningBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.xs },
  translation: { fontSize: 22, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  example: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  exampleJa: { fontSize: 13, fontFamily: "Nunito_400Regular" },
});

export default function SprintTestScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const retakeCellIndex = route.params?.cellIndex;
  const isRetake = route.params?.retake === true;
  const forceReview = route.params?.forceReview === true;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const { theme } = useTheme();
  const {
    completeSession,
    getTestWords,
    sprintData,
    currentLevel,
    getCellTestUnmemorized,
    saveCellTestUnmemorized,
    getCellTestAttempts,
    incrementCellTestAttempts,
  } = useSprint();

  type Phase = "pre-review-confirm" | "pre-review" | "test" | "post-review" | "result";
  const [phase, setPhase] = useState<Phase>("test");
  const [cardWords, setCardWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealLevel, setRevealLevel] = useState<RevealLevel>(0);
  const [choices, setChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [preReviewWords, setPreReviewWords] = useState<Word[]>([]);
  const [postReviewWords, setPostReviewWords] = useState<Word[]>([]);
  const isCompleted = phase === "result";

  // Capture cell index before completeSession advances position
  const testCellIndexRef = useRef<number>(sprintData?.currentPosition ?? 1);

  const stampScale = useSharedValue(0);
  const stampOpacity = useSharedValue(0);
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampScale.value }],
    opacity: stampOpacity.value,
  }));

  const stampDoneRef = useRef<(() => void) | null>(null);
  const triggerStamp = (onDone: () => void) => {
    stampDoneRef.current = onDone;
    setStampVisible(true);
    setConfettiVisible(true);
    stampScale.value = 0;
    stampOpacity.value = 0;
    stampScale.value = withSequence(
      withTiming(1.25, { duration: 280 }),
      withTiming(1.0, { duration: 140 })
    );
    stampOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setStampVisible)(false);
          if (onDone) runOnJS(onDone)();
        }
      })
    );
    setTimeout(() => setConfettiVisible(false), 3500);
  };

  const handleCloseStamp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const done = stampDoneRef.current;
    stampOpacity.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) {
        runOnJS(setStampVisible)(false);
        if (done) runOnJS(done)();
      }
    });
  };

  // Stable refs to context callbacks so load() does not re-trigger when
  // sprintData updates recreate them. We only want load() to run once per
  // screen mount.
  const getTestWordsRef = useRef(getTestWords);
  const getCellTestUnmemorizedRef = useRef(getCellTestUnmemorized);
  const getCellTestAttemptsRef = useRef(getCellTestAttempts);
  const incrementCellTestAttemptsRef = useRef(incrementCellTestAttempts);
  useEffect(() => { getTestWordsRef.current = getTestWords; }, [getTestWords]);
  useEffect(() => { getCellTestUnmemorizedRef.current = getCellTestUnmemorized; }, [getCellTestUnmemorized]);
  useEffect(() => { getCellTestAttemptsRef.current = getCellTestAttempts; }, [getCellTestAttempts]);
  useEffect(() => { incrementCellTestAttemptsRef.current = incrementCellTestAttempts; }, [incrementCellTestAttempts]);

  // One-time guard: ensures load() (and the attempt increment inside it) runs
  // exactly once per screen visit even if React re-invokes the effect.
  const loadStartedRef = useRef(false);

  useEffect(() => {
    if (loadStartedRef.current) return;
    // Wait for sprint context to finish loading so attempts/unmemorized
    // history are available; without this guard a fast mount could see an
    // empty SprintData and skip pre-review erroneously.
    if (!sprintData) return;
    loadStartedRef.current = true;
    // Capture the cell index now that sprintData is ready. When the user is
    // re-attempting a previously cleared test, the cell index comes from the
    // navigation params; otherwise we fall back to the current position.
    testCellIndexRef.current = typeof retakeCellIndex === "number" ? retakeCellIndex : sprintData.currentPosition;
    (async () => {
      await initializeData();
      const allWords = await getWords();
      const testWords = getTestWordsRef.current(allWords, testCellIndexRef.current);
      setCardWords(shuffleArray(testWords));
      const cellIdx = testCellIndexRef.current;
      const attempts = getCellTestAttemptsRef.current(cellIdx);
      const prevUnmemIds = getCellTestUnmemorizedRef.current(cellIdx);
      // 再挑戦時は pre-review をスキップしてクリーンに再挑戦できるようにする。
      // forceReview (「復習を見る」から遷移) 時は逆に復習を強制表示する。
      if ((forceReview || !isRetake) && attempts >= 1 && prevUnmemIds.length > 0) {
        const idSet = new Set(prevUnmemIds);
        const prev = allWords.filter((w) => idSet.has(w.id));
        if (prev.length > 0) {
          setPreReviewWords(prev);
          setPhase("pre-review-confirm");
          setLoading(false);
          return;
        }
      }
      // Going straight into the test counts as starting a new attempt.
      // 再挑戦時はカウントしない（既存の attempts/unmemorized 統計を保護）。
      if (!isRetake && testWords.length > 0) {
        await incrementCellTestAttemptsRef.current(cellIdx).catch(() => {});
      }
      setPhase("test");
      setLoading(false);
    })();
  }, [sprintData]);

  const currentWord = cardWords[currentIndex] ?? null;
  const progress = cardWords.length > 0 ? ((currentIndex + 1) / cardWords.length) * 100 : 0;

  // Auto-play audio when card changes
  const lastSpokenIndex = useRef(-1);
  useEffect(() => {
    if (loading || !currentWord || phase !== "test") return;
    if (lastSpokenIndex.current === currentIndex) return;
    lastSpokenIndex.current = currentIndex;
    const text = currentWord.exampleSentence
      ? `${currentWord.word}。${currentWord.exampleSentence}`
      : currentWord.word;
    speakChinese(text, { wordId: currentWord.id });
  }, [currentIndex, loading, currentWord, phase]);

  // Reset reveal when card changes
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
    const hskLevel = await getSelectedHskLevel();
    captureAnalytics("sprint_test_answer", {
      word_id: currentWord.id,
      hsk_level: hskLevel,
      correct: choice === "memorized",
      choice,
      index: currentIndex,
      total: cardWords.length,
    });
    if (currentIndex < cardWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const memorized =
        Object.values({ ...choices, [currentWord.id]: choice }).filter(
          (c) => c === "memorized"
        ).length;
      const total = cardWords.length;
      const accuracy = total > 0 ? memorized / total : 0;
      const percentage = Math.round(accuracy * 100);
      captureAnalytics(
        "sprint_test_completed",
        {
          hsk_level: hskLevel,
          memorized,
          total,
          accuracy,
          percentage,
          passed: percentage >= PASS_PERCENTAGE,
        },
        { important: true },
      );
      // Persist this attempt's unmemorized list for next-time pre-review and
      // for the post-review screen we are about to show. Awaited so it
      // commits to AsyncStorage before any subsequent writer (e.g.
      // completeSession invoked from the result screen) reads/writes the
      // sprint blob.
      const finalChoices = { ...choices, [currentWord.id]: choice };
      const unmemIds = cardWords
        .filter((w) => finalChoices[w.id] === "unmemorized")
        .map((w) => w.id);
      try {
        await saveCellTestUnmemorized(testCellIndexRef.current, unmemIds);
      } catch {
        // Persistence failure is non-fatal; continue with UI flow.
      }
      if (unmemIds.length > 0) {
        const idSet = new Set(unmemIds);
        setPostReviewWords(cardWords.filter((w) => idSet.has(w.id)));
        stopSpeaking().catch(() => {});
        setPhase("post-review");
      } else {
        setPhase("result");
      }
    }
  };

  const handleFinish = async (cleared: boolean, fromTest: boolean = true) => {
    // 再挑戦の場合は進捗を更新せず、スタンプも再付与しない。
    // 単に SprintHome に戻すだけ（合格時のお祝いスタンプ演出のみ表示）。
    if (isRetake) {
      if (cleared) {
        triggerStamp(() => navigation.navigate("SprintHome"));
      } else {
        navigation.navigate("SprintHome");
      }
      return;
    }
    if (cleared) {
      setCompleting(true);
      await completeSession(true);
      setCompleting(false);
      triggerStamp(() => navigation.navigate("SprintHome"));
      // Only trigger review on a genuine test pass, not the auto-clear/skip path.
      if (fromTest) {
        setTimeout(() => {
          tryRequestReview("sprint_test_pass").catch(() => {});
        }, 2000);
      }
    } else {
      navigation.navigate("SprintHome");
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("preparing_test")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (phase === "pre-review-confirm") {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <View style={[styles.infoBadge, { backgroundColor: Colors.light.alert + "20", marginBottom: Spacing.lg }]}>
            <Feather name="rotate-ccw" size={13} color={Colors.light.alert} />
            <ThemedText style={[styles.infoBadgeText, { color: Colors.light.alert }]}>
              {t("pre_review_title")}
            </ThemedText>
          </View>
          <ThemedText style={styles.emptyTitle}>{t("pre_review_confirm_title")}</ThemedText>
          <ThemedText style={[styles.reviewSubtitle, { color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.xl }]}>
            {t("pre_review_confirm_body_prefix")}{" "}{preReviewWords.length}{" "}{t("pre_review_confirm_body_suffix")}
          </ThemedText>
          <Button
            testID="button-confirm-pre-review"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPhase("pre-review");
            }}
            style={styles.actionButton}
          >
            {t("pre_review_confirm_yes")}
          </Button>
          <Pressable
            testID="button-skip-pre-review"
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const cellIdx = sprintData?.currentPosition ?? testCellIndexRef.current;
              await incrementCellTestAttempts(cellIdx).catch(() => {});
              setPhase("test");
            }}
            style={styles.skipButton}
            hitSlop={8}
          >
            <ThemedText style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              {t("pre_review_confirm_skip")}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (phase === "pre-review") {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
          ]}
        >
          <View style={styles.reviewHeader}>
            <View style={[styles.infoBadge, { backgroundColor: Colors.light.alert + "20" }]}>
              <Feather name="rotate-ccw" size={13} color={Colors.light.alert} />
              <ThemedText style={[styles.infoBadgeText, { color: Colors.light.alert }]}>
                {t("pre_review_title")}
              </ThemedText>
            </View>
            <ThemedText style={[styles.reviewSubtitle, { color: theme.textSecondary }]}>
              {t("pre_review_subtitle")}
            </ThemedText>
          </View>
          <ReviewWordList words={preReviewWords} theme={theme} />
          <Button
            testID="button-start-test-after-review"
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const cellIdx = sprintData?.currentPosition ?? testCellIndexRef.current;
              await incrementCellTestAttempts(cellIdx).catch(() => {});
              setPhase("test");
            }}
            style={styles.actionButton}
          >
            {t("start_test_after_review")}
          </Button>
        </ScrollView>
      </ThemedView>
    );
  }

  if (cardWords.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={styles.emptyTitle}>{t("no_test_words")}</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("no_prev_words")}
          </ThemedText>
          <Button onPress={() => handleFinish(true, false)} style={styles.actionButton}>
            {t("clear_and_continue")}
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (phase === "post-review") {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
          ]}
        >
          <View style={styles.reviewHeader}>
            <View style={[styles.infoBadge, { backgroundColor: Colors.light.alert + "20" }]}>
              <Feather name="bookmark" size={13} color={Colors.light.alert} />
              <ThemedText style={[styles.infoBadgeText, { color: Colors.light.alert }]}>
                {t("post_review_title")}
              </ThemedText>
            </View>
            <ThemedText style={[styles.reviewSubtitle, { color: theme.textSecondary }]}>
              {t("post_review_subtitle")}
            </ThemedText>
          </View>
          <ReviewWordList words={postReviewWords} theme={theme} />
          <Button
            testID="button-continue-to-result"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPhase("result");
            }}
            style={styles.actionButton}
          >
            {t("continue_to_result")}
          </Button>
        </ScrollView>
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
            <Pressable
              testID="button-close-stamp-modal"
              onPress={handleCloseStamp}
              hitSlop={12}
              style={styles.stampCloseButton}
            >
              <Feather name="x" size={26} color="#fff" />
            </Pressable>
            <ThemedText style={styles.stampLabel}>{t("special_stamp_acquired")}</ThemedText>
            <View style={[styles.stampCircle, { backgroundColor: Colors.light.alert, borderWidth: 4, borderColor: "#fff" }]}>
              <Image source={getSpecialPandaImage(testCellIndexRef.current, currentLevel)} style={{ width: 148, height: 148, borderRadius: 74 }} resizeMode="cover" />
            </View>
            <ThemedText style={styles.stampName} numberOfLines={2}>
              {getPandaName(testCellIndexRef.current, true, currentLevel)}
            </ThemedText>
          </Animated.View>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.resultScrollContent, { paddingTop: safeHeaderPadding + Spacing.xl }]}
        >
          <Animated.View entering={FadeIn} style={styles.resultInner}>
            <View style={[styles.scoreCircle, { borderColor: cleared ? Colors.light.success : Colors.light.alert }]}>
              <ThemedText style={styles.scorePercentage}>{percentage}%</ThemedText>
              <ThemedText style={[styles.scoreLabel, { color: theme.textSecondary }]}>{t("memorized_rate")}</ThemedText>
            </View>
            {cleared ? (
              <View style={[styles.specialStampBadge, { backgroundColor: Colors.light.success + "20" }]}>
                <Feather name="star" size={20} color={Colors.light.success} />
                <ThemedText style={[styles.specialStampText, { color: Colors.light.success }]}>
                  {t("special_stamp_acquired")}
                </ThemedText>
              </View>
            ) : null}
            <ThemedText style={styles.resultTitle}>
              {cleared ? t("test_passed") : t("test_failed")}
            </ThemedText>
            <ThemedText style={[styles.passInfo, { color: theme.textSecondary }]}>
              {t("pass_line")}: {PASS_PERCENTAGE}%
            </ThemedText>
            <ThemedText style={[styles.resultStats, { color: theme.textSecondary }]}>
              {t("words_memorized_count").replace("{memorized}", String(memorized)).replace("{total}", String(total))}
            </ThemedText>
            {cleared ? (() => {
              const q = getQuoteForStamp(testCellIndexRef.current, currentLevel);
              if (!q) return null;
              return (
                <View style={[styles.quoteCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText style={styles.quoteFlag}>{q.flag}</ThemedText>
                  <ThemedText style={styles.quoteText}>{q.chinese}</ThemedText>
                  {q.pinyin ? (
                    <ThemedText style={[styles.quotePinyin, { color: theme.textSecondary }]}>{q.pinyin}</ThemedText>
                  ) : null}
                  <ThemedText style={[styles.quoteJa, { color: theme.textSecondary }]}>{q.japanese}</ThemedText>
                  <ThemedText style={[styles.quoteSource, { color: theme.textSecondary }]}>— {q.source}</ThemedText>
                </View>
              );
            })() : null}
            <Button
              testID="button-finish-test"
              onPress={() => handleFinish(cleared)}
              disabled={completing}
              style={styles.actionButton}
            >
              {completing ? t("saving") : cleared ? t("get_stamp") : t("next_step")}
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
          { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <View style={styles.progressSection}>
          <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {cardWords.length}
          </ThemedText>
          <ProgressBar progress={progress} height={6} />
        </View>

        <View style={[styles.infoBar]}>
          <View style={[styles.infoBadge, { backgroundColor: "#7C3AED20" }]}>
            <Feather name="layers" size={13} color="#7C3AED" />
            <ThemedText style={[styles.infoBadgeText, { color: "#7C3AED" }]}>{t("audio_test_badge")}</ThemedText>
          </View>
          <Pressable
            testID="button-replay-audio"
            onPress={() => {
              const text = currentWord.exampleSentence
                ? `${currentWord.word}。${currentWord.exampleSentence}`
                : currentWord.word;
              speakChinese(text, { wordId: currentWord.id });
            }}
            style={[styles.replayButton, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}
          >
            <Feather name="volume-2" size={16} color={theme.primary} />
            <ThemedText style={[styles.replayLabel, { color: theme.primary }]}>{t("replay")}</ThemedText>
          </Pressable>
        </View>

        <Animated.View
          key={`test-${currentIndex}-${revealLevel}`}
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
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>{t("choice_not_memorized")}</ThemedText>
              </Pressable>
              <Pressable
                testID="button-memorized"
                onPress={() => handleCardChoice("memorized")}
                style={[styles.choiceButton, { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success }]}
              >
                <Feather name="check" size={20} color={Colors.light.success} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>{t("choice_memorized")}</ThemedText>
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
                {revealLevel === 0 ? t("see_character") : t("see_meaning")}
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
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>{t("choice_memorized")}</ThemedText>
            </Pressable>
            <Pressable
              testID="button-unmemorized"
              onPress={() => handleCardChoice("unmemorized")}
              style={[styles.choiceButton, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert }]}
            >
              <Feather name="flag" size={20} color={Colors.light.alert} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>{t("not_yet")}</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ConfettiAnimation visible={confettiVisible} />
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
  reviewHeader: { gap: Spacing.sm, marginBottom: Spacing.lg },
  reviewSubtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", lineHeight: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
  actionButton: { width: "100%", marginTop: Spacing.xl },
  skipButton: { marginTop: Spacing.lg, paddingVertical: Spacing.sm, alignItems: "center" },
  skipButtonText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  resultContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  resultScrollContent: { flexGrow: 1, paddingHorizontal: Spacing["3xl"], paddingBottom: Spacing["3xl"] },
  resultInner: { alignItems: "center", width: "100%" },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 6,
    justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl,
    overflow: "visible",
  },
  scorePercentage: { fontSize: 34, lineHeight: 44, fontWeight: "700", fontFamily: "Nunito_700Bold", textAlign: "center", includeFontPadding: false },
  scoreLabel: { fontSize: 14, lineHeight: 18, fontFamily: "Nunito_400Regular", textAlign: "center", includeFontPadding: false },
  specialStampBadge: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, marginBottom: Spacing.lg,
  },
  specialStampText: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  resultTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: Spacing.sm, textAlign: "center" },
  passInfo: { fontSize: 13, fontFamily: "Nunito_400Regular", marginBottom: Spacing.sm },
  resultStats: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.xl },
  stampOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", gap: Spacing.xl,
  },
  stampCircle: { width: 160, height: 160, borderRadius: 80, justifyContent: "center", alignItems: "center" },
  stampLabel: { fontSize: 26, fontWeight: "700", fontFamily: "Nunito_700Bold", color: "#fff" },
  stampName: { fontSize: 30, fontWeight: "700", fontFamily: "Nunito_700Bold", color: "#fff", textAlign: "center", paddingHorizontal: Spacing.xl, marginTop: Spacing.xs },
  stampCloseButton: {
    position: "absolute", top: 60, right: 24, width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center",
  },
  quoteCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.md, width: "100%", alignItems: "center", gap: Spacing.xs },
  quoteFlag: { fontSize: 28 },
  quoteText: { fontSize: 15, fontFamily: "Nunito_700Bold", textAlign: "center" },
  quotePinyin: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center" },
  quoteJa: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  quoteSource: { fontSize: 12, fontFamily: "Nunito_400Regular", textAlign: "right", alignSelf: "flex-end", marginTop: Spacing.xs },
});
