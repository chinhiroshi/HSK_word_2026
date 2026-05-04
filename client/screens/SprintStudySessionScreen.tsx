import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsMemorized, markAsUnmemorized } from "@/lib/storage";
import { speakChinese, stopSpeaking } from "@/lib/speech";
import { useSprint } from "@/contexts/SprintContext";
import { getQuoteForStamp } from "@/data/quotes";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import { getPandaImage } from "@/data/pandaStamps";

type RouteProps = RouteProp<SprintStackParamList, "SprintStudySession">;
type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

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

  const stampScale = useSharedValue(0);
  const stampOpacity = useSharedValue(0);
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampScale.value }],
    opacity: stampOpacity.value,
  }));

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

    if (sessionMode === "audio-cards-only") {
      // Start directly at audio-cards with words not yet audio-memorized
      const unmemorized = study.filter((w) => !w.audioMemorized);
      setCardWords(unmemorized);
      setCurrentIndex(0);
      setRevealLevel(0);
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

  // Auto-play audio in audio-cards and reset reveal level on card change
  useEffect(() => {
    if (phase !== "audio-cards") return;
    setRevealLevel(0);
    if (!currentCardWord) return;
    const speak = async () => {
      const text = currentCardWord.exampleSentence
        ? `${currentCardWord.word}。${currentCardWord.exampleSentence}`
        : currentCardWord.word;
      await speakChinese(text);
    };
    speak();
    return () => {
      stopSpeaking().catch(() => {});
    };
  }, [currentIndex, phase]);

  // Reset per-row reveal state when switching filter tabs (全部 / まだ / 覚えた / 苦手歴)
  // so that meanings/words shown via the eye icon don't carry over across tabs.
  useEffect(() => {
    setRevealedIds(new Set());
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

  const advanceOrFinish = (newIndex: number) => {
    if (newIndex < cardWords.length) {
      setCurrentIndex(newIndex);
    } else {
      setPhase("complete");
    }
  };

  const handleCardChoice = async (choice: "memorized" | "unmemorized") => {
    if (!currentCardWord) return;
    Haptics.impactAsync(
      choice === "memorized"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    // audio-cards always uses audio type
    await (choice === "memorized"
      ? markAsMemorized(currentCardWord.id, "audio")
      : markAsUnmemorized(currentCardWord.id, "audio"));
    setAudioChoices((prev) => ({ ...prev, [currentCardWord.id]: choice }));
    advanceOrFinish(currentIndex + 1);
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
      const stampImage = getPandaImage(studiedCellIndex, isSpecial);
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
              <ThemedText style={styles.stampLabel}>{t("stamp_earned")}</ThemedText>
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
                source={getPandaImage(studiedCellIndex, sprintData?.specialStampPositions?.includes(studiedCellIndex) ?? false)}
                style={{ width: 150, height: 150, borderRadius: 75 }}
                resizeMode="cover"
              />
            </View>
            <ThemedText style={styles.stampLabel}>{t("stamp_earned")}</ThemedText>
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeIn} style={[styles.completeContainer, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
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
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <ThemedText style={[styles.resultValue, { color: Colors.light.success }]}>
                {memorizedCount}
              </ThemedText>
              <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>{t("memorized_label")}</ThemedText>
            </View>
            <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />
            <View style={styles.resultStat}>
              <ThemedText style={[styles.resultValue, { color: Colors.light.alert }]}>
                {totalCount - memorizedCount}
              </ThemedText>
              <ThemedText style={[styles.resultLabel, { color: theme.textSecondary }]}>{t("not_memorized_label")}</ThemedText>
            </View>
          </View>
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
            const speakText = item.exampleSentence
              ? `${item.word}。${item.exampleSentence}`
              : item.word;

            // --- Audio-list row (3-level eye toggle: hidden → Chinese → +Japanese translation) ---
            if (isAudioListPhase) {
              const isWordRevealed = allRevealed || revealedIds.has(item.id);
              const isTranslationRevealed = translationRevealedIds.has(item.id);
              const exampleTranslation =
                lang === "en" && item.exampleEnglish ? item.exampleEnglish : item.exampleTranslation;
              const wordTranslation =
                lang === "en" && item.translationEn ? item.translationEn : item.translation;
              return (
                <View style={[styles.wordRow, { borderBottomColor: theme.border, backgroundColor: isUnmemorized ? Colors.light.alert + "14" : theme.backgroundDefault }]}>
                  <View style={[styles.wordNumCircleSmall, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.wordNumCircleTextSmall, { color: theme.textSecondary }]}>
                      {globalIdx}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => speakChinese(speakText)}
                    style={[styles.speakCircle, { backgroundColor: Colors.light.secondary }]}
                  >
                    <Feather name="volume-2" size={20} color="#fff" />
                  </Pressable>
                  {isWordRevealed ? (
                    <View style={styles.wordInfoCol}>
                      <ThemedText style={styles.wordRowText}>{item.word}</ThemedText>
                      <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{item.pinyin}</ThemedText>
                      {item.exampleSentence ? (
                        <ThemedText style={[styles.wordRowExample, { color: theme.textSecondary }]} numberOfLines={2}>
                          {item.exampleSentence}
                        </ThemedText>
                      ) : null}
                      {isTranslationRevealed ? (
                        <View style={styles.audioTranslationBlock}>
                          <ThemedText style={[styles.audioTranslationWord, { color: theme.text }]}>
                            {wordTranslation}
                          </ThemedText>
                          {exampleTranslation ? (
                            <ThemedText style={[styles.audioTranslationExample, { color: theme.textSecondary }]}>
                              {exampleTranslation}
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
                        // 3-level cycle: hidden(0) → Chinese(1) → +Japanese(2) → hidden
                        const wordOn = revealedIds.has(item.id);
                        const transOn = translationRevealedIds.has(item.id);
                        if (!wordOn) {
                          setRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.add(item.id);
                            return next;
                          });
                        } else if (!transOn) {
                          setTranslationRevealedIds((prev) => {
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
                          setTranslationRevealedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(item.id);
                            return next;
                          });
                        }
                      }}
                      style={styles.actionIconBtn}
                    >
                      <Feather
                        name={isWordRevealed ? "eye" : "eye-off"}
                        size={18}
                        color={
                          isTranslationRevealed
                            ? Colors.light.secondary
                            : isWordRevealed
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
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
                      <SpeakButton text={speakText} size="small" />
                    </View>
                    {item.exampleSentence ? (
                      <ThemedText style={[styles.wordRowExample, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.exampleSentence}
                      </ThemedText>
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
            <View style={[styles.phaseBadge, { backgroundColor: badgeBg }]}>
              <Feather name={badgeIcon} size={13} color={badgeColor} />
              <ThemedText style={[styles.phaseBadgeText, { color: badgeColor }]}>
                {badgeLabel}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
            {currentIndex + 1} / {cardWords.length}
          </ThemedText>
        </View>

        <View style={styles.progressBarWrapper}>
          <ProgressBar progress={cardProgress} height={6} />
        </View>

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
          />
        </Animated.View>

        {/* Progressive choice buttons */}
        {revealLevel < 2 ? (
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
    </ThemedView>
  );
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
}

function AudioCard({ word, revealLevel, theme, wordIndex, totalWords }: AudioCardProps) {
  const origNum = getOriginalWordNum(word.id);
  const { lang } = useI18n();
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

      {/* Level 0: Audio only */}
      {revealLevel === 0 ? (
        <View style={styles.audioHiddenContent}>
          <View style={[styles.audioIconContainer, { backgroundColor: Colors.light.secondary + "18" }]}>
            <SpeakButton
              text={word.exampleSentence ? `${word.word}。${word.exampleSentence}` : word.word}
              size="large"
            />
          </View>
          <ThemedText style={[styles.audioPrompt, { color: theme.textSecondary }]}>
            音声を聴いて答えましょう
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
              text={word.exampleSentence ? `${word.word}。${word.exampleSentence}` : word.word}
              size="medium"
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
          {word.exampleSentence ? (
            <View style={styles.exampleSection}>
              <View style={styles.exampleRow}>
                <ThemedText style={[styles.exampleChinese, { color: theme.text }]}>
                  {word.exampleSentence}
                </ThemedText>
                <SpeakButton text={word.exampleSentence} size="small" />
              </View>
              <ThemedText style={[styles.exampleJp, { color: theme.textSecondary }]}>
                {lang === "en" && word.exampleEnglish ? word.exampleEnglish : word.exampleTranslation}
              </ThemedText>
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
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  actionIconBtn: { padding: 6, borderRadius: 20 },
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
  audioTranslationBlock: {
    marginTop: 4,
    gap: 2,
  },
  audioTranslationWord: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  audioTranslationExample: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },

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
  choiceButtonsWrapper: { gap: Spacing.sm },
  choiceButtons: { flexDirection: "row", gap: Spacing.md },
  choiceButton: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 2, minHeight: 80 },
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
});
