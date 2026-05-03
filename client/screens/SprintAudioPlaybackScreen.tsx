import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsUnmemorized, getSelectedHskLevel } from "@/lib/storage";
import { capture as captureAnalytics } from "@/lib/analytics";
import { speakWithLanguage, stopSpeaking } from "@/lib/speech";
import { useSprint } from "@/contexts/SprintContext";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";

type RouteProps = RouteProp<SprintStackParamList, "SprintAudioPlayback">;

export default function SprintAudioPlaybackScreen() {
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { getTodayStudyWords } = useSprint();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [playbackRate] = useState(1.0);
  const [isTextStruggleMode, setIsTextStruggleMode] = useState(false);

  const isCancelledRef = useRef(false);

  // 文字学習で苦手フラグが立った単語を優先。なければ音声未暗記単語全体。
  const applyPlaybackFilter = (todayWords: Word[]) => {
    const textStruggled = todayWords.filter((w) => (w.textUnmemorizedCount ?? 0) > 0);
    if (textStruggled.length > 0) {
      setIsTextStruggleMode(true);
      setWords(textStruggled);
    } else {
      setIsTextStruggleMode(false);
      setWords(todayWords.filter((w) => !w.audioMemorized));
    }
  };

  const loadWords = useCallback(async () => {
    await initializeData();
    const all = await getWords();
    const todayWords = getTodayStudyWords(all);
    applyPlaybackFilter(todayWords);
    setLoading(false);
  }, [getTodayStudyWords]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      stopSpeaking().catch(() => {});
    };
  }, []);

  const speak = (text: string, language: string): Promise<void> =>
    speakWithLanguage(text, language, playbackRate);

  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const playWordSequence = async (word: Word) => {
    if (isCancelledRef.current) return;
    setCurrentPhase(t("phase_chinese_word"));
    await speak(word.word, "zh-CN");
    if (isCancelledRef.current) return;
    await delay(400);

    if (isCancelledRef.current) return;
    setCurrentPhase(t("phase_japanese"));
    await speak(word.translation, "ja-JP");
    if (isCancelledRef.current) return;
    await delay(400);

    for (let i = 0; i < 2; i++) {
      if (isCancelledRef.current) return;
      setCurrentPhase(`中国語例文 (${i + 1}/2)`);
      await speak(word.exampleSentence, "zh-CN");
      if (isCancelledRef.current) return;
      await delay(250);
    }

    if (isCancelledRef.current) return;
    setCurrentPhase(t("phase_japanese_example"));
    await speak(word.exampleTranslation, "ja-JP");
    if (isCancelledRef.current) return;
    await delay(400);

    for (let i = 0; i < 2; i++) {
      if (isCancelledRef.current) return;
      setCurrentPhase(`中国語例文 (${i + 3}/4)`);
      await speak(word.exampleSentence, "zh-CN");
      if (isCancelledRef.current) return;
      await delay(250);
    }

    if (word.exampleEnglish) {
      if (isCancelledRef.current) return;
      setCurrentPhase(t("phase_english_example"));
      await speak(word.exampleEnglish, "en-US");
    }
    await delay(700);
  };

  const startPlayback = async () => {
    if (words.length === 0) return;
    isCancelledRef.current = false;
    setIsPlaying(true);
    setCurrentWordIndex(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const hskLevel = await getSelectedHskLevel();
      captureAnalytics("audio_play", {
        source: "sprint_audio_playback",
        hsk_level: hskLevel,
        word_count: words.length,
        text_struggle_mode: isTextStruggleMode,
      });
    } catch {}

    for (let i = 0; i < words.length; i++) {
      if (isCancelledRef.current) break;
      setCurrentWordIndex(i);
      await playWordSequence(words[i]);
    }

    if (!isCancelledRef.current) {
      setIsPlaying(false);
      setCurrentPhase("");
    }
  };

  const stopPlayback = () => {
    isCancelledRef.current = true;
    stopSpeaking().catch(() => {});
    setIsPlaying(false);
    setCurrentPhase("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMarkUnmemorized = async () => {
    const word = words[currentWordIndex];
    if (!word) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAsUnmemorized(word.id, "audio");
    const all = await getWords();
    const todayWords = getTodayStudyWords(all);
    applyPlaybackFilter(todayWords);
  };

  const currentWord = words[currentWordIndex];
  const progress = words.length > 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("preparing")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (words.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
        <View style={styles.centered}>
          <Feather name="check-circle" size={56} color={Colors.light.success} />
          <ThemedText style={styles.emptyTitle}>{t("no_playable_words")}</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            今日の単語がすべて音声暗記済みです。
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: safeHeaderPadding + Spacing.lg, paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <View style={[styles.playerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: Colors.light.secondary + "20" }]}>
              <Feather name="headphones" size={13} color={Colors.light.secondary} />
              <ThemedText style={[styles.badgeText, { color: Colors.light.secondary }]}>{t("continuous_playback_badge")}</ThemedText>
            </View>
            <ThemedText style={[styles.wordCount, { color: theme.textSecondary }]}>
              {words.length}語
            </ThemedText>
          </View>
          <View style={[styles.filterBadge, { backgroundColor: isTextStruggleMode ? Colors.light.alert + "18" : theme.backgroundSecondary }]}>
            <Feather
              name={isTextStruggleMode ? "flag" : "book"}
              size={12}
              color={isTextStruggleMode ? Colors.light.alert : theme.textSecondary}
            />
            <ThemedText style={[styles.filterBadgeText, { color: isTextStruggleMode ? Colors.light.alert : theme.textSecondary }]}>
              {isTextStruggleMode ? t("struggle_words") : t("audio_unmemorized")}
            </ThemedText>
          </View>

          {isPlaying && currentWord ? (
            <View style={styles.nowPlaying}>
              <View style={[styles.playingIcon, { backgroundColor: theme.primary }]}>
                <Feather name="volume-2" size={22} color="#fff" />
              </View>
              <View style={styles.playingInfo}>
                <ThemedText style={styles.playingWord}>{currentWord.word}</ThemedText>
                <ThemedText style={[styles.playingPinyin, { color: theme.primary }]}>{currentWord.pinyin}</ThemedText>
                <ThemedText style={[styles.playingPhase, { color: theme.textSecondary }]}>{currentPhase}</ThemedText>
              </View>
            </View>
          ) : null}

          {isPlaying ? (
            <View style={styles.progressRow}>
              <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
                {currentWordIndex + 1} / {words.length}
              </ThemedText>
              <View style={styles.progressBar}>
                <ProgressBar progress={progress} height={5} />
              </View>
            </View>
          ) : null}

          {!isPlaying ? (
            <View style={styles.readyState}>
              <Feather name="headphones" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.readyText, { color: theme.textSecondary }]}>
                今日の音声未暗記 {words.length}語を連続再生します
              </ThemedText>
              <ThemedText style={[styles.readySubText, { color: theme.textSecondary }]}>
                中国語→日本語訳→例文×4→英語の順で再生
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.controls}>
            {isPlaying ? (
              <View style={styles.playingControls}>
                <Pressable
                  testID="button-mark-unmemorized"
                  onPress={handleMarkUnmemorized}
                  style={[styles.controlButton, { backgroundColor: Colors.light.alert }]}
                >
                  <Feather name="flag" size={18} color="#fff" />
                  <ThemedText style={styles.controlButtonText}>{t("not_memorized_btn")}</ThemedText>
                </Pressable>
                <Pressable
                  testID="button-stop-playback"
                  onPress={stopPlayback}
                  style={[styles.controlButton, { backgroundColor: theme.textSecondary }]}
                >
                  <Feather name="square" size={18} color="#fff" />
                  <ThemedText style={styles.controlButtonText}>{t("stop")}</ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID="button-start-playback"
                onPress={startPlayback}
                style={[styles.controlButton, styles.playButton, { backgroundColor: theme.primary }]}
                disabled={words.length === 0 || loading}
              >
                <Feather name="play" size={22} color="#fff" />
                <ThemedText style={styles.controlButtonText}>{t("play")}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.wordListCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText style={[styles.wordListTitle, { color: theme.textSecondary }]}>
            再生リスト ({words.length}語)
          </ThemedText>
          {words.map((word, index) => (
            <View
              key={word.id}
              style={[
                styles.wordRow,
                { borderColor: theme.border },
                isPlaying && index === currentWordIndex
                  ? { backgroundColor: theme.primary + "12" }
                  : {},
              ]}
            >
              <ThemedText style={[styles.wordRowNum, { color: theme.textSecondary }]}>{index + 1}</ThemedText>
              <View style={styles.wordRowInfo}>
                <ThemedText style={styles.wordRowChinese}>{word.word}</ThemedText>
                <ThemedText style={[styles.wordRowPinyin, { color: theme.primary }]}>{word.pinyin}</ThemedText>
              </View>
              <ThemedText style={[styles.wordRowTrans, { color: theme.textSecondary }]} numberOfLines={1}>
                {word.translation}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing["3xl"] },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  playerCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  filterBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: "flex-start", marginBottom: Spacing.sm },
  filterBadgeText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  wordCount: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  nowPlaying: { flexDirection: "row", gap: Spacing.md, alignItems: "center" },
  playingIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  playingInfo: { flex: 1, gap: 2 },
  playingWord: { fontSize: 24, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  playingPinyin: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  playingPhase: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  progressText: { fontSize: 12, fontFamily: "Nunito_400Regular", minWidth: 40, textAlign: "right" },
  progressBar: { flex: 1 },
  readyState: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  readyText: { fontSize: 15, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
  readySubText: { fontSize: 12, fontFamily: "Nunito_400Regular", textAlign: "center" },
  controls: {},
  playingControls: { flexDirection: "row", gap: Spacing.md },
  controlButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  playButton: {},
  controlButtonText: { fontSize: 15, fontFamily: "Nunito_700Bold", color: "#fff" },
  wordListCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  wordListTitle: { fontSize: 13, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.xs },
  wordRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
  },
  wordRowNum: { fontSize: 12, fontFamily: "Nunito_400Regular", width: 20, textAlign: "right" },
  wordRowInfo: { flex: 1, gap: 1 },
  wordRowChinese: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  wordRowPinyin: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  wordRowTrans: { fontSize: 13, fontFamily: "Nunito_400Regular", maxWidth: 100 },
  emptyTitle: { fontSize: 20, fontWeight: "600", fontFamily: "Nunito_600SemiBold", marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
});
