import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData } from "@/lib/storage";

export default function AudioPlaybackScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [filterUnmemorized, setFilterUnmemorized] = useState(false);
  const [startPosition, setStartPosition] = useState("1");
  
  const isCancelledRef = useRef(false);

  const loadWords = useCallback(async () => {
    await initializeData();
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const playableWords = useMemo(() => {
    if (filterUnmemorized) {
      return words.filter((w) => (w.unmemorizedCount || 0) > 0);
    }
    return words;
  }, [words, filterUnmemorized]);

  const speak = (text: string, language: string): Promise<void> => {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language,
        onDone: resolve,
        onError: () => resolve(),
        onStopped: resolve,
      });
    });
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const playWordSequence = async (word: Word) => {
    if (isCancelledRef.current) return;

    setCurrentPhase("中国語 (1回目)");
    await speak(word.word, "zh-CN");
    if (isCancelledRef.current) return;

    await delay(500);
    if (isCancelledRef.current) return;

    setCurrentPhase("日本語");
    await speak(word.translation, "ja-JP");
    if (isCancelledRef.current) return;

    await delay(500);
    if (isCancelledRef.current) return;

    for (let i = 0; i < 3; i++) {
      if (isCancelledRef.current) return;
      setCurrentPhase(`中国語 (${i + 2}回目)`);
      await speak(word.word, "zh-CN");
      if (isCancelledRef.current) return;
      await delay(300);
    }

    if (isCancelledRef.current) return;
    await delay(500);

    setCurrentPhase("英語");
    await speak(word.exampleTranslation || word.translation, "en-US");
    
    await delay(800);
  };

  const startPlayback = async () => {
    if (playableWords.length === 0) return;

    isCancelledRef.current = false;
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const startIdx = Math.max(0, parseInt(startPosition, 10) - 1) || 0;
    
    for (let i = startIdx; i < playableWords.length; i++) {
      if (isCancelledRef.current) break;
      
      setCurrentWordIndex(i);
      await playWordSequence(playableWords[i]);
    }

    setIsPlaying(false);
    setCurrentPhase("");
  };

  const stopPlayback = () => {
    isCancelledRef.current = true;
    Speech.stop();
    setIsPlaying(false);
    setCurrentPhase("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterUnmemorized(!filterUnmemorized);
    setStartPosition("1");
  };

  const currentWord = playableWords[currentWordIndex];
  const unmemorizedCount = words.filter((w) => (w.unmemorizedCount || 0) > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText style={styles.sectionTitle}>再生設定</ThemedText>

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              未暗記のみ
            </ThemedText>
            <Pressable
              onPress={toggleFilter}
              style={[
                styles.toggleButton,
                { 
                  backgroundColor: filterUnmemorized 
                    ? Colors.light.secondary 
                    : theme.backgroundSecondary 
                },
              ]}
            >
              <ThemedText 
                style={[
                  styles.toggleText, 
                  { color: filterUnmemorized ? "#FFFFFF" : theme.textSecondary }
                ]}
              >
                {filterUnmemorized ? `ON (${unmemorizedCount}語)` : "OFF"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              開始位置
            </ThemedText>
            <View style={styles.positionInputContainer}>
              <TextInput
                value={startPosition}
                onChangeText={setStartPosition}
                keyboardType="number-pad"
                style={[
                  styles.positionInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                  },
                ]}
                editable={!isPlaying}
              />
              <ThemedText style={[styles.positionSuffix, { color: theme.textSecondary }]}>
                / {playableWords.length}
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              順序: 中国語1回 → 日本語1回 → 中国語3回 → 英語1回
            </ThemedText>
          </View>
        </View>

        <View style={[styles.playerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText style={styles.sectionTitle}>再生</ThemedText>

          {isPlaying && currentWord ? (
            <View style={styles.nowPlaying}>
              <View style={[styles.playingIndicator, { backgroundColor: Colors.light.primary }]}>
                <Feather name="volume-2" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.playingInfo}>
                <ThemedText style={styles.playingWord}>{currentWord.word}</ThemedText>
                <ThemedText style={[styles.playingPhase, { color: theme.textSecondary }]}>
                  {currentPhase}
                </ThemedText>
                <ThemedText style={[styles.playingProgress, { color: theme.textSecondary }]}>
                  {currentWordIndex + 1} / {playableWords.length}
                </ThemedText>
              </View>
            </View>
          ) : (
            <View style={styles.readyState}>
              <Feather name="headphones" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.readyText, { color: theme.textSecondary }]}>
                {playableWords.length > 0 
                  ? `${playableWords.length}語の単語を再生できます`
                  : "再生できる単語がありません"
                }
              </ThemedText>
            </View>
          )}

          <View style={styles.controls}>
            {isPlaying ? (
              <Pressable
                onPress={stopPlayback}
                style={[styles.controlButton, styles.stopButton]}
              >
                <Feather name="square" size={24} color="#FFFFFF" />
                <ThemedText style={styles.controlButtonText}>停止</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={startPlayback}
                style={[
                  styles.controlButton, 
                  styles.playButton,
                  playableWords.length === 0 && styles.disabledButton,
                ]}
                disabled={playableWords.length === 0 || loading}
              >
                <Feather name="play" size={24} color="#FFFFFF" />
                <ThemedText style={styles.controlButtonText}>再生開始</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  settingsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },
  toggleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  positionInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  positionInput: {
    width: 60,
    height: 36,
    borderRadius: BorderRadius.md,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },
  positionSuffix: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    flex: 1,
  },
  playerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  playingIndicator: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  playingInfo: {
    flex: 1,
  },
  playingWord: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  playingPhase: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  playingProgress: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  readyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  readyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  controls: {
    alignItems: "center",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  playButton: {
    backgroundColor: Colors.light.primary,
  },
  stopButton: {
    backgroundColor: Colors.light.secondary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
