import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SpeakButton } from "@/components/SpeakButton";
import { ShareStampSheet } from "@/components/ShareStampSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import {
  getWords,
  setTutorialSprintDone,
  setTutorialStampEarned,
  initializeData,
} from "@/lib/storage";
import { Word } from "@/types";
import { HSK_QUOTES } from "@/data/hskQuotes";
import { useSprint } from "@/contexts/SprintContext";
import { useI18n } from "@/contexts/LanguageContext";

type NavigationProp = NativeStackNavigationProp<
  SprintStackParamList,
  "TutorialSprint"
>;

const TUTORIAL_WORD_COUNT = 3;
const TUTORIAL_STAMP_IMAGE = require("../../assets/images/panda-stamp-tutorial.png");

type CardState = "pending" | "memorized" | "review";
type Phase = "text-list" | "study-cards";

export default function TutorialSprintScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentLevel } = useSprint();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<CardState[]>([]);
  const [showStamp, setShowStamp] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [meaningRevealed, setMeaningRevealed] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("text-list");
  const [cardIndex, setCardIndex] = useState(0);
  const [cardReveal, setCardReveal] = useState<0 | 1 | 2>(0);

  const toggleMeaning = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setMeaningRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeData();
        const all = await getWords();
        if (cancelled) return;
        const slice = all.slice(0, TUTORIAL_WORD_COUNT);
        setWords(slice);
        setStates(new Array(slice.length).fill("pending"));
      } catch (e) {
        console.warn("Tutorial words load failed:", e);
        setWords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (showStamp) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true })
      );
      pulse.start();
      rotate.start();
      return () => { pulse.stop(); rotate.stop(); };
    }
  }, [showStamp]);

  const allDone = useMemo(
    () => states.length > 0 && states.every((s) => s !== "pending"),
    [states]
  );

  useEffect(() => {
    if (allDone && phase === "text-list") {
      const t = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhase("study-cards");
        setCardIndex(0);
        setCardReveal(0);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [allDone, phase]);

  const handleCardNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cardIndex < words.length - 1) {
      setCardIndex(cardIndex + 1);
      setCardReveal(0);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStamp(true);
    }
  };

  const handleMark = (index: number, state: CardState) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStates((prev) => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await setTutorialStampEarned(true);
      await setTutorialSprintDone(true);
    } catch {}
    setShowStamp(false);
    // Land back on the Sprint home (main grid).
    navigation.popToTop();
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await setTutorialSprintDone(true);
    } catch {}
    navigation.popToTop();
  };

  const doneCount = states.filter((s) => s !== "pending").length;
  const total = states.length || TUTORIAL_WORD_COUNT;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View
            style={[
              styles.introBadge,
              { backgroundColor: Colors.light.secondary + "18" },
            ]}
          >
            <Feather name="award" size={22} color={Colors.light.secondary} />
          </View>
          <ThemedText style={styles.introTitle}>
            {phase === "text-list"
              ? t("tutorial_title_text_list")
              : t("tutorial_title_cards")}
          </ThemedText>
          <ThemedText
            style={[styles.introSubtitle, { color: theme.textSecondary }]}
          >
            {phase === "text-list"
              ? t("tutorial_subtitle_text_list")
              : t("tutorial_subtitle_cards")}
          </ThemedText>

          <View style={styles.progressRow}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: Colors.light.secondary,
                    width: `${
                      phase === "text-list"
                        ? (doneCount / total) * 50
                        : 50 + ((cardIndex + cardReveal / 2) / Math.max(1, total)) * 50
                    }%`,
                  },
                ]}
              />
            </View>
            <ThemedText
              style={[styles.progressText, { color: theme.textSecondary }]}
            >
              {phase === "text-list"
                ? `${doneCount} / ${total}`
                : `${Math.min(cardIndex + 1, total)} / ${total}`}
            </ThemedText>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : words.length === 0 ? (
          <View style={styles.loaderBox}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("tutorial_error_load")}
            </ThemedText>
            <Pressable
              testID="button-tutorial-skip"
              onPress={handleSkip}
              style={[styles.skipBtn, { borderColor: theme.border }]}
            >
              <ThemedText style={[styles.skipBtnText, { color: theme.text }]}>
                {t("skip")}
              </ThemedText>
            </Pressable>
          </View>
        ) : phase === "text-list" ? (
          <View style={styles.cardList}>
            {words.map((w, i) => {
              const state = states[i] ?? "pending";
              const isMemorized = state === "memorized";
              const isReview = state === "review";
              const isDone = state !== "pending";
              return (
                <View
                  key={w.id}
                  testID={`tutorial-card-${i}`}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: isMemorized
                        ? Colors.light.success
                        : isReview
                        ? Colors.light.alert
                        : theme.border,
                      opacity: isDone && !isMemorized && !isReview ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTextWrap}>
                      <ThemedText style={[styles.word, { color: theme.text }]}>
                        {w.word}
                      </ThemedText>
                      <ThemedText
                        style={[styles.pinyin, { color: theme.textSecondary }]}
                      >
                        {w.pinyin}
                      </ThemedText>
                      {meaningRevealed.has(w.id) ? (
                        <ThemedText
                          style={[styles.translation, { color: theme.text }]}
                        >
                          {w.translation}
                        </ThemedText>
                      ) : null}
                      {w.exampleSentence ? (
                        <View style={styles.exampleBlock}>
                          <ThemedText
                            style={[styles.exampleZh, { color: theme.text }]}
                          >
                            {w.exampleSentence}
                          </ThemedText>
                          {w.examplePinyin ? (
                            <ThemedText
                              style={[styles.examplePy, { color: theme.primary }]}
                            >
                              {w.examplePinyin}
                            </ThemedText>
                          ) : null}
                          {meaningRevealed.has(w.id) && w.exampleTranslation ? (
                            <ThemedText
                              style={[styles.exampleJa, { color: theme.textSecondary }]}
                            >
                              {w.exampleTranslation}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardTopRight}>
                      <SpeakButton
                        text={
                          w.exampleSentence
                            ? `${w.word}。${w.exampleSentence}`
                            : w.word
                        }
                        size="medium"
                      />
                      <Pressable
                        testID={`button-tutorial-meaning-${i}`}
                        onPress={() => toggleMeaning(w.id)}
                        style={[
                          styles.exampleToggle,
                          {
                            backgroundColor: meaningRevealed.has(w.id)
                              ? theme.primary + "18"
                              : theme.backgroundSecondary,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Feather
                          name={meaningRevealed.has(w.id) ? "eye" : "eye-off"}
                          size={16}
                          color={
                            meaningRevealed.has(w.id)
                              ? theme.primary
                              : theme.textSecondary
                          }
                        />
                        <ThemedText
                          style={[
                            styles.exampleToggleText,
                            {
                              color: meaningRevealed.has(w.id)
                                ? theme.primary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {t("meaning")}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      testID={`button-tutorial-review-${i}`}
                      onPress={() => handleMark(i, "review")}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: isReview
                            ? Colors.light.alert
                            : Colors.light.alert + "15",
                        },
                      ]}
                    >
                      <Feather
                        name="flag"
                        size={16}
                        color={isReview ? "#fff" : Colors.light.alert}
                      />
                      <ThemedText
                        style={[
                          styles.actionBtnText,
                          { color: isReview ? "#fff" : Colors.light.alert },
                        ]}
                      >
                        {t("tutorial_later")}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      testID={`button-tutorial-memorized-${i}`}
                      onPress={() => handleMark(i, "memorized")}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: isMemorized
                            ? Colors.light.success
                            : Colors.light.success + "15",
                        },
                      ]}
                    >
                      <Feather
                        name="check"
                        size={16}
                        color={isMemorized ? "#fff" : Colors.light.success}
                      />
                      <ThemedText
                        style={[
                          styles.actionBtnText,
                          { color: isMemorized ? "#fff" : Colors.light.success },
                        ]}
                      >
                        {t("memorized_label")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Pressable
              testID="button-tutorial-skip-bottom"
              onPress={handleSkip}
              style={styles.skipLink}
            >
              <ThemedText
                style={[styles.skipLinkText, { color: theme.textSecondary }]}
              >
                {t("tutorial_skip_to_main")}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          // ----- Phase: study-cards (1 card at a time) -----
          (() => {
            const w = words[cardIndex];
            if (!w) return null;
            return (
              <View style={styles.cardList}>
                <View
                  key={`study-${w.id}`}
                  testID={`tutorial-study-card-${cardIndex}`}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.primary + "55",
                    },
                  ]}
                >
                  {cardReveal === 0 ? (
                    <View style={styles.audioOnlyWrap}>
                      <View
                        style={[
                          styles.audioIconCircle,
                          { backgroundColor: Colors.light.secondary + "18" },
                        ]}
                      >
                        <SpeakButton
                          text={
                            w.exampleSentence
                              ? `${w.word}。${w.exampleSentence}`
                              : w.word
                          }
                          size="large"
                        />
                      </View>
                      <ThemedText
                        style={[styles.audioPrompt, { color: theme.textSecondary }]}
                      >
                        {t("tutorial_listen_answer")}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.cardTop}>
                      <View style={styles.cardTextWrap}>
                        <ThemedText style={[styles.word, { color: theme.text }]}>
                          {w.word}
                        </ThemedText>
                        <ThemedText
                          style={[styles.pinyin, { color: theme.textSecondary }]}
                        >
                          {w.pinyin}
                        </ThemedText>
                        {w.exampleSentence ? (
                          <View style={styles.exampleBlock}>
                            <ThemedText
                              style={[styles.exampleZh, { color: theme.text }]}
                            >
                              {w.exampleSentence}
                            </ThemedText>
                            {w.examplePinyin ? (
                              <ThemedText
                                style={[styles.examplePy, { color: theme.primary }]}
                              >
                                {w.examplePinyin}
                              </ThemedText>
                            ) : null}
                          </View>
                        ) : null}
                        {cardReveal >= 2 ? (
                          <View
                            style={[
                              styles.exampleBlock,
                              { borderTopColor: theme.border },
                            ]}
                          >
                            <ThemedText
                              style={[styles.translation, { color: theme.text }]}
                            >
                              {w.translation}
                            </ThemedText>
                            {w.exampleTranslation ? (
                              <ThemedText
                                style={[
                                  styles.exampleJa,
                                  { color: theme.textSecondary, marginTop: 4 },
                                ]}
                              >
                                {w.exampleTranslation}
                              </ThemedText>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.cardTopRight}>
                        <SpeakButton
                          text={
                            w.exampleSentence
                              ? `${w.word}。${w.exampleSentence}`
                              : w.word
                          }
                          size="medium"
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.choiceWrapper}>
                    <View style={styles.choiceRow}>
                      <Pressable
                        testID={`button-tutorial-unmemorized-${cardIndex}`}
                        onPress={handleCardNext}
                        style={[
                          styles.choiceBtn,
                          {
                            backgroundColor: Colors.light.alert + "15",
                            borderColor: Colors.light.alert,
                          },
                        ]}
                      >
                        <Feather name="flag" size={20} color={Colors.light.alert} />
                        <ThemedText
                          style={[styles.choiceBtnText, { color: Colors.light.alert }]}
                        >
                          {t("choice_not_memorized")}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        testID={`button-tutorial-memorized-${cardIndex}`}
                        onPress={handleCardNext}
                        style={[
                          styles.choiceBtn,
                          {
                            backgroundColor: Colors.light.success + "15",
                            borderColor: Colors.light.success,
                          },
                        ]}
                      >
                        <Feather
                          name={
                            cardIndex < words.length - 1 ? "check" : "award"
                          }
                          size={20}
                          color={Colors.light.success}
                        />
                        <ThemedText
                          style={[styles.choiceBtnText, { color: Colors.light.success }]}
                        >
                          {cardIndex < words.length - 1
                            ? t("memorized_label")
                            : t("tutorial_memorized_stamp")}
                        </ThemedText>
                      </Pressable>
                    </View>
                    {cardReveal < 2 ? (
                      <Pressable
                        testID={`button-tutorial-card-reveal-${cardIndex}`}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setCardReveal((cardReveal + 1) as 1 | 2);
                        }}
                        style={[
                          styles.revealBtn,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <Feather name="eye" size={14} color={theme.textSecondary} />
                        <ThemedText
                          style={[styles.revealBtnText, { color: theme.textSecondary }]}
                        >
                          {cardReveal === 0 ? t("see_character") : t("see_meaning")}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  testID="button-tutorial-skip-bottom-cards"
                  onPress={handleSkip}
                  style={styles.skipLink}
                >
                  <ThemedText
                    style={[styles.skipLinkText, { color: theme.textSecondary }]}
                  >
                    {t("tutorial_skip_to_main")}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })()
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={showStamp}
        onRequestClose={handleFinish}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={[
              styles.modalCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
            contentContainerStyle={styles.modalCardContent}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalBadgeGold}
            >
              <Feather name="star" size={11} color="#fff" />
              <ThemedText style={styles.modalBadgeGoldText}>
                Special Stamp
              </ThemedText>
              <Feather name="star" size={11} color="#fff" />
            </LinearGradient>

            <View style={styles.stampWrap}>
              {/* Rotating outer ring */}
              <Animated.View
                style={[
                  styles.stampRing,
                  {
                    transform: [{
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    }],
                  },
                ]}
              >
                <LinearGradient
                  colors={["#FFD700", "#FFA500", "#FF6B35", "#FFD700"]}
                  style={styles.stampRingGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {/* Pulsing stamp */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.stampInnerBg}>
                  <Image
                    source={TUTORIAL_STAMP_IMAGE}
                    style={styles.stampImg}
                    contentFit="contain"
                  />
                </View>
              </Animated.View>

              {/* Sparkle stars */}
              <View style={[styles.sparkle, { top: 0, right: 12 }]}>
                <Feather name="star" size={14} color="#FFD700" />
              </View>
              <View style={[styles.sparkle, { top: 14, left: 4 }]}>
                <Feather name="star" size={10} color="#FFA500" />
              </View>
              <View style={[styles.sparkle, { bottom: 4, right: 8 }]}>
                <Feather name="star" size={12} color="#FFD700" />
              </View>
              <View style={[styles.sparkle, { bottom: 10, left: 10 }]}>
                <Feather name="star" size={9} color="#FFA500" />
              </View>
            </View>

            <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
              {t("tutorial_stamp_title")}
            </ThemedText>
            <ThemedText
              style={[styles.modalDesc, { color: theme.textSecondary }]}
            >
              {t("tutorial_stamp_msg")}
            </ThemedText>

            {(() => {
              const q = HSK_QUOTES[currentLevel as 1 | 2 | 3 | 4 | 5 | 6];
              if (!q) return null;
              return (
                <View
                  style={[
                    styles.quoteCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText style={[styles.quoteZh, { color: theme.text }]}>
                    {q.original}
                  </ThemedText>
                  <View style={styles.quoteSpeakRow}>
                    <SpeakButton text={q.original} size="small" />
                  </View>
                  <ThemedText
                    style={[styles.quoteJa, { color: theme.textSecondary }]}
                  >
                    {q.literal}
                  </ThemedText>
                  <ThemedText
                    style={[styles.quoteSource, { color: theme.textSecondary }]}
                  >
                    — {q.source}
                  </ThemedText>
                </View>
              );
            })()}

            <Pressable
              testID="button-tutorial-share"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowShare(true);
              }}
              style={[
                styles.shareInlineBtn,
                {
                  borderColor: Colors.light.secondary,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              <Feather name="share-2" size={16} color={Colors.light.secondary} />
              <ThemedText
                style={[
                  styles.shareInlineBtnText,
                  { color: Colors.light.secondary },
                ]}
              >
                {t("share_action")}
              </ThemedText>
            </Pressable>

            <Pressable
              testID="button-tutorial-finish"
              onPress={handleFinish}
              style={[
                styles.finishBtn,
                { backgroundColor: Colors.light.secondary },
              ]}
            >
              <ThemedText style={styles.finishBtnText}>
                {t("tutorial_start_sprint")}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {(() => {
        const q = HSK_QUOTES[currentLevel as 1 | 2 | 3 | 4 | 5 | 6];
        return (
          <ShareStampSheet
            visible={showShare}
            onClose={() => setShowShare(false)}
            stampImage={TUTORIAL_STAMP_IMAGE}
            stampLabel={t("tutorial_stamp_title")}
            hskLevel={currentLevel}
            stampCount={1}
            isSpecial
            quote={
              q
                ? { chinese: q.original, japanese: q.literal, source: q.source }
                : null
            }
          />
        );
      })()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },

  intro: { alignItems: "center", marginBottom: Spacing.xl, gap: Spacing.sm },
  introBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    lineHeight: 28,
    paddingTop: 4,
  },
  introSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },

  cardList: { gap: Spacing.md },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTop: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  cardTextWrap: { flex: 1, gap: 4 },
  word: { fontSize: 28, fontFamily: "Nunito_700Bold", lineHeight: 40, paddingTop: 4 },
  cardTopRight: { alignItems: "center", gap: Spacing.sm },
  exampleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  exampleToggleText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  pinyin: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  translation: { fontSize: 15, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  exampleBlock: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 2,
  },
  exampleZh: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  examplePy: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  exampleJa: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  audioOnlyWrap: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  audioIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  audioPrompt: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  cardActions: { flexDirection: "row", gap: Spacing.sm },
  choiceWrapper: { gap: Spacing.sm, marginTop: Spacing.md },
  choiceRow: { flexDirection: "row", gap: Spacing.md },
  choiceBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minHeight: 76,
  },
  choiceBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  revealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  revealBtnText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Nunito_700Bold" },

  loaderBox: { alignItems: "center", padding: Spacing["2xl"], gap: Spacing.lg },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  skipBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skipBtnText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  skipLink: { alignItems: "center", paddingVertical: Spacing.lg },
  skipLinkText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textDecorationLine: "underline",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "90%",
    borderRadius: BorderRadius.xl,
  },
  modalCardContent: {
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  quoteCard: {
    alignSelf: "stretch",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  quoteFlag: { fontSize: 22, marginBottom: 4 },
  quoteZh: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    lineHeight: 24,
    paddingTop: 2,
  },
  quoteSpeakRow: { marginVertical: 2 },
  quotePy: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  quoteJa: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  quoteSource: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    marginTop: 4,
  },
  modalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  modalBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.5,
  },
  modalBadgeGold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  modalBadgeGoldText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.8,
    color: "#fff",
  },
  stampWrap: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  stampRing: {
    position: "absolute",
    width: 175,
    height: 175,
    borderRadius: 87.5,
    overflow: "hidden",
  },
  stampRingGradient: {
    width: 175,
    height: 175,
    borderRadius: 87.5,
  },
  stampInnerBg: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  stampImg: { width: 148, height: 148 },
  sparkle: {
    position: "absolute",
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  finishBtn: {
    marginTop: Spacing.sm,
    alignSelf: "stretch",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  shareInlineBtn: {
    marginTop: Spacing.md,
    alignSelf: "stretch",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  shareInlineBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  finishBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
});
