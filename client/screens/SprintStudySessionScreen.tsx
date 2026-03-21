import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TouchableOpacity,
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

// text-cards removed: flow is now text-list → audio-list → audio-cards → complete
type Phase = "text-list" | "audio-list" | "audio-cards" | "complete";
// 0 = audio only, 1 = kanji revealed, 2 = meaning revealed
type RevealLevel = 0 | 1 | 2;
type ListFilter = "all" | "memorized" | "unmemorized" | "struggled";

export default function SprintStudySessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { sprintData, completePhase, getStudyWords, getCellPhaseProgress } = useSprint();

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
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isPartialComplete, setIsPartialComplete] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);
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

  const isAudioPhase = phase === "audio-list" || phase === "audio-cards";
  const choices = isAudioPhase ? audioChoices : textChoices;

  const currentCardWord = cardWords[currentIndex] ?? null;
  const cardProgress = cardWords.length > 0 ? (currentIndex / cardWords.length) * 100 : 0;

  // Study = text-list + audio-list+cards; audio-only / text-only = just one phase
  const phaseTotal = sessionMode === "study" ? 2 : 1;
  const phaseNum = isAudioPhase && sessionMode === "study" ? 2 : 1;
  const badgeLabel = isAudioPhase ? "音声学習" : "文字学習";
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
    const phaseArg =
      sessionMode === "text-only" ? "text" :
      (sessionMode === "audio-only" || sessionMode === "audio-cards-only") ? "audio" : "both";
    completePhase(phaseArg, cellIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-play audio in audio-cards and reset reveal level on card change
  useEffect(() => {
    if (phase !== "audio-cards") return;
    setRevealLevel(0);
    if (!currentCardWord) return;
    let cancelled = false;
    const speak = async () => {
      await speakChinese(currentCardWord.word);
    };
    speak();
    return () => {
      cancelled = true;
      stopSpeaking().catch(() => {});
    };
  }, [currentIndex, phase]);

  // Dynamic header: eye-off button for audio list
  useEffect(() => {
    if (phase === "audio-list") {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setAllRevealed((prev) => !prev)}
            style={{ marginRight: 4, padding: 8 }}
          >
            <Feather
              name={allRevealed ? "eye" : "eye-off"}
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
    // Always use "audio" type for audio-list, "text" for text-list
    const type = isAudioPhase ? "audio" : "text";
    await (choice === "memorized"
      ? markAsMemorized(wordId, type)
      : markAsUnmemorized(wordId, type));
    if (isAudioPhase) {
      setAudioChoices((prev) => ({ ...prev, [wordId]: choice }));
    } else {
      setTextChoices((prev) => ({ ...prev, [wordId]: choice }));
    }
  };

  const handleListNext = () => {
    if (phase === "text-list") {
      // Transition directly to audio-list (no text-cards phase)
      setAllRevealed(false);
      setRevealedIds(new Set());
      setListFilter("all");
      if (sessionMode === "study") {
        setPhase("audio-list");
      } else {
        setPhase("complete");
      }
    } else if (phase === "audio-list") {
      // Words not marked memorized in audio-list → audio-cards
      const unmemorizedWords = words.filter((w) => audioChoices[w.id] !== "memorized");
      if (unmemorizedWords.length > 0) {
        setCardWords(unmemorizedWords);
        setCurrentIndex(0);
        setRevealLevel(0);
        setPhase("audio-cards");
      } else {
        setPhase("complete");
      }
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
    const phaseArg =
      sessionMode === "text-only" ? "text" :
      (sessionMode === "audio-only" || sessionMode === "audio-cards-only") ? "audio" : "both";
    const advanced = await completePhase(phaseArg, cellIndex);
    setCompleting(false);
    if (advanced) {
      triggerStamp(() => navigation.navigate("SprintHome"));
    } else {
      setIsPartialComplete(true);
    }
  };

  // ----- LOADING -----
  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>準備中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // ----- COMPLETE (partial) -----
  if (phase === "complete" && isPartialComplete) {
    const donePhase =
      sessionMode === "text-only" ? "文字リスト" :
      sessionMode === "audio-only" ? "音声リスト" : "音声カード";
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

  // ----- COMPLETE (full) -----
  if (phase === "complete") {
    const targetPos = cellIndex ?? sprintData?.currentPosition ?? -1;
    const savedProgress = targetPos >= 0 ? getCellPhaseProgress(targetPos) : { text: false, audio: false };
    const willGetStamp =
      sessionMode === "study" ||
      (sessionMode === "text-only" && savedProgress.audio) ||
      (sessionMode === "audio-only" && savedProgress.text) ||
      (sessionMode === "audio-cards-only" && savedProgress.text);
    const phaseDoneLabel =
      sessionMode === "text-only" ? "文字リスト" :
      sessionMode === "audio-only" ? "音声リスト" :
      sessionMode === "audio-cards-only" ? "音声カード" : "";

    return (
      <ThemedView style={styles.container}>
        {stampVisible ? (
          <Animated.View style={[styles.stampOverlay, stampStyle]}>
            <View style={[styles.stampCircle, { backgroundColor: Colors.light.success }]}>
              <PlantIcon size={80} color="#fff" />
            </View>
            <ThemedText style={styles.stampLabel}>スタンプ獲得！</ThemedText>
          </Animated.View>
        ) : null}
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

  // ----- LIST PHASE (text-list or audio-list) -----
  if (phase === "text-list" || phase === "audio-list") {
    const memorizedInList = Object.values(choices).filter((v) => v === "memorized").length;
    const unmemorizedInList = Object.values(choices).filter((v) => v === "unmemorized").length;

    // "struggled" uses stored history counts per phase type
    const struggledInList = words.filter((w) =>
      phase === "audio-list"
        ? (w.audioUnmemorizedCount ?? 0) > 0
        : (w.textUnmemorizedCount ?? 0) > 0
    ).length;

    const filteredWords = words.filter((w) => {
      if (listFilter === "memorized") return choices[w.id] === "memorized";
      if (listFilter === "unmemorized") return choices[w.id] === "unmemorized";
      if (listFilter === "struggled") {
        return phase === "audio-list"
          ? (w.audioUnmemorizedCount ?? 0) > 0
          : (w.textUnmemorizedCount ?? 0) > 0;
      }
      return true;
    });

    // audio-list → audio-cards; text-list → audio-list (no cards phase for text)
    const nextCardCount = phase === "audio-list"
      ? words.filter((w) => audioChoices[w.id] !== "memorized").length
      : 0;
    const nextButtonLabel = phase === "audio-list"
      ? nextCardCount > 0 ? `カード練習へ (${nextCardCount}語)` : "完了"
      : sessionMode === "study" ? "音声学習へ" : "完了";

    return (
      <ThemedView style={styles.container}>
        {/* Filter tabs */}
        <View style={[styles.filterRow, { paddingTop: headerHeight + Spacing.md, borderBottomColor: theme.border }]}>
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
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          renderItem={({ item }) => {
            const globalIdx = words.indexOf(item) + 1;
            const choice = choices[item.id];
            const isMemorized = choice === "memorized";
            const isUnmemorized = choice === "unmemorized";

            if (phase === "audio-list") {
              const isWordRevealed = allRevealed || revealedIds.has(item.id);
              return (
                <View style={[styles.wordRow, { borderBottomColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
                  <View style={[styles.wordNumCircleSmall, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.wordNumCircleTextSmall, { color: theme.textSecondary }]}>
                      {globalIdx}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => speakChinese(item.word)}
                    style={[styles.speakCircle, { backgroundColor: Colors.light.secondary }]}
                  >
                    <Feather name="volume-2" size={20} color="#fff" />
                  </Pressable>
                  {isWordRevealed ? (
                    <View style={styles.wordInfoCol}>
                      <ThemedText style={styles.wordRowText}>{item.word}</ThemedText>
                      <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{item.pinyin}</ThemedText>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => {
                        setRevealedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      style={styles.actionIconBtn}
                    >
                      <Feather
                        name={isWordRevealed ? "eye" : "eye-off"}
                        size={18}
                        color={isWordRevealed ? theme.primary : theme.textSecondary}
                      />
                    </Pressable>
                    <Pressable onPress={() => handleChoiceList(item.id, "unmemorized")} style={styles.actionIconBtn}>
                      <Feather name="flag" size={18} color={isUnmemorized ? Colors.light.alert : theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleChoiceList(item.id, "memorized")} style={styles.actionIconBtn}>
                      <Feather
                        name="check"
                        size={18}
                        color={isMemorized ? Colors.light.success : theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            }

            // text-list
            return (
              <View style={[styles.wordRow, { borderBottomColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
                <View style={[styles.wordNumCircleSmall, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={[styles.wordNumCircleTextSmall, { color: theme.textSecondary }]}>
                    {globalIdx}
                  </ThemedText>
                </View>
                <View style={styles.wordInfoCol}>
                  <View style={styles.wordRowHeaderLine}>
                    <ThemedText style={styles.wordRowText}>{item.word}</ThemedText>
                    <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{item.pinyin}</ThemedText>
                    <SpeakButton text={item.word} size="small" />
                  </View>
                  {item.exampleSentence ? (
                    <ThemedText style={[styles.wordRowExample, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.exampleSentence}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <Pressable onPress={() => handleChoiceList(item.id, "unmemorized")} style={styles.actionIconBtn}>
                    <Feather name="flag" size={18} color={isUnmemorized ? Colors.light.alert : theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleChoiceList(item.id, "memorized")} style={styles.actionIconBtn}>
                    <Feather
                      name="check"
                      size={18}
                      color={isMemorized ? Colors.light.success : theme.textSecondary}
                    />
                  </Pressable>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </View>
              </View>
            );
          }}
        />

        {/* Next button */}
        <View style={[styles.listNextBar, { paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
          <Button testID="button-list-next" onPress={handleListNext} style={{ flex: 1 }}>
            {nextButtonLabel}
          </Button>
        </View>
      </ThemedView>
    );
  }

  // ----- AUDIO CARDS PHASE -----
  if (!currentCardWord) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
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
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["3xl"],
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
            {sessionMode === "study" ? (
              <ThemedText style={[styles.phaseStep, { color: theme.textSecondary }]}>
                {phaseNum}/{phaseTotal}
              </ThemedText>
            ) : null}
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
                testID="button-reveal-next"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRevealLevel((prev) => (prev < 2 ? ((prev + 1) as RevealLevel) : 2));
                }}
                style={[
                  styles.choiceButton,
                  { backgroundColor: Colors.light.alert + "10", borderColor: Colors.light.alert + "60" },
                ]}
              >
                <Feather name="eye" size={20} color={Colors.light.alert} />
                <ThemedText style={[styles.choiceLabel, { color: Colors.light.alert }]}>
                  {revealLevel === 0 ? "文字を見る" : "意味を見る"}
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
              testID="button-unmemorized-early"
              onPress={() => handleCardChoice("unmemorized")}
              style={[styles.earlyUnmemorizedButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="flag" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.earlyUnmemorizedLabel, { color: theme.textSecondary }]}>
                初めから覚えていない
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.choiceButtons}>
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
                まだ
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function getOriginalWordNum(wordId: string): number {
  const parts = wordId.split("_");
  return parseInt(parts[parts.length - 1], 10) || 0;
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

interface AudioCardProps {
  word: Word;
  revealLevel: RevealLevel;
  theme: ReturnType<typeof useTheme>["theme"];
  wordIndex: number;
  totalWords: number;
}

function AudioCard({ word, revealLevel, theme, wordIndex, totalWords }: AudioCardProps) {
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

      {/* Level 0: Audio only */}
      {revealLevel === 0 ? (
        <View style={styles.audioHiddenContent}>
          <View style={[styles.audioIconContainer, { backgroundColor: Colors.light.secondary + "18" }]}>
            <SpeakButton text={word.word} size="large" />
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
            <ThemedText style={styles.wordText}>{word.word}</ThemedText>
            <SpeakButton text={word.word} size="medium" />
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
  actionIconBtn: { padding: 6 },

  // List next button bar
  listNextBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
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
  wordHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  wordText: { fontSize: 42, fontWeight: "700", fontFamily: "Nunito_700Bold", flex: 1 },
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
