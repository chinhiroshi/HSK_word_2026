import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ConfettiAnimation from "@/components/ConfettiAnimation";
import { ProgressBar } from "@/components/ProgressBar";
import { SpeakButton } from "@/components/SpeakButton";
import { InlinePronunciationEvaluator } from "@/components/InlinePronunciationEvaluator";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import {
  getAudioRepeatPreference,
  getWords,
  initializeData,
  markAsMemorized,
  markAsUnmemorized,
  saveAudioCardsHistory,
  setAudioRepeatPreference,
  type AudioRepeatCount,
} from "@/lib/storage";
import { speakChinese, stopSpeaking } from "@/lib/speech";
import { playPassSfx, playFailSfx } from "@/lib/sfx";
import { useSprint } from "@/contexts/SprintContext";
import { getQuoteForStamp } from "@/data/quotes";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getPandaImage } from "@/data/pandaStamps";
import { getPandaName } from "@/data/pandaStampNames";

type RouteProps = RouteProp<SprintStackParamList, "SprintStudySession">;
type NavigationProp = NativeStackNavigationProp<SprintStackParamList & RootStackParamList>;

type AudioCardsRoundResult = { round: number; memorized: number; total: number; isFinalCleanup: boolean };
type AudioCardsSummary = {
  rounds: AudioCardsRoundResult[];
  unmemorized: Word[];
  passed: boolean;
};

type Phase = "text-list" | "text-review" | "audio-list" | "audio-review" | "audio-cards" | "complete";
// 0 = audio only, 1 = kanji revealed, 2 = meaning revealed
type RevealLevel = 0 | 1 | 2;
type ListFilter = "all" | "memorized" | "unmemorized" | "struggled";

export default function SprintStudySessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { sprintData, completePhase, getStudyWords, getCellPhaseProgress, currentLevel } = useSprint();

  const sessionMode = route.params?.mode ?? "study";
  const cellIndex = route.params?.cellIndex;

  const initialPhase: Phase =
    sessionMode === "audio-cards-only" ? "audio-cards" :
    sessionMode === "audio-only" ? "audio-list" :
    "text-list";

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [words, setWords] = useState<Word[]>([]);
  const [cardWords, setCardWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealLevel, setRevealLevel] = useState<RevealLevel>(0);
  const [textChoices, setTextChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  const [audioChoices, setAudioChoices] = useState<Record<string, "memorized" | "unmemorized">>({});
  // Refs mirror the latest choices synchronously to avoid stale-closure races
  // when the user taps a flag and immediately presses 完了.
  const textChoicesRef = useRef<Record<string, "memorized" | "unmemorized">>({});
  const audioChoicesRef = useRef<Record<string, "memorized" | "unmemorized">>({});
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  // Audio-list 2nd reveal level (per-row): show translation/example translation
  const [audioMeaningRevealedIds, setAudioMeaningRevealedIds] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false); // true = hide Chinese characters in text-list
  const [translationRevealedIds, setTranslationRevealedIds] = useState<Set<string>>(new Set());
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isPartialComplete, setIsPartialComplete] = useState(false);
  const [listBarHeight, setListBarHeight] = useState(130);
  const [stampVisible, setStampVisible] = useState(false);
  const [showPostStamp, setShowPostStamp] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const autoSavedPhase = useRef<string | null>(null);
  const [audioRepeat, setAudioRepeatState] = useState<AudioRepeatCount>(2);
  const [requeueNotice, setRequeueNotice] = useState<{ kind: "fail" | "pass"; round: number } | null>(null);
  const [pendingChoice, setPendingChoice] = useState<null | "memorized" | "unmemorized">(null);
  const roundRef = useRef(1);
  const finalCleanupRef = useRef(false);
  const roundOriginalRef = useRef<Word[]>([]);
  const roundChoicesRef = useRef<Record<string, "memorized" | "unmemorized">>({});
  const roundResultsRef = useRef<AudioCardsRoundResult[]>([]);
  const [audioCardsSummary, setAudioCardsSummary] = useState<AudioCardsSummary | null>(null);
  const cardChoiceInFlightRef = useRef(false);
  const [failOverlayVisible, setFailOverlayVisible] = useState(false);
  const failOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingCleanupWords, setPendingCleanupWords] = useState<Word[] | null>(null);
  // Hidden bulk-complete: triple-tap the audio-learning badge within 1.5s to
  // mark the current card and all remaining cards as memorized and end session.
  const BADGE_TAP_WINDOW_MS = 1500;
  const BADGE_TAP_REQUIRED = 3;
  const badgeTapCountRef = useRef(0);
  const badgeTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (failOverlayTimerRef.current) {
        clearTimeout(failOverlayTimerRef.current);
        failOverlayTimerRef.current = null;
      }
      if (badgeTapTimerRef.current) {
        clearTimeout(badgeTapTimerRef.current);
        badgeTapTimerRef.current = null;
      }
    };
  }, []);

  const stampScale = useSharedValue(0);
  const stampOpacity = useSharedValue(0);
  const bannerOpacity = useSharedValue(0);
  const bannerScale = useSharedValue(0.92);
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampScale.value }],
    opacity: stampOpacity.value,
  }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ scale: bannerScale.value }],
  }));

  useEffect(() => {
    if (!requeueNotice) {
      bannerOpacity.value = 0;
      bannerScale.value = 0.92;
      return;
    }
    bannerOpacity.value = 0;
    bannerScale.value = 0.92;
    bannerOpacity.value = withTiming(1, { duration: 220 });
    bannerScale.value = withSequence(
      withTiming(1.06, { duration: 220 }),
      withTiming(1, { duration: 180 })
    );
    if (requeueNotice.kind === "fail") {
      playFailSfx();
    } else {
      playPassSfx();
    }
  }, [requeueNotice, bannerOpacity, bannerScale]);

  const triggerStamp = (onDone: () => void) => {
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
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
    setTimeout(() => setConfettiVisible(false), 3200);
  };

  const isAudioPhase = phase === "audio-cards" || phase === "audio-list" || phase === "audio-review";

  const currentCardWord = cardWords[currentIndex] ?? null;
  const cardProgress = cardWords.length > 0 ? (currentIndex / cardWords.length) * 100 : 0;

  const badgeLabel = isAudioPhase ? t("badge_audio_learning") : t("badge_text_learning");
  const badgeColor = isAudioPhase ? Colors.light.secondary : theme.primary;
  const badgeBg = isAudioPhase ? Colors.light.secondary + "20" : theme.primary + "20";
  const badgeIcon: keyof typeof Feather.glyphMap = isAudioPhase ? "headphones" : "book-open";

  const totalChoices = { ...textChoices, ...audioChoices };
  const memorizedCount = Object.values(totalChoices).filter((c) => c === "memorized").length;
  const totalCount = Object.keys(totalChoices).length;

  // 単語IDベースで「長文を使う対象」を決定。音声カードと音声リストで同じ単語が長文になるよう
  // sprint の words 配列の並び順を基準に shouldUseLongExample を適用する。
  const longExampleWordIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < words.length; i++) {
      if (shouldUseLongExample(i, words.length) && words[i].longExample && words[i].longExample!.trim().length > 0) {
        set.add(words[i].id);
      }
    }
    return set;
  }, [words]);

  const loadWords = useCallback(async () => {
    setLoading(true);
    await initializeData();
    const allWords = await getWords();
    const study = getStudyWords(allWords, cellIndex);
    setWords(study);

    // Pre-populate choices based on existing study/audio tab progress
    const initText: Record<string, "memorized" | "unmemorized"> = {};
    const initAudio: Record<string, "memorized" | "unmemorized"> = {};
    study.forEach((w) => {
      if (w.textMemorized) initText[w.id] = "memorized";
      else if ((w.textUnmemorizedCount ?? 0) > 0) initText[w.id] = "unmemorized";
      if (w.audioMemorized) initAudio[w.id] = "memorized";
      else if ((w.audioUnmemorizedCount ?? 0) > 0) initAudio[w.id] = "unmemorized";
    });
    setTextChoices(initText);
    setAudioChoices(initAudio);
    textChoicesRef.current = initText;
    audioChoicesRef.current = initAudio;

    // Load audio repeat preference (1 or 2)
    try {
      const repeat = await getAudioRepeatPreference();
      setAudioRepeatState(repeat);
    } catch {}

    if (sessionMode === "audio-cards-only") {
      // Start directly at audio-cards with ALL sprint words (no audioMemorized filter), shuffled
      roundOriginalRef.current = study;
      roundChoicesRef.current = {};
      roundRef.current = 1;
      finalCleanupRef.current = false;
      roundResultsRef.current = [];
      setAudioCardsSummary(null);
      const shuffled = shuffleArray(study);
      setCardWords(shuffled);
      setCurrentIndex(0);
      setRevealLevel(0);
      setPendingChoice(null);
      setRequeueNotice(null);
      setPendingCleanupWords(null);
    }
    setLoading(false);
  }, [sessionMode, cellIndex, getStudyWords]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // Auto-save when complete
  useEffect(() => {
    if (phase !== "complete") return;
    const key = `${sessionMode}-${cellIndex ?? "default"}`;
    if (autoSavedPhase.current === key) return;
    autoSavedPhase.current = key;
    const phaseArg: "text" | "audio" | "audioCards" =
      sessionMode === "audio-only" ? "audio" :
      sessionMode === "audio-cards-only" ? "audioCards" : "text";
    completePhase(phaseArg, cellIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // カード切替時のみ reveal レベルをリセット (×1/×2 トグルでは維持)
  useEffect(() => {
    if (phase !== "audio-cards") return;
    setRevealLevel(0);
    setPendingChoice(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, phase, currentCardWord?.id]);

  // Auto-play audio in audio-cards (repeat 切替でも再生し直す)
  useEffect(() => {
    if (phase !== "audio-cards") return;
    if (!currentCardWord) return;
    const useLong = longExampleWordIds.has(currentCardWord.id);
    const speak = async () => {
      const text = getAudioCardsSpeakText(currentCardWord, audioRepeat, useLong);
      await speakChinese(text, { wordId: currentCardWord.id });
    };
    speak();
    return () => {
      stopSpeaking().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, phase, currentCardWord?.id, audioRepeat, cardWords.length]);

  // Reset per-row reveal state when switching filter tabs (全部 / まだ / 覚えた / 苦手歴)
  // so that meanings/words shown via the eye icon don't carry over across tabs.
  useEffect(() => {
    setRevealedIds(new Set());
    setAudioMeaningRevealedIds(new Set());
    setTranslationRevealedIds(new Set());
  }, [listFilter]);

  // Dynamic header: eye button for list phases → toggle hide/show Chinese characters
  useEffect(() => {
    if (phase === "text-list" || phase === "text-review" || phase === "audio-list" || phase === "audio-review") {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setAllRevealed((prev) => !prev)}
            style={{ marginRight: 4, padding: 8 }}
          >
            <Feather
              name={allRevealed ? "eye-off" : "eye"}
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({ headerRight: undefined });
    }
  }, [phase, allRevealed, theme, navigation]);

  const handleChoiceList = async (wordId: string, choice: "memorized" | "unmemorized") => {
    Haptics.impactAsync(
      choice === "memorized"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    const type = isAudioPhase ? "audio" : "text";
    // Update ref synchronously BEFORE the await so any concurrent press of 完了
    // sees the latest choice and won't overwrite it via auto-mark.
    if (type === "audio") {
      audioChoicesRef.current = { ...audioChoicesRef.current, [wordId]: choice };
    } else {
      textChoicesRef.current = { ...textChoicesRef.current, [wordId]: choice };
    }
    await (choice === "memorized"
      ? markAsMemorized(wordId, type)
      : markAsUnmemorized(wordId, type));
    if (isAudioPhase) {
      setAudioChoices((prev) => ({ ...prev, [wordId]: choice }));
    } else {
      setTextChoices((prev) => ({ ...prev, [wordId]: choice }));
    }
  };

  const handleListNext = async () => {
    // Note: We intentionally do NOT auto-mark unmarked words as memorized.
    // The user explicitly chooses memorized (check) or unmemorized (flag);
    // anything left untouched keeps its previous state.
    if (phase === "text-list") {
      const hasUnmemorized = words.some((w) => textChoicesRef.current[w.id] === "unmemorized");
      if (hasUnmemorized) {
        setListFilter("unmemorized");
        setPhase("text-review");
      } else {
        setPhase("complete");
      }
    } else if (phase === "text-review") {
      setListFilter("all");
      setPhase("complete");
    } else if (phase === "audio-list") {
      const hasUnmemorized = words.some((w) => audioChoicesRef.current[w.id] === "unmemorized");
      if (hasUnmemorized) {
        setListFilter("unmemorized");
        setPhase("audio-review");
      } else {
        setPhase("complete");
      }
    } else if (phase === "audio-review") {
      setListFilter("all");
      setPhase("complete");
    }
  };

  const buildAudioCardsSummary = (passed: boolean): AudioCardsSummary => {
    const allChoices = audioChoicesRef.current;
    const seen = new Set<string>();
    const unmemorized: Word[] = [];
    for (const w of roundOriginalRef.current) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      if (allChoices[w.id] !== "memorized") unmemorized.push(w);
    }
    const summary: AudioCardsSummary = {
      rounds: [...roundResultsRef.current],
      unmemorized,
      passed,
    };
    if (sessionMode === "audio-cards-only" && typeof cellIndex === "number") {
      saveAudioCardsHistory(currentLevel as any, cellIndex, {
        rounds: summary.rounds,
        unmemorizedWordIds: unmemorized.map((w) => w.id),
        passed,
        completedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    return summary;
  };

  const advanceOrFinish = (newIndex: number) => {
    if (newIndex < cardWords.length) {
      setCurrentIndex(newIndex);
      return;
    }
    // 周回終端: 当周の結果を記録してから合格(≥70%)/不合格(<70%) を判定
    const choices = roundChoicesRef.current;
    const uniqueIds = Array.from(new Set(cardWords.map((w) => w.id)));
    const memorized = uniqueIds.filter((id) => choices[id] === "memorized").length;
    const ratio = uniqueIds.length > 0 ? memorized / uniqueIds.length : 1;

    roundResultsRef.current = [
      ...roundResultsRef.current,
      {
        round: roundRef.current,
        memorized,
        total: uniqueIds.length,
        isFinalCleanup: finalCleanupRef.current,
      },
    ];

    // 仕上げ周(合格後の未覚えのみ)は判定スキップで即 complete
    if (finalCleanupRef.current) {
      setAudioCardsSummary(buildAudioCardsSummary(true));
      setPhase("complete");
      return;
    }

    // 3周目を終えたら割合に関わらず complete
    if (roundRef.current >= 3) {
      setAudioCardsSummary(buildAudioCardsSummary(ratio >= AUDIO_CARDS_PASS_THRESHOLD));
      setPhase("complete");
      return;
    }

    if (ratio >= AUDIO_CARDS_PASS_THRESHOLD) {
      // 合格: 未覚え0なら complete、残っていれば未覚えのみで「仕上げ1周」
      const seen = new Set<string>();
      const remaining: Word[] = [];
      for (const w of cardWords) {
        if (choices[w.id] === "memorized") continue;
        if (seen.has(w.id)) continue;
        seen.add(w.id);
        remaining.push(w);
      }
      if (remaining.length === 0) {
        setAudioCardsSummary(buildAudioCardsSummary(true));
        setPhase("complete");
        return;
      }
      finalCleanupRef.current = true;
      roundRef.current += 1;
      roundChoicesRef.current = {};
      setPendingCleanupWords(remaining);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }

    // 不合格: 全単語を再シャッフルして再挑戦 (3周まで)
    roundRef.current += 1;
    roundChoicesRef.current = {};
    setCardWords(shuffleArray(roundOriginalRef.current));
    setCurrentIndex(0);
    setRevealLevel(0);
    setPendingChoice(null);
    setRequeueNotice({ kind: "fail", round: roundRef.current });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    // 中央オーバーレイを 1.5 秒だけ表示
    if (failOverlayTimerRef.current) clearTimeout(failOverlayTimerRef.current);
    setFailOverlayVisible(true);
    failOverlayTimerRef.current = setTimeout(() => {
      setFailOverlayVisible(false);
      failOverlayTimerRef.current = null;
    }, 1500);
  };

  const executeBulkComplete = useCallback(async () => {
    stopSpeaking().catch(() => {});
    // Mark current and all subsequent cards as memorized.
    const startIdx = currentIndex;
    const remaining = cardWords.slice(startIdx);
    if (remaining.length === 0) {
      setAudioCardsSummary(buildAudioCardsSummary(true));
      setPhase("complete");
      return;
    }
    const nextAudio = { ...audioChoicesRef.current };
    const nextRound = { ...roundChoicesRef.current };
    const toPersist: string[] = [];
    for (const w of remaining) {
      if (nextAudio[w.id] !== "memorized") {
        toPersist.push(w.id);
      }
      nextAudio[w.id] = "memorized";
      nextRound[w.id] = "memorized";
    }
    audioChoicesRef.current = nextAudio;
    roundChoicesRef.current = nextRound;
    setAudioChoices(nextAudio);
    await Promise.all(
      toPersist.map((id) =>
        markAsMemorized(id, "audio").catch((e) => {
          console.warn("[SprintStudySession] bulk-complete persist failed", e);
        })
      )
    );
    // Record a synthetic final round so the summary card reflects this run.
    const uniqueIds = Array.from(new Set(cardWords.map((w) => w.id)));
    const memorized = uniqueIds.filter((id) => nextAudio[id] === "memorized").length;
    roundResultsRef.current = [
      ...roundResultsRef.current,
      {
        round: roundRef.current,
        memorized,
        total: uniqueIds.length,
        isFinalCleanup: finalCleanupRef.current,
      },
    ];
    setAudioCardsSummary(buildAudioCardsSummary(true));
    setPhase("complete");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cardWords]);

  const handleCardChoice = async (choice: "memorized" | "unmemorized") => {
    if (!currentCardWord) return;
    if (pendingChoice !== null) return;
    if (cardChoiceInFlightRef.current) return;
    cardChoiceInFlightRef.current = true;
    try {
      Haptics.impactAsync(
        choice === "memorized"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      );
      // ref を同期更新して advanceOrFinish の判定がレース無く読めるように
      audioChoicesRef.current = { ...audioChoicesRef.current, [currentCardWord.id]: choice };
      roundChoicesRef.current = { ...roundChoicesRef.current, [currentCardWord.id]: choice };
      // audio-cards always uses audio type
      try {
        await (choice === "memorized"
          ? markAsMemorized(currentCardWord.id, "audio")
          : markAsUnmemorized(currentCardWord.id, "audio"));
      } catch (e) {
        // ストレージ書き込みが失敗しても UI フローは進める (ref 上の選択は保持)
        console.warn("[SprintStudySession] failed to persist audio choice", e);
      }
      setAudioChoices((prev) => ({ ...prev, [currentCardWord.id]: choice }));
      // 例文(意味)を表示してから「次へ」で進む2段階フロー
      setPendingChoice(choice);
      setRevealLevel(2);
    } finally {
      cardChoiceInFlightRef.current = false;
    }
  };

  const handleCardAdvance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    cardChoiceInFlightRef.current = false;
    advanceOrFinish(currentIndex + 1);
  };

  const handleStartCleanup = () => {
    if (!pendingCleanupWords || pendingCleanupWords.length === 0) return;
    setCardWords(shuffleArray(pendingCleanupWords));
    setCurrentIndex(0);
    setRevealLevel(0);
    setPendingChoice(null);
    setRequeueNotice({ kind: "pass", round: roundRef.current });
    setPendingCleanupWords(null);
  };

  const handleToggleAudioRepeat = (next: AudioRepeatCount) => {
    if (next === audioRepeat) return;
    Haptics.selectionAsync().catch(() => {});
    setAudioRepeatState(next);
    setAudioRepeatPreference(next).catch(() => {});
  };

  const handleComplete = async () => {
    setCompleting(true);
    const phaseArg: "text" | "audio" | "audioCards" =
      sessionMode === "audio-only" ? "audio" :
      sessionMode === "audio-cards-only" ? "audioCards" : "text";
    const advanced = await completePhase(phaseArg, cellIndex);
    setCompleting(false);
    // Prevent auto-save effect from double-calling completePhase
    const key = `${sessionMode}-${cellIndex ?? "default"}`;
    autoSavedPhase.current = key;
    setPhase("complete");
    if (advanced) {
      triggerStamp(() => setShowPostStamp(true));
    } else {
      setIsPartialComplete(true);
    }
  };

  // ----- LOADING -----
  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("preparing")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // ----- COMPLETE (partial) -----
  if (phase === "complete" && isPartialComplete) {
    const donePhase =
      sessionMode === "text-only" ? t("text_list") :
      sessionMode === "audio-only" ? t("audio_list") : t("audio_cards");
    const sep = t("phase_separator");
    const nextPhase =
      sessionMode === "text-only" ? t("audio_list") + sep + t("audio_cards") :
      sessionMode === "audio-only" ? t("text_list") + sep + t("audio_cards") : t("text_list") + sep + t("audio_list");
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <Animated.View entering={FadeIn} style={styles.completeContainer}>
          <View style={[styles.completeIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="check-circle" size={48} color={theme.primary} />
          </View>
          <ThemedText style={styles.completeTitle}>{donePhase}{t("phase_complete_suffix")}</ThemedText>
          <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
            {t("words_studied_count").replace("{n}", String(words.length))}
          </ThemedText>
          <View style={[styles.partialNotice, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
            <Feather name="info" size={15} color={Colors.light.alert} />
            <ThemedText style={[styles.partialNoticeText, { color: Colors.light.alert }]}>
              {t("stamp_hint_missing").replace("{phases}", nextPhase)}
            </ThemedText>
          </View>
        </Animated.View>
      </ThemedView>
    );
  }

  // ----- COMPLETE (full) -----
  if (phase === "complete") {
    const targetPos = cellIndex ?? sprintData?.currentPosition ?? -1;
    const savedProgress = targetPos >= 0
      ? getCellPhaseProgress(targetPos)
      : { text: false, audio: false, audioCards: false };
    // Stamp requires all 3 phases done
    const willGetStamp =
      sessionMode === "study" ||
      (sessionMode === "text-only" && savedProgress.audio && savedProgress.audioCards) ||
      (sessionMode === "audio-only" && savedProgress.text && savedProgress.audioCards) ||
      (sessionMode === "audio-cards-only" && savedProgress.text && savedProgress.audio);
    const phaseDoneLabel =
      sessionMode === "text-only" ? t("text_list") :
      sessionMode === "audio-only" ? t("audio_list") :
      sessionMode === "audio-cards-only" ? t("audio_cards") : "";

    // Build hint for missing phases
    const missingPhases: string[] = [];
    if (sessionMode === "text-only") {
      if (!savedProgress.audio) missingPhases.push(t("audio_list"));
      if (!savedProgress.audioCards) missingPhases.push(t("audio_cards"));
    } else if (sessionMode === "audio-only") {
      if (!savedProgress.text) missingPhases.push(t("text_list"));
      if (!savedProgress.audioCards) missingPhases.push(t("audio_cards"));
    } else if (sessionMode === "audio-cards-only") {
      if (!savedProgress.text) missingPhases.push(t("text_list"));
      if (!savedProgress.audio) missingPhases.push(t("audio_list"));
    }

    const studiedCellIndex = cellIndex ?? (sprintData?.currentPosition ?? 1);

    // ----- POST STAMP SCREEN -----
    if (showPostStamp) {
      const isSpecial = sprintData?.specialStampPositions?.includes(studiedCellIndex) ?? false;
      const stampImage = getPandaImage(studiedCellIndex, isSpecial, currentLevel);
      const stampName = getPandaName(studiedCellIndex, isSpecial, currentLevel);
      return (
        <ThemedView style={styles.container}>
          <ScrollView
            contentContainerStyle={[styles.completeScrollContent, { paddingTop: safeHeaderPadding + Spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeIn} style={styles.completeInner}>
              <View style={[styles.stampCircle, { backgroundColor: "transparent", marginBottom: Spacing.lg }]}>
                <Image source={stampImage} style={{ width: 150, height: 150, borderRadius: 75 }} resizeMode="cover" />
              </View>
              <ThemedText style={[styles.stampLabel, { color: theme.text, textShadowColor: "transparent" }]}>
                {t("stamp_earned")}
              </ThemedText>
              {stampName ? (
                <ThemedText
                  testID="text-stamp-name-post"
                  style={[styles.stampName, { color: theme.text, textShadowColor: "transparent" }]}
                >
                  {stampName}
                </ThemedText>
              ) : null}
              <ThemedText style={[styles.completeSub, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
                {t("words_studied_count").replace("{n}", String(words.length))}
              </ThemedText>

              {/* 名言 */}
              {(() => {
                const q = getQuoteForStamp(studiedCellIndex, currentLevel);
                if (!q) return null;
                return (
                  <View style={[styles.quoteCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <ThemedText style={styles.quoteFlag}>{q.flag}</ThemedText>
                    <ThemedText style={styles.quoteText}>{q.chinese}</ThemedText>
                    <View style={styles.quoteSpeakRow}>
                      <SpeakButton text={q.chinese} size="small" />
                    </View>
                    {q.pinyin ? (
                      <ThemedText style={[styles.quotePinyin, { color: theme.textSecondary }]}>{q.pinyin}</ThemedText>
                    ) : null}
                    <ThemedText style={[styles.quoteJa, { color: theme.textSecondary }]}>{q.japanese}</ThemedText>
                    <ThemedText style={[styles.quoteSource, { color: theme.textSecondary }]}>— {q.source}</ThemedText>
                  </View>
                );
              })()}
              <Pressable
                testID="button-audio-playback-review"
                onPress={() => navigation.navigate("SprintAudioPlayback", { cellIndex: studiedCellIndex })}
                style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: Colors.light.secondary + "18", borderColor: Colors.light.secondary + "50" }]}
              >
                <Feather name="play-circle" size={18} color={Colors.light.secondary} />
                <ThemedText style={[styles.audioStudyText, { color: Colors.light.secondary }]}>{t("audio_review_sprint")}</ThemedText>
              </Pressable>
              <Pressable
                testID="button-back-to-sprint"
                onPress={() => navigation.navigate("SprintHome")}
                style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              >
                <Feather name="map" size={16} color={theme.textSecondary} />
                <ThemedText style={[styles.audioStudyText, { color: theme.textSecondary }]}>{t("back_to_sprint")}</ThemedText>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.container}>
        {stampVisible ? (
          <Animated.View style={[styles.stampOverlay, stampStyle]}>
            <View style={[styles.stampCircle, { backgroundColor: "transparent" }]}>
              <Image
                source={getPandaImage(studiedCellIndex, sprintData?.specialStampPositions?.includes(studiedCellIndex) ?? false, currentLevel)}
                style={{ width: 150, height: 150, borderRadius: 75 }}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={styles.stampLabel}>{t("stamp_earned")}</ThemedText>
            {(() => {
              const overlayName = getPandaName(
                studiedCellIndex,
                sprintData?.specialStampPositions?.includes(studiedCellIndex) ?? false,
                currentLevel,
              );
              return overlayName ? (
                <ThemedText testID="text-stamp-name-overlay" style={styles.stampName}>
                  {overlayName}
                </ThemedText>
              ) : null;
            })()}
          </Animated.View>
        ) : null}
        <ScrollView
          contentContainerStyle={[styles.completeScrollContent, { paddingTop: safeHeaderPadding + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View entering={FadeIn} style={styles.completeInner}>
          <View style={[styles.completeIcon, { backgroundColor: (willGetStamp ? Colors.light.success : theme.primary) + "20" }]}>
            <Feather name={willGetStamp ? "award" : "check-circle"} size={48} color={willGetStamp ? Colors.light.success : theme.primary} />
          </View>
          <ThemedText style={styles.completeTitle}>
            {phaseDoneLabel ? phaseDoneLabel + t("phase_complete_suffix") : t("session_complete")}
          </ThemedText>
          <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
            {t("words_studied_count").replace("{n}", String(words.length))}
          </ThemedText>
          {!willGetStamp && missingPhases.length > 0 ? (
            <View style={[styles.partialNotice, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
              <Feather name="info" size={15} color={Colors.light.alert} />
              <ThemedText style={[styles.partialNoticeText, { color: Colors.light.alert }]}>
                {t("stamp_hint_missing").replace("{phases}", missingPhases.join(t("phase_separator")))}
              </ThemedText>
            </View>
          ) : null}
          {(() => {
            const firstRound = audioCardsSummary?.rounds?.[0];
            const displayMemorized = firstRound ? firstRound.memorized : memorizedCount;
            const displayTotal = firstRound ? firstRound.total : totalCount;
            return (
              <View style={styles.resultStats}>
                <View style={styles.resultStat}>
                  <ThemedText style={[styles.resultValue, { color: Colors.light.success }]}>
                    {displayMemorized}
                  </ThemedText>
                  <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>{t("memorized_label")}</ThemedText>
                </View>
                <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />
                <View style={styles.resultStat}>
                  <ThemedText style={[styles.resultValue, { color: Colors.light.alert }]}>
                    {displayTotal - displayMemorized}
                  </ThemedText>
                  <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>{t("not_memorized_label")}</ThemedText>
                </View>
              </View>
            );
          })()}
          {sessionMode === "audio-cards-only" && audioCardsSummary ? (
            <View
              testID="audio-cards-summary-card"
              style={[
                styles.summaryCard,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <View style={styles.summaryHeaderRow}>
                <ThemedText style={styles.summaryTitle}>{t("audio_cards_summary_title")}</ThemedText>
                <View
                  style={[
                    styles.summaryBadge,
                    {
                      backgroundColor:
                        (audioCardsSummary.passed ? Colors.light.success : Colors.light.alert) + "22",
                      borderColor:
                        (audioCardsSummary.passed ? Colors.light.success : Colors.light.alert) + "60",
                    },
                  ]}
                >
                  <Feather
                    name={audioCardsSummary.passed ? "check" : "alert-circle"}
                    size={12}
                    color={audioCardsSummary.passed ? Colors.light.success : Colors.light.alert}
                  />
                  <ThemedText
                    style={[
                      styles.summaryBadgeText,
                      { color: audioCardsSummary.passed ? Colors.light.success : Colors.light.alert },
                    ]}
                  >
                    {audioCardsSummary.passed
                      ? t("audio_cards_passed_badge")
                      : t("audio_cards_failed_badge")}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.summarySub, { color: theme.textSecondary }]}>
                {t("audio_cards_total_rounds").replace("{n}", String(audioCardsSummary.rounds.length))}
              </ThemedText>
              <View style={styles.summaryRoundsList}>
                {audioCardsSummary.rounds.map((r, idx) => {
                  const ratio = r.total > 0 ? r.memorized / r.total : 0;
                  const passedRound = ratio >= AUDIO_CARDS_PASS_THRESHOLD;
                  const label = r.isFinalCleanup
                    ? t("audio_cards_final_round_label")
                    : t("audio_cards_round_label").replace("{n}", String(r.round));
                  return (
                    <View
                      key={`round-${idx}-${r.round}`}
                      testID={`summary-round-${idx}`}
                      style={[styles.summaryRoundRow, { borderColor: theme.border }]}
                    >
                      <View style={styles.summaryRoundLeft}>
                        <ThemedText style={styles.summaryRoundLabel}>{label}</ThemedText>
                        <ThemedText style={[styles.summaryRoundScore, { color: theme.textSecondary }]}>
                          {t("audio_cards_round_score")
                            .replace("{m}", String(r.memorized))
                            .replace("{t}", String(r.total))}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.summaryRoundPercent,
                          {
                            color: r.isFinalCleanup
                              ? theme.textSecondary
                              : passedRound
                              ? Colors.light.success
                              : Colors.light.alert,
                          },
                        ]}
                      >
                        {Math.round(ratio * 100)}%
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
              {audioCardsSummary.unmemorized.length > 0 ? (
                <View style={styles.summaryUnmemorizedSection}>
                  <ThemedText style={[styles.summaryUnmemorizedTitle, { color: Colors.light.alert }]}>
                    {t("audio_cards_unmemorized_title").replace(
                      "{n}",
                      String(audioCardsSummary.unmemorized.length)
                    )}
                  </ThemedText>
                  <View style={styles.summaryUnmemorizedList}>
                    {audioCardsSummary.unmemorized.map((w) => (
                      <Pressable
                        key={`unmem-${w.id}`}
                        testID={`summary-unmemorized-${w.id}`}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          navigation.navigate("WordDetail", { wordId: w.id });
                        }}
                        style={({ pressed }) => [
                          styles.summaryUnmemorizedItem,
                          {
                            backgroundColor: Colors.light.alert + (pressed ? "22" : "12"),
                            borderColor: Colors.light.alert + "40",
                          },
                        ]}
                      >
                        <View style={styles.summaryUnmemorizedTextWrap}>
                          <View style={styles.summaryUnmemorizedHeaderRow}>
                            <ThemedText style={[styles.summaryUnmemorizedId, { color: theme.textSecondary }]}>
                              #{w.id}
                            </ThemedText>
                            <ThemedText style={styles.summaryUnmemorizedChinese}>{w.word}</ThemedText>
                          </View>
                          {w.pinyin ? (
                            <ThemedText style={[styles.summaryUnmemorizedPinyin, { color: theme.textSecondary }]}>
                              {w.pinyin}
                            </ThemedText>
                          ) : null}
                        </View>
                        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <ThemedText style={[styles.summaryAllDone, { color: Colors.light.success }]}>
                  {t("audio_cards_no_unmemorized")}
                </ThemedText>
              )}
            </View>
          ) : null}
          {willGetStamp ? (
            <Button
              testID="button-session-complete"
              onPress={handleComplete}
              disabled={completing}
              style={styles.completeButton}
            >
              {completing ? t("saving") : t("get_stamp")}
            </Button>
          ) : null}
          {sessionMode === "text-only" && !savedProgress.audio ? (
            <Pressable
              testID="button-start-audio-study"
              onPress={() => navigation.replace("SprintStudySession", { mode: "audio-only", cellIndex: studiedCellIndex })}
              style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "40" }]}
            >
              <Feather name="headphones" size={16} color={theme.primary} />
              <ThemedText style={[styles.audioStudyText, { color: theme.primary }]}>{t("start_audio_list")}</ThemedText>
            </Pressable>
          ) : null}
          {(sessionMode === "text-only" && !savedProgress.audioCards) ||
           (sessionMode === "audio-only" && !savedProgress.audioCards) ? (
            <Pressable
              testID="button-start-audio-cards"
              onPress={() => navigation.replace("SprintStudySession", { mode: "audio-cards-only", cellIndex: studiedCellIndex })}
              style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: Colors.light.alert + "12", borderColor: Colors.light.alert + "40" }]}
            >
              <Feather name="layers" size={16} color={Colors.light.alert} />
              <ThemedText style={[styles.audioStudyText, { color: Colors.light.alert }]}>{t("start_audio_cards")}</ThemedText>
            </Pressable>
          ) : null}
        </Animated.View>
        </ScrollView>
      </ThemedView>
    );
  }

  // ----- LIST PHASE (text-list, text-review, audio-list, audio-review) -----
  const isAudioListPhase = phase === "audio-list" || phase === "audio-review";
  const isReviewPhase = phase === "text-review" || phase === "audio-review";
  if (phase === "text-list" || phase === "text-review" || phase === "audio-list" || phase === "audio-review") {
    const listChoices = isAudioListPhase ? audioChoices : textChoices;
    const memorizedInList = Object.values(listChoices).filter((v) => v === "memorized").length;
    const unmemorizedInList = Object.values(listChoices).filter((v) => v === "unmemorized").length;

    const struggledInList = isAudioListPhase
      ? words.filter((w) => (w.audioUnmemorizedCount ?? 0) > 0).length
      : words.filter((w) => (w.textUnmemorizedCount ?? 0) > 0).length;

    const allMarked = words.every((w) => listChoices[w.id]);
    const unmarkedCount = words.filter((w) => !listChoices[w.id]).length;

    const filteredWords = words.filter((w) => {
      if (listFilter === "memorized") return listChoices[w.id] === "memorized";
      if (listFilter === "unmemorized") return listChoices[w.id] === "unmemorized";
      if (listFilter === "struggled") return isAudioListPhase
        ? (w.audioUnmemorizedCount ?? 0) > 0
        : (w.textUnmemorizedCount ?? 0) > 0;
      return true;
    });

    const nextButtonLabel = t("done");

    return (
      <ThemedView style={styles.container}>
        {/* Review phase banner */}
        {isReviewPhase ? (
          <View style={[styles.reviewBanner, { backgroundColor: Colors.light.alert + "18", borderBottomColor: Colors.light.alert + "40", paddingTop: safeHeaderPadding + Spacing.sm }]}>
            <Feather name="alert-circle" size={14} color={Colors.light.alert} />
            <ThemedText style={[styles.reviewBannerText, { color: Colors.light.alert }]}>
              {t("review_remaining")}
            </ThemedText>
          </View>
        ) : null}

        {/* Filter tabs */}
        <View style={[styles.filterRow, { paddingTop: isReviewPhase ? Spacing.md : safeHeaderPadding + Spacing.md, borderBottomColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowContent}>
            <Pressable
              onPress={() => setListFilter("all")}
              style={[styles.filterTab, listFilter === "all" && { backgroundColor: theme.primary }]}
            >
              <ThemedText style={[styles.filterTabText, listFilter === "all" && styles.filterTabTextActive]}>
                {`全部 (${words.length})`}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setListFilter("memorized")}
              style={[styles.filterTab, listFilter === "memorized" && { backgroundColor: Colors.light.success }]}
            >
              <ThemedText style={[styles.filterTabText, listFilter === "memorized" && styles.filterTabTextActive]}>
                {`覚えた (${memorizedInList})`}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setListFilter("unmemorized")}
              style={[styles.filterTab, listFilter === "unmemorized" && { backgroundColor: Colors.light.alert }]}
            >
              <ThemedText style={[styles.filterTabText, listFilter === "unmemorized" && styles.filterTabTextActive]}>
                {`まだ (${unmemorizedInList})`}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setListFilter("struggled")}
              style={[styles.filterTab, listFilter === "struggled" && { backgroundColor: Colors.light.alert }]}
            >
              <View style={styles.filterTabInner}>
                <Feather name="flag" size={12} color={listFilter === "struggled" ? "#fff" : Colors.light.alert} />
                <ThemedText style={[styles.filterTabText, listFilter === "struggled" && styles.filterTabTextActive, listFilter !== "struggled" && { color: Colors.light.alert }]}>
                  {`苦手歴 (${struggledInList})`}
                </ThemedText>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: listBarHeight + tabBarHeight + Spacing.md }}
          renderItem={({ item }) => {
            const globalIdx = words.indexOf(item) + 1;
            const choice = isAudioListPhase ? audioChoices[item.id] : textChoices[item.id];
            const isMemorized = choice === "memorized";
            const isUnmemorized = choice === "unmemorized";
            const useLongForRow = isAudioListPhase && longExampleWordIds.has(item.id) && !!item.longExample && item.longExample.trim().length > 0;
            const exampleForRow = useLongForRow ? item.longExample! : item.exampleSentence;
            const speakText = exampleForRow
              ? `${item.word}。${exampleForRow}`
              : item.word;

            // --- Audio-list row (word hidden by default, revealed by per-row eye toggle or global eye) ---
            // 3-state cycle: 0 hidden → 1 word/example shown → 2 also translation shown → 0 hidden
            if (isAudioListPhase) {
              const isMeaningRevealed = audioMeaningRevealedIds.has(item.id);
              const isWordRevealed = allRevealed || revealedIds.has(item.id) || isMeaningRevealed;
              const revealLevel: 0 | 1 | 2 = isMeaningRevealed ? 2 : isWordRevealed ? 1 : 0;
              const meaningText = lang === "en" && item.translationEn ? item.translationEn : item.translation;
              const exampleMeaning = useLongForRow
                ? (lang === "en" && item.longExampleEnglish ? item.longExampleEnglish : item.longExampleTranslation)
                : (lang === "en" && item.exampleEnglish ? item.exampleEnglish : item.exampleTranslation);
              return (
                <View style={[styles.wordRow, { borderBottomColor: theme.border, backgroundColor: isUnmemorized ? Colors.light.alert + "14" : theme.backgroundDefault }]}>
                  <View style={[styles.wordNumCircleSmall, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.wordNumCircleTextSmall, { color: theme.textSecondary }]}>
                      {globalIdx}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => speakChinese(speakText, { wordId: item.id })}
                    style={[styles.speakCircle, { backgroundColor: Colors.light.secondary }]}
                  >
                    <Feather name="volume-2" size={20} color="#fff" />
                  </Pressable>
                  {isWordRevealed ? (
                    <View style={styles.wordInfoCol}>
                      <ThemedText style={styles.wordRowText}>{item.word}</ThemedText>
                      <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{item.pinyin}</ThemedText>
                      {exampleForRow ? (
                        <ThemedText style={[styles.wordRowExample, { color: theme.textSecondary }]} numberOfLines={useLongForRow ? 3 : 2}>
                          {exampleForRow}
                        </ThemedText>
                      ) : null}
                      {isMeaningRevealed ? (
                        <View style={[styles.audioMeaningBlock, { borderTopColor: theme.border + "60" }]}>
                          <ThemedText style={[styles.audioMeaningText, { color: theme.text }]}>
                            {meaningText}
                          </ThemedText>
                          {exampleMeaning ? (
                            <ThemedText style={[styles.audioMeaningExample, { color: theme.textSecondary }]} numberOfLines={2}>
                              {exampleMeaning}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.wordInfoCol} />
                  )}
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => {
                        // 0 → 1: add to revealedIds
                        // 1 → 2: add to audioMeaningRevealedIds
                        // 2 → 0: remove from both
                        if (revealLevel === 0) {
                          setRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.add(item.id);
                            return next;
                          });
                        } else if (revealLevel === 1) {
                          setAudioMeaningRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.add(item.id);
                            return next;
                          });
                        } else {
                          setRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(item.id);
                            return next;
                          });
                          setAudioMeaningRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(item.id);
                            return next;
                          });
                        }
                      }}
                      style={styles.actionIconBtn}
                    >
                      <Feather name={isWordRevealed ? "eye" : "eye-off"} size={18} color={isWordRevealed ? theme.primary : theme.textSecondary} />
                      {revealLevel === 1 ? (
                        <View style={[styles.eyeMoreDot, { backgroundColor: Colors.light.secondary, borderColor: theme.backgroundDefault }]} />
                      ) : null}
                    </Pressable>
                    <Pressable
                      onPress={() => handleChoiceList(item.id, "unmemorized")}
                      style={[styles.actionIconBtn, isUnmemorized && styles.flagBtnActive]}
                    >
                      <Feather name="flag" size={18} color={isUnmemorized ? "#fff" : theme.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleChoiceList(item.id, "memorized")}
                      style={[styles.actionIconBtn, isMemorized && styles.checkBtnActive]}
                    >
                      <Feather name="check" size={18} color={isMemorized ? "#fff" : theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            }

            // --- Text-list row (characters hidden by header toggle, per-row translation reveal) ---
            const isTranslationRevealed = translationRevealedIds.has(item.id);
            const charsHidden = allRevealed;
            return (
              <View style={[styles.wordRow, styles.wordRowVertical, { borderBottomColor: theme.border, backgroundColor: isUnmemorized ? Colors.light.alert + "14" : theme.backgroundDefault }]}>
                <View style={styles.wordRowMain}>
                  <View style={[styles.wordNumCircleSmall, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.wordNumCircleTextSmall, { color: theme.textSecondary }]}>
                      {globalIdx}
                    </ThemedText>
                  </View>
                  <View style={styles.wordInfoCol}>
                    <View style={styles.wordRowHeaderLine}>
                      {charsHidden ? (
                        <ThemedText style={[styles.wordRowText, { color: theme.textSecondary, letterSpacing: 4 }]}>{"●●●"}</ThemedText>
                      ) : (
                        <ThemedText style={styles.wordRowText}>{item.word}</ThemedText>
                      )}
                      <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{item.pinyin}</ThemedText>
                      <SpeakButton text={speakText} size="small" wordId={item.id} />
                    </View>
                    {item.exampleSentence ? (
                      <View style={styles.wordRowExampleLine}>
                        <ThemedText style={[styles.wordRowExample, { color: theme.textSecondary }]} numberOfLines={2}>
                          {item.exampleSentence}
                        </ThemedText>
                        <InlinePronunciationEvaluator
                          referenceText={item.exampleSentence}
                          wordId={item.id}
                        />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => setTranslationRevealedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                        return next;
                      })}
                      style={styles.actionIconBtn}
                    >
                      <Feather name={isTranslationRevealed ? "eye" : "eye-off"} size={18} color={isTranslationRevealed ? theme.primary : theme.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleChoiceList(item.id, "unmemorized")}
                      style={[styles.actionIconBtn, isUnmemorized && styles.flagBtnActive]}
                    >
                      <Feather name="flag" size={18} color={isUnmemorized ? "#fff" : theme.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleChoiceList(item.id, "memorized")}
                      style={[styles.actionIconBtn, isMemorized && styles.checkBtnActive]}
                    >
                      <Feather name="check" size={18} color={isMemorized ? "#fff" : theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
                {isTranslationRevealed ? (
                  <View style={[styles.translationRow, { borderTopColor: theme.border + "60" }]}>
                    <ThemedText style={[styles.listTranslationText, { color: theme.text }]}>
                      {lang === "en" && item.translationEn ? item.translationEn : item.translation}
                    </ThemedText>
                    {(lang === "en" ? (item.exampleEnglish || item.exampleTranslation) : item.exampleTranslation) ? (
                      <ThemedText style={[styles.listTranslationExample, { color: theme.textSecondary }]}>
                        {lang === "en" && item.exampleEnglish ? item.exampleEnglish : item.exampleTranslation}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />

        {/* Next button */}
        <View
          style={[styles.listNextBar, { bottom: tabBarHeight, paddingBottom: Spacing.md, borderTopColor: theme.border, backgroundColor: theme.backgroundDefault }]}
          onLayout={(e) => setListBarHeight(e.nativeEvent.layout.height)}
        >
          {!isReviewPhase ? (
            <View style={styles.listNextBarInner}>
              <View style={[styles.unmarkedHint, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="flag" size={13} color={theme.textSecondary} />
                <ThemedText style={[styles.unmarkedHintText, { color: theme.textSecondary }]}>
                  覚えた単語はチェック、覚えていない単語はフラグを押してください
                </ThemedText>
              </View>
              <Button testID="button-list-next" onPress={handleListNext} style={{ flex: 1 }}>
                {nextButtonLabel}
              </Button>
            </View>
          ) : (
            <Button testID="button-list-next" onPress={handleListNext} style={{ flex: 1 }}>
              {nextButtonLabel}
            </Button>
          )}
        </View>
      </ThemedView>
    );
  }

  // ----- AUDIO CARDS: PRE-CLEANUP RESULT CARD -----
  if (phase === "audio-cards" && pendingCleanupWords) {
    const lastRound = roundResultsRef.current[roundResultsRef.current.length - 1];
    const memo = lastRound?.memorized ?? 0;
    const total = lastRound?.total ?? 0;
    const remainCount = pendingCleanupWords.length;
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.completeScrollContent, { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: tabBarHeight + Spacing["3xl"] }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn} style={styles.completeInner}>
            <View style={[styles.completeIcon, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="award" size={48} color={Colors.light.success} />
            </View>
            <ThemedText style={styles.completeTitle}>音声カード 合格！</ThemedText>
            <ThemedText style={[styles.completeSub, { color: theme.textSecondary }]}>
              {`${total}語中 ${memo}語覚えました`}
            </ThemedText>
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <ThemedText style={[styles.resultValue, { color: Colors.light.success }]}>{memo}</ThemedText>
                <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>覚えた</ThemedText>
              </View>
              <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />
              <View style={styles.resultStat}>
                <ThemedText style={[styles.resultValue, { color: Colors.light.alert }]}>{total - memo}</ThemedText>
                <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>覚えていない</ThemedText>
              </View>
            </View>
            <View style={[styles.partialNotice, { backgroundColor: Colors.light.secondary + "15", borderColor: Colors.light.secondary + "40" }]}>
              <Feather name="repeat" size={15} color={Colors.light.secondary} />
              <ThemedText style={[styles.partialNoticeText, { color: Colors.light.secondary }]}>
                {`残り${remainCount}語の仕上げ周に進みます`}
              </ThemedText>
            </View>
            <Pressable
              testID="button-start-cleanup"
              onPress={handleStartCleanup}
              style={[styles.completeButton, styles.audioStudyButton, { backgroundColor: Colors.light.secondary, borderColor: Colors.light.secondary }]}
            >
              <Feather name="arrow-right" size={18} color="#fff" />
              <ThemedText style={[styles.audioStudyText, { color: "#fff" }]}>仕上げに進む</ThemedText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    );
  }

  // ----- AUDIO CARDS PHASE -----
  if (!currentCardWord) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={[styles.emptyTitle, { marginTop: Spacing.lg }]}>
            学習する単語がありません
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
            すべての単語が覚えた済みです
          </ThemedText>
          <Button onPress={handleComplete} style={styles.completeButton}>
            完了する
          </Button>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
      >
        {/* Phase badge + progress */}
        <View style={styles.phaseHeader}>
          <View style={styles.phaseLeft}>
            <Pressable
              testID="pressable-audio-badge"
              onPress={() => {
                if (phase !== "audio-cards") return;
                badgeTapCountRef.current += 1;
                if (badgeTapTimerRef.current) {
                  clearTimeout(badgeTapTimerRef.current);
                }
                if (badgeTapCountRef.current >= BADGE_TAP_REQUIRED) {
                  badgeTapCountRef.current = 0;
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  void executeBulkComplete();
                } else {
                  badgeTapTimerRef.current = setTimeout(() => {
                    badgeTapCountRef.current = 0;
                    badgeTapTimerRef.current = null;
                  }, BADGE_TAP_WINDOW_MS);
                }
              }}
              style={[styles.phaseBadge, { backgroundColor: badgeBg }]}
            >
              <Feather name={badgeIcon} size={13} color={badgeColor} />
              <ThemedText style={[styles.phaseBadgeText, { color: badgeColor }]}>
                {badgeLabel}
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {cardWords.length}
          </ThemedText>
        </View>

        <View style={styles.progressBarWrapper}>
          <ProgressBar progress={cardProgress} height={6} />
        </View>

        {requeueNotice ? (
          (() => {
            const isFail = requeueNotice.kind === "fail";
            const tint = isFail ? Colors.light.alert : Colors.light.success;
            const text = isFail
              ? `不合格 — 全部やり直し (${requeueNotice.round}/3周目)`
              : "合格 — まだの単語を仕上げ";
            return (
              <Animated.View
                testID="banner-audio-requeue"
                style={[
                  styles.requeueBanner,
                  { backgroundColor: tint + "15", borderColor: tint + "55" },
                  bannerStyle,
                ]}
              >
                <Feather name={isFail ? "rotate-ccw" : "check-circle"} size={14} color={tint} />
                <ThemedText style={[styles.requeueBannerText, { color: tint }]}>
                  {text}
                </ThemedText>
              </Animated.View>
            );
          })()
        ) : null}

        {/* Audio card with progressive reveal */}
        <Animated.View
          key={`audio-${currentIndex}-${revealLevel}`}
          entering={revealLevel === 0 ? FadeIn.duration(180) : undefined}
          style={[
            styles.wordCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <AudioCard
            word={currentCardWord}
            revealLevel={revealLevel}
            theme={theme}
            wordIndex={currentIndex + 1}
            totalWords={cardWords.length}
            audioRepeat={audioRepeat}
            onToggleAudioRepeat={handleToggleAudioRepeat}
            useLongExample={currentCardWord ? longExampleWordIds.has(currentCardWord.id) : false}
          />
        </Animated.View>

        {/* Progressive choice buttons */}
        {pendingChoice !== null ? (
          <View style={styles.choiceButtonsWrapper}>
            <View style={styles.choiceButtons}>
              <View style={[styles.choiceButton, styles.choiceButtonPlaceholder]} pointerEvents="none" />
              <Pressable
                testID="button-card-next"
                onPress={handleCardAdvance}
                style={[
                  styles.choiceButton,
                  { backgroundColor: theme.primary + "15", borderColor: theme.primary },
                ]}
              >
                <Feather name="arrow-right" size={20} color={theme.primary} />
                <ThemedText style={[styles.choiceLabel, { color: theme.primary }]}>
                  次へ
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : revealLevel < 2 ? (
          <View style={styles.choiceButtonsWrapper}>
            <View style={styles.choiceButtons}>
              <Pressable
                testID="button-unmemorized-early"
                onPress={() => handleCardChoice("unmemorized")}
                style={[
                  styles.choiceButton,
                  { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert },
                ]}
              >
                <Feather name="flag" size={20} color={Colors.light.alert} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>
                  覚えてない
                </ThemedText>
              </Pressable>
              <Pressable
                testID="button-memorized"
                onPress={() => handleCardChoice("memorized")}
                style={[
                  styles.choiceButton,
                  { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success },
                ]}
              >
                <Feather name="check" size={20} color={Colors.light.success} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>
                  覚えた
                </ThemedText>
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
              testID="button-unmemorized"
              onPress={() => handleCardChoice("unmemorized")}
              style={[
                styles.choiceButton,
                { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert },
              ]}
            >
              <Feather name="flag" size={20} color={Colors.light.alert} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>
                覚えてない
              </ThemedText>
            </Pressable>
            <Pressable
              testID="button-memorized"
              onPress={() => handleCardChoice("memorized")}
              style={[
                styles.choiceButton,
                { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success },
              ]}
            >
              <Feather name="check" size={20} color={Colors.light.success} />
              <ThemedText style={[styles.choiceLabel, { color: Colors.light.success }]}>
                覚えた
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ConfettiAnimation visible={confettiVisible} />
      {failOverlayVisible ? (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(220)}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          testID="overlay-audio-fail"
        >
          <View style={styles.failOverlayBackdrop}>
            <ThemedText style={[styles.failOverlayText, { color: Colors.light.alert }]}>
              70%以下{"\n"}不合格{"\n"}やり直し
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

// 音声カードで読み上げるテキスト: 長文モードなら longExample、通常は exampleSentence、無ければ word を repeat 回読む
function getAudioCardsSpeakText(
  w: { word: string; exampleSentence?: string | null; longExample?: string | null },
  repeat: 1 | 2 = 2,
  useLong: boolean = false,
): string {
  const long = w.longExample?.trim();
  const ex = w.exampleSentence?.trim();
  const base =
    useLong && long && long.length > 0
      ? long
      : ex && ex.length > 0
      ? ex
      : w.word;
  if (repeat <= 1) return base;
  // 末尾が終端記号でなければ句点を補い、TTS の自然な小休止を保証する
  const sep = /[。．！？!?.…]$/.test(base) ? " " : "。";
  return `${base}${sep}${base}`;
}

// 5枚に1枚ずつ等間隔で長文を割り当てる。総数<5の場合は先頭1枚だけ長文。
function shouldUseLongExample(index: number, total: number): boolean {
  if (total <= 0) return false;
  if (total < 5) return index === 0;
  return (index + 1) % 5 === 0;
}

// 音声カードフェーズの「覚えた」必要割合 (70%)
const AUDIO_CARDS_PASS_THRESHOLD = 0.7;

// Fisher-Yates シャッフル (元配列を変更しない)
function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOriginalWordNum(wordId: string): number {
  const parts = wordId.split("_");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

function MemoBadge({ word, mode, theme }: { word: Word; mode: "text" | "audio"; theme: ReturnType<typeof useTheme>["theme"] }) {
  const { t } = useI18n();
  const isMemorized = mode === "text" ? word.textMemorized : word.audioMemorized;
  const unmemorizedCount = mode === "text" ? (word.textUnmemorizedCount ?? 0) : (word.audioUnmemorizedCount ?? 0);

  if (isMemorized) {
    return (
      <View style={[styles.memoBadge, { backgroundColor: Colors.light.success + "20" }]}>
        <Feather name="check" size={11} color={Colors.light.success} />
        <ThemedText style={[styles.memoBadgeText, { color: Colors.light.success }]}>{t("memorized_label")}</ThemedText>
      </View>
    );
  }
  if (unmemorizedCount > 0) {
    return (
      <View style={[styles.memoBadge, { backgroundColor: Colors.light.alert + "20" }]}>
        <Feather name="flag" size={11} color={Colors.light.alert} />
        <ThemedText style={[styles.memoBadgeText, { color: Colors.light.alert }]}>{t("not_memorized_label")}</ThemedText>
      </View>
    );
  }
  return (
    <View style={[styles.memoBadge, { backgroundColor: theme.backgroundSecondary }]}>
      <ThemedText style={[styles.memoBadgeText, { color: theme.textSecondary }]}>{t("not_started_label")}</ThemedText>
    </View>
  );
}

interface AudioCardProps {
  word: Word;
  revealLevel: RevealLevel;
  theme: ReturnType<typeof useTheme>["theme"];
  wordIndex: number;
  totalWords: number;
  audioRepeat: AudioRepeatCount;
  onToggleAudioRepeat: (next: AudioRepeatCount) => void;
  useLongExample: boolean;
}

function AudioCard({ word, revealLevel, theme, wordIndex, totalWords, audioRepeat, onToggleAudioRepeat, useLongExample }: AudioCardProps) {
  const origNum = getOriginalWordNum(word.id);
  const { lang } = useI18n();
  const longText = word.longExample?.trim();
  const isLongActive = useLongExample && !!longText && longText.length > 0;
  const exampleDisplay = isLongActive ? longText! : word.exampleSentence;
  const exampleTranslationDisplay = isLongActive
    ? (lang === "en" && word.longExampleEnglish ? word.longExampleEnglish : word.longExampleTranslation) ?? ""
    : lang === "en" && word.exampleEnglish
    ? word.exampleEnglish
    : word.exampleTranslation;
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
          {isLongActive ? (
            <View
              testID="badge-long-example"
              style={[
                styles.longBadge,
                { backgroundColor: Colors.light.primary + "22", borderColor: Colors.light.primary + "55" },
              ]}
            >
              <Feather name="align-left" size={11} color={Colors.light.primary} />
              <ThemedText style={[styles.longBadgeText, { color: Colors.light.primary }]}>長文</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* 読み上げ回数トグル (×1 / ×2) */}
      <View style={styles.repeatToggleRow}>
        <View style={[styles.repeatToggleGroup, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          {([1, 2] as AudioRepeatCount[]).map((n) => {
            const active = audioRepeat === n;
            return (
              <Pressable
                key={n}
                testID={`button-audio-repeat-${n}`}
                onPress={() => onToggleAudioRepeat(n)}
                style={[
                  styles.repeatTogglePill,
                  active && { backgroundColor: Colors.light.secondary },
                ]}
              >
                <ThemedText
                  style={[
                    styles.repeatTogglePillText,
                    { color: active ? "#fff" : theme.textSecondary },
                  ]}
                >
                  ×{n}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Level 0: Audio only */}
      {revealLevel === 0 ? (
        <View style={styles.audioHiddenContent}>
          <View style={[styles.audioIconContainer, { backgroundColor: Colors.light.secondary + "18" }]}>
            <SpeakButton
              text={getAudioCardsSpeakText(word, audioRepeat, isLongActive)}
              size="large"
              wordId={word.id}
            />
          </View>
          <ThemedText style={[styles.audioPrompt, { color: theme.textSecondary }]}>
            {isLongActive ? "長文を聴いて答えましょう" : "音声を聴いて答えましょう"}
          </ThemedText>
        </View>
      ) : null}

      {/* Level 1+: Chinese characters + pinyin */}
      {revealLevel >= 1 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.wordHeader}>
            <ThemedText
              style={[styles.wordText, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {word.word}
            </ThemedText>
            <SpeakButton
              text={getAudioCardsSpeakText(word, audioRepeat, isLongActive)}
              size="medium"
              wordId={word.id}
            />
          </View>
          <ThemedText style={[styles.pinyinText, { color: theme.primary }]}>
            {word.pinyin}
          </ThemedText>
        </Animated.View>
      ) : null}

      {/* Level 2: meaning + example */}
      {revealLevel >= 2 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.translationText, { color: theme.textSecondary }]}>
            {lang === "en" && word.translationEn ? word.translationEn : word.translation}
          </ThemedText>
          {(lang === "ja" ? word.posJa : word.posEn) ? (
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <View style={{ backgroundColor: `${theme.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                <ThemedText style={{ fontSize: 11, fontFamily: "Nunito_600SemiBold", color: theme.primary }}>
                  {lang === "ja" ? word.posJa : word.posEn}
                </ThemedText>
              </View>
            </View>
          ) : null}
          {exampleDisplay ? (
            <View style={styles.exampleSection}>
              <View style={styles.exampleRow}>
                <ThemedText style={[styles.exampleChinese, { color: theme.text }]}>
                  {exampleDisplay}
                </ThemedText>
                <SpeakButton text={exampleDisplay} size="small" wordId={word.id} />
              </View>
              {exampleTranslationDisplay ? (
                <ThemedText style={[styles.exampleJp, { color: theme.textSecondary }]}>
                  {exampleTranslationDisplay}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },

  // Filter row
  filterRow: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  filterRowContent: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  filterTab: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  filterTabText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  filterTabTextActive: { color: "#fff" },
  filterTabInner: { flexDirection: "row", alignItems: "center", gap: 4 },

  // Word list row
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  wordNumCircleSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  wordNumCircleTextSmall: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  speakCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  wordInfoCol: {
    flex: 1,
    gap: 2,
  },
  wordRowHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  wordRowText: { fontSize: 20, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  wordRowPinyin: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  wordRowExample: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  wordRowExampleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: Spacing.sm, marginTop: 2 },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  actionIconBtn: { padding: 6, borderRadius: 20, position: "relative" },
  eyeMoreDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  audioMeaningBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  audioMeaningText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  audioMeaningExample: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 17,
  },
  checkBtnActive: {
    backgroundColor: Colors.light.success,
    borderRadius: 20,
  },
  flagBtnActive: {
    backgroundColor: Colors.light.alert,
    borderRadius: 20,
  },
  wordRowVertical: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 0,
  },
  wordRowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  translationRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  listTranslationText: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  listTranslationExample: { fontSize: 12, fontFamily: "Nunito_400Regular" },

  // Review banner
  reviewBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  reviewBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 18,
  },

  // List next button bar
  listNextBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  listNextBarInner: {
    gap: Spacing.xs,
  },
  unmarkedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
  },
  unmarkedHintText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },

  // Card phase
  phaseHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  phaseLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  phaseBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  phaseBadgeText: { fontSize: 13, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  phaseStep: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  progress: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  progressBarWrapper: { marginBottom: Spacing.xl },
  wordCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.xl, minHeight: 160 },
  wordHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm, paddingTop: 6 },
  wordText: { fontSize: 42, fontWeight: "400", flex: 1, marginRight: Spacing.sm, lineHeight: 58 },
  pinyinText: { fontSize: 17, fontFamily: "Nunito_400Regular", marginBottom: Spacing.md },
  divider: { height: 1, marginBottom: Spacing.md },
  translationText: { fontSize: 16, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.md },
  exampleSection: { gap: Spacing.xs },
  exampleRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  exampleChinese: { fontSize: 15, fontFamily: "Nunito_400Regular", lineHeight: 22, flex: 1 },
  exampleJp: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 20 },
  memoBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xs },
  wordNumBadge: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  wordNumBadgeGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  wordNumCircle: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
  wordNumCircleText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  audioHiddenContent: { alignItems: "center", justifyContent: "center", gap: Spacing.lg, paddingVertical: Spacing.xl },
  audioIconContainer: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center" },
  audioPrompt: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
  repeatToggleRow: { flexDirection: "row", justifyContent: "center", marginBottom: Spacing.md, marginTop: -Spacing.xs },
  repeatToggleGroup: { flexDirection: "row", borderRadius: BorderRadius.full, borderWidth: 1, padding: 3, gap: 2 },
  repeatTogglePill: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, minWidth: 44, alignItems: "center" },
  repeatTogglePillText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  requeueBanner: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  longBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 99, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  longBadgeText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  failOverlayBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl },
  failOverlayText: { color: "#fff", fontSize: 38, fontFamily: "Nunito_700Bold", textAlign: "center", lineHeight: 46 },
  requeueBannerText: { fontSize: 12, fontFamily: "Nunito_700Bold", flex: 1 },
  choiceButtonsWrapper: { gap: Spacing.sm },
  choiceButtons: { flexDirection: "row", gap: Spacing.md },
  choiceButton: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 2, minHeight: 80 },
  choiceButtonPlaceholder: { backgroundColor: "transparent", borderColor: "transparent" },
  choiceLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  earlyUnmemorizedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  earlyUnmemorizedLabel: { fontSize: 13, fontFamily: "Nunito_400Regular" },
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
  stampName: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: "#fff",
    marginTop: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
  completeContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing["3xl"] },
  completeScrollContent: { flexGrow: 1, padding: Spacing["3xl"], paddingBottom: Spacing["3xl"] },
  completeInner: { alignItems: "center", width: "100%" },
  completeIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl },
  completeTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: Spacing.sm, textAlign: "center" },
  completeSub: { fontSize: 15, fontFamily: "Nunito_400Regular", marginBottom: Spacing.xl, textAlign: "center" },
  resultStats: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md, marginBottom: Spacing["2xl"], width: "100%", justifyContent: "center", gap: Spacing.xl },
  resultStat: { alignItems: "center", flex: 1, paddingTop: Spacing.xs },
  resultValue: { fontSize: 36, fontWeight: "700", fontFamily: "Nunito_700Bold", lineHeight: 44 },
  resultLabel: { fontSize: 13, fontFamily: "Nunito_400Regular", marginTop: Spacing.xs },
  resultDivider: { width: 1, height: 40 },
  completeButton: { width: "100%" },
  audioStudyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, borderRadius: 999, borderWidth: 1.5, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  audioStudyText: { fontSize: 15, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", textAlign: "center", marginBottom: Spacing.sm },
  emptySub: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xl },
  featuredWordCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    width: "100%",
    alignItems: "center",
    gap: Spacing.xs,
  },
  featuredWordHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.xs },
  featuredWordTitle: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  featuredWordChinese: { fontSize: 32, fontFamily: "Nunito_700Bold", textAlign: "center", lineHeight: 44 },
  featuredWordSpeakRow: { marginVertical: Spacing.xs },
  featuredWordPinyin: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
  featuredWordTranslation: { fontSize: 14, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
  featuredWordExample: {
    borderTopWidth: 1,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    width: "100%",
    gap: Spacing.xs,
  },
  featuredWordExText: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  featuredWordExTrans: { fontSize: 12, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 18 },
  quoteCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.lg, width: "100%", alignItems: "center", gap: Spacing.xs },
  quoteFlag: { fontSize: 28 },
  quoteText: { fontSize: 16, fontFamily: "Nunito_700Bold", textAlign: "center" },
  quoteSpeakRow: { marginTop: Spacing.xs },
  quotePinyin: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center" },
  quoteJa: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  quoteSource: { fontSize: 12, fontFamily: "Nunito_400Regular", textAlign: "right", alignSelf: "flex-end", marginTop: Spacing.xs },
  summaryCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  summaryTitle: { fontSize: 15, fontFamily: "Nunito_700Bold", flex: 1 },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  summaryBadgeText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  summarySub: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  summaryRoundsList: { gap: Spacing.xs, marginTop: Spacing.xs },
  summaryRoundRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  summaryRoundLeft: { flex: 1 },
  summaryRoundLabel: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  summaryRoundScore: { fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 2 },
  summaryRoundPercent: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  summaryUnmemorizedSection: { marginTop: Spacing.md, gap: Spacing.xs },
  summaryUnmemorizedTitle: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  summaryUnmemorizedList: { gap: Spacing.xs },
  summaryUnmemorizedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  summaryUnmemorizedTextWrap: { flex: 1 },
  summaryUnmemorizedHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm },
  summaryUnmemorizedId: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  summaryUnmemorizedChinese: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  summaryUnmemorizedPinyin: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 2 },
  summaryAllDone: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
