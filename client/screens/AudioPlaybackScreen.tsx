import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { speakWithLanguage, stopSpeaking } from "@/lib/speech";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData, markAsUnmemorized } from "@/lib/storage";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";

export default function AudioPlaybackScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isPremium, freeWordsLimit, isFreeLevel } = useSubscription();
  const { t } = useI18n();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [filterUnmemorized, setFilterUnmemorized] = useState(false);
  const [startPosition, setStartPosition] = useState("1");
  const [endPosition, setEndPosition] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpokenText, setShowSpokenText] = useState(true);
  const [currentSpokenText, setCurrentSpokenText] = useState("");
  const [markedWords, setMarkedWords] = useState<{id: string; word: string; pinyin: string; translation: string}[]>([]);
  const flashAnim = useRef(new Animated.Value(0)).current;
  
  const isCancelledRef = useRef(false);

  const SPEED_MIN = 0.5;
  const SPEED_MAX = 1.5;

  const loadWords = useCallback(async () => {
    await initializeData();
    const data = await getWords();
    setWords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadWords();
    });
    return unsubscribe;
  }, [navigation, loadWords]);

  const currentHskLevel = words.length > 0 ? words[0].hskLevel : undefined;
  const isCurrentLevelFree = currentHskLevel !== undefined && isFreeLevel(currentHskLevel);

  const playableWords = useMemo(() => {
    let filtered = words;
    if (!isPremium && !isCurrentLevelFree) {
      filtered = filtered.slice(0, freeWordsLimit);
    }
    if (filterUnmemorized) {
      filtered = filtered.filter((w) => (w.audioUnmemorizedCount || 0) > 0);
    }
    return filtered;
  }, [words, filterUnmemorized, isPremium, freeWordsLimit, isCurrentLevelFree]);

  const prevWordsLenRef = useRef(0);
  useEffect(() => {
    if (playableWords.length > 0) {
      if (!endPosition || prevWordsLenRef.current !== playableWords.length) {
        setEndPosition(String(playableWords.length));
      }
      prevWordsLenRef.current = playableWords.length;
    }
  }, [playableWords.length]);

  const speak = (text: string, language: string): Promise<void> => {
    return speakWithLanguage(text, language, playbackRate);
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const playWordSequence = async (word: Word) => {
    if (isCancelledRef.current) return;

    setCurrentPhase(t("phase_chinese"));
    setCurrentSpokenText(word.word);
    await speak(word.word, "zh-CN");
    if (isCancelledRef.current) return;

    await delay(500);
    if (isCancelledRef.current) return;

    setCurrentPhase(t("phase_japanese"));
    setCurrentSpokenText(word.translation);
    await speak(word.translation, "ja-JP");
    if (isCancelledRef.current) return;

    await delay(500);
    if (isCancelledRef.current) return;

    for (let i = 0; i < 2; i++) {
      if (isCancelledRef.current) return;
      setCurrentPhase(`${t("phase_chinese_word")} (${i + 1}/2)`);
      setCurrentSpokenText(word.exampleSentence);
      await speak(word.exampleSentence, "zh-CN");
      if (isCancelledRef.current) return;
      await delay(300);
    }

    if (isCancelledRef.current) return;
    await delay(500);

    setCurrentPhase(t("phase_japanese_example"));
    setCurrentSpokenText(word.exampleTranslation);
    await speak(word.exampleTranslation, "ja-JP");
    if (isCancelledRef.current) return;

    await delay(500);

    for (let i = 0; i < 2; i++) {
      if (isCancelledRef.current) return;
      setCurrentPhase(`${t("phase_chinese_word")} (${i + 3}/4)`);
      setCurrentSpokenText(word.exampleSentence);
      await speak(word.exampleSentence, "zh-CN");
      if (isCancelledRef.current) return;
      await delay(300);
    }

    if (isCancelledRef.current) return;
    await delay(500);

    if (word.exampleEnglish) {
      setCurrentPhase(t("phase_english_example"));
      setCurrentSpokenText(word.exampleEnglish);
      await speak(word.exampleEnglish, "en-US");
    } else {
      setCurrentPhase(t("phase_english"));
      setCurrentSpokenText(word.translation);
      await speak(word.translation, "en-US");
    }
    
    await delay(800);
  };

  const startPlayback = async () => {
    if (playableWords.length === 0) return;

    isCancelledRef.current = false;
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const startIdx = Math.max(0, parseInt(startPosition, 10) - 1) || 0;
    const endIdx = Math.min(
      playableWords.length,
      parseInt(endPosition, 10) || playableWords.length
    );
    
    for (let i = startIdx; i < endIdx; i++) {
      if (isCancelledRef.current) break;
      
      setCurrentWordIndex(i);
      await playWordSequence(playableWords[i]);
    }

    setIsPlaying(false);
    setCurrentPhase("");
  };

  const stopPlayback = () => {
    isCancelledRef.current = true;
    stopSpeaking();
    setIsPlaying(false);
    setCurrentPhase("");
    setCurrentSpokenText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMarkUnmemorized = async () => {
    if (!currentWord) return;
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("Paywall");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAsUnmemorized(currentWord.id, "audio");
    const data = await getWords();
    setWords(data);
    setMarkedWords(prev => {
      if (prev.some(w => w.id === currentWord.id)) return prev;
      return [...prev, { id: currentWord.id, word: currentWord.word, pinyin: currentWord.pinyin, translation: currentWord.translation }];
    });
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const toggleFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterUnmemorized(!filterUnmemorized);
    setStartPosition("1");
    setEndPosition("");
  };

  const currentWord = playableWords[currentWordIndex];
  const unmemorizedCount = words.filter((w) => (w.audioUnmemorizedCount || 0) > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={[styles.playerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText style={styles.sectionTitle}>{t("playback_section")}</ThemedText>

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
          ) : null}

          {isPlaying && currentWord && showSpokenText && currentSpokenText ? (
            <View style={[styles.spokenTextCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText style={[styles.spokenTextLabel, { color: theme.textSecondary }]}>
                {currentPhase}
              </ThemedText>
              <ThemedText style={styles.spokenText}>
                {currentSpokenText}
              </ThemedText>
            </View>
          ) : null}

          {!isPlaying ? (
            <View style={styles.readyState}>
              <Feather name="headphones" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.readyText, { color: theme.textSecondary }]}>
                {playableWords.length > 0 
                  ? `${playableWords.length}${t("words_unit")}`
                  : t("no_words_to_play")
                }
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.controls}>
            {isPlaying ? (
              <View style={styles.playingControls}>
                <Pressable
                  onPress={handleMarkUnmemorized}
                  style={[styles.controlButton, styles.unmemorizedButton, { backgroundColor: Colors.light.alert }]}
                >
                  <Feather name="flag" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.controlButtonText}>{t("not_memorized_btn")}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={stopPlayback}
                  style={[styles.controlButton, styles.stopButton]}
                >
                  <Feather name="square" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.controlButtonText}>{t("stop")}</ThemedText>
                </Pressable>
              </View>
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
                <ThemedText style={styles.controlButtonText}>{t("play")}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {markedWords.length > 0 ? (
          <Animated.View style={[styles.markedListCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <View style={styles.markedListHeader}>
              <Feather name="flag" size={16} color={Colors.light.alert} />
              <ThemedText style={[styles.sectionTitle, { flex: 1 }]}>
                覚えてない単語 ({markedWords.length})
              </ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMarkedWords([]);
                }}
              >
                <ThemedText style={[styles.clearButton, { color: theme.textSecondary }]}>{t("clear_btn")}</ThemedText>
              </Pressable>
            </View>
            {markedWords.map((w, idx) => {
              const wordData = words.find(wd => wd.id === w.id);
              const textNeedsWork = wordData ? (wordData.textUnmemorizedCount || 0) > 0 : false;
              const audioNeedsWork = wordData ? (wordData.audioUnmemorizedCount || 0) > 0 : false;
              return (
                <Animated.View
                  key={w.id}
                  style={[
                    styles.markedWordItem,
                    { borderTopColor: theme.border },
                    idx === markedWords.length - 1 ? { opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) } : null,
                  ]}
                >
                  <View style={styles.markedWordLeft}>
                    <ThemedText style={styles.markedWordChinese}>{w.word}</ThemedText>
                    <ThemedText style={[styles.markedWordPinyin, { color: theme.textSecondary }]}>{w.pinyin}</ThemedText>
                  </View>
                  <View style={styles.markedWordRight}>
                    <View style={styles.markedBadges}>
                      {textNeedsWork ? (
                        <View style={[styles.memoBadge, { backgroundColor: `${Colors.light.secondary}20` }]}>
                          <Feather name="book-open" size={10} color={Colors.light.secondary} />
                          <ThemedText style={[styles.memoBadgeText, { color: Colors.light.secondary }]}>{t("text_badge_short")}</ThemedText>
                        </View>
                      ) : null}
                      {audioNeedsWork ? (
                        <View style={[styles.memoBadge, { backgroundColor: `${Colors.light.alert}20` }]}>
                          <Feather name="headphones" size={10} color={Colors.light.alert} />
                          <ThemedText style={[styles.memoBadgeText, { color: Colors.light.alert }]}>{t("audio_badge_short")}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.markedWordTranslation, { color: theme.textSecondary }]}>{w.translation}</ThemedText>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : null}

        {!isPremium && !isCurrentLevelFree ? (
          <Pressable
            onPress={() => navigation.navigate("Paywall")}
            style={[styles.premiumBanner, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
          >
            <Feather name="lock" size={16} color={theme.primary} />
            <ThemedText style={[styles.premiumBannerText, { color: theme.primary }]}>
              {t("free_limit_banner").replace("{n}", String(freeWordsLimit))}
            </ThemedText>
            <Feather name="chevron-right" size={16} color={theme.primary} />
          </Pressable>
        ) : null}

        <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText style={styles.sectionTitle}>{t("settings_section")}</ThemedText>

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t("unmemorized_filter")}
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
                {filterUnmemorized ? `ON (${unmemorizedCount}${t("words_unit")})` : "OFF"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t("start_pos")}
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

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t("end_pos")}
            </ThemedText>
            <View style={styles.positionInputContainer}>
              <TextInput
                value={endPosition}
                onChangeText={setEndPosition}
                keyboardType="number-pad"
                placeholder={String(playableWords.length)}
                placeholderTextColor={theme.textSecondary}
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

          <View style={styles.speedSection}>
            <View style={styles.speedHeader}>
              <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
                {t("playback_speed")}
              </ThemedText>
              <ThemedText style={[styles.speedValue, { color: Colors.light.primary }]}>
                {playbackRate.toFixed(2)}x
              </ThemedText>
            </View>
            <View style={styles.sliderRow}>
              <ThemedText style={[styles.sliderLabel, { color: theme.textSecondary }]}>
                {SPEED_MIN}x
              </ThemedText>
              <Slider
                style={styles.slider}
                minimumValue={SPEED_MIN}
                maximumValue={SPEED_MAX}
                step={0.05}
                value={playbackRate}
                onValueChange={(val: number) => {
                  const rounded = Math.round(val * 100) / 100;
                  setPlaybackRate(rounded);
                }}
                minimumTrackTintColor={Colors.light.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={Colors.light.primary}
                disabled={isPlaying}
              />
              <ThemedText style={[styles.sliderLabel, { color: theme.textSecondary }]}>
                {SPEED_MAX}x
              </ThemedText>
            </View>
          </View>

          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: theme.text }]}>
              {t("show_text")}
            </ThemedText>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSpokenText(!showSpokenText);
              }}
              style={[
                styles.toggleButton,
                { 
                  backgroundColor: showSpokenText 
                    ? Colors.light.primary 
                    : theme.backgroundSecondary 
                },
              ]}
            >
              <View style={styles.toggleContent}>
                <Feather 
                  name={showSpokenText ? "eye" : "eye-off"} 
                  size={14} 
                  color={showSpokenText ? "#FFFFFF" : theme.textSecondary} 
                />
                <ThemedText 
                  style={[
                    styles.toggleText, 
                    { color: showSpokenText ? "#FFFFFF" : theme.textSecondary }
                  ]}
                >
                  {showSpokenText ? "ON" : "OFF"}
                </ThemedText>
              </View>
            </Pressable>
          </View>

          <View style={styles.infoRow}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              {t("playback_order_info")}
            </ThemedText>
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
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  speedSection: {
    marginBottom: Spacing.md,
  },
  speedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  speedValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    minWidth: 30,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  infoText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  playingControls: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  unmemorizedButton: {
    flex: 1,
    justifyContent: "center",
  },
  markedListCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  markedListHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  clearButton: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  markedWordItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  markedWordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexShrink: 0,
  },
  markedWordRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    justifyContent: "flex-end",
  },
  markedWordChinese: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_700Bold",
  },
  markedWordPinyin: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  markedBadges: {
    flexDirection: "row",
    gap: 4,
  },
  memoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  markedWordTranslation: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "right",
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  premiumBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
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
  spokenTextCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  spokenTextLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.xs,
  },
  spokenText: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 30,
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
    flex: 1,
    justifyContent: "center",
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
