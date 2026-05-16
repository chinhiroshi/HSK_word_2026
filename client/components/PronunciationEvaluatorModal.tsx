import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { computeScore, feedbackLevelFromScore, PronunciationScore } from "@/lib/pronunciationScore";
import {
  startRecognition,
  resolveRecognitionLanguage,
  isRecognitionAvailable,
  requestRecognitionPermissions,
  RecognitionHandle,
  RecognitionUnavailableError,
} from "@/lib/speechRecognition";
import { speakChinese } from "@/lib/speech";

type Phase =
  | "idle"
  | "checking"
  | "unavailable"
  | "permission_denied"
  | "ready"
  | "recording"
  | "result";

interface Props {
  visible: boolean;
  referenceText: string;
  wordId?: string;
  onClose: () => void;
}

export function PronunciationEvaluatorModal({
  visible,
  referenceText,
  wordId,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("checking");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const handleRef = useRef<RecognitionHandle | null>(null);
  const startingRef = useRef(false);

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setPhase("checking");
    setTranscript("");
    setScore(null);
    setErrorMessage(null);

    (async () => {
      const available = await isRecognitionAvailable();
      if (cancelled) return;
      if (!available) {
        setPhase("unavailable");
        return;
      }
      const perm = await requestRecognitionPermissions();
      if (cancelled) return;
      setCanAskAgain(perm.canAskAgain);
      if (!perm.granted) {
        setPhase("permission_denied");
        return;
      }
      setPhase("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (phase === "recording") {
      pulse.value = 1;
      pulse.value = withRepeat(
        withTiming(1.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [phase, pulse]);

  useEffect(() => {
    return () => {
      try { handleRef.current?.stop(); } catch {}
      handleRef.current = null;
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const startRecording = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      try { await handleRef.current?.stop(); } catch {}
      handleRef.current = null;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTranscript("");
      setScore(null);
      setErrorMessage(null);
      const lang = resolveRecognitionLanguage({ wordId, text: referenceText });
      let lastTranscript = "";
      const handle = await startRecognition({
        lang,
        onResult: (text, isFinal) => {
          lastTranscript = text;
          setTranscript(text);
          if (isFinal) {
            const s = computeScore(referenceText, text);
            setScore(s);
            setPhase("result");
          }
        },
        onError: (err) => {
          if (err.code === "not-allowed" || err.code === "permission_denied") {
            setPhase("permission_denied");
          } else if (err.code === "no-speech" || err.code === "aborted") {
            setPhase("ready");
          } else {
            setErrorMessage(err.message || err.code);
            setPhase("ready");
          }
        },
        onEnd: () => {
          setPhase((prev) => {
            if (prev !== "recording") return prev;
            if (lastTranscript) {
              const s = computeScore(referenceText, lastTranscript);
              setScore(s);
              return "result";
            }
            return "ready";
          });
        },
      });
      handleRef.current = handle;
      setPhase("recording");
    } catch (e) {
      if (e instanceof RecognitionUnavailableError) {
        if (e.reason === "permission_denied") {
          setPhase("permission_denied");
        } else {
          setPhase("unavailable");
        }
      } else {
        setErrorMessage((e as Error).message);
        setPhase("ready");
      }
    } finally {
      startingRef.current = false;
    }
  };

  const stopRecording = async () => {
    try {
      await handleRef.current?.stop();
    } catch {}
    handleRef.current = null;
  };

  const handleClose = async () => {
    await stopRecording();
    onClose();
  };

  const openSettings = async () => {
    if (Platform.OS === "web") return;
    try {
      await Linking.openSettings();
    } catch {}
  };

  const handleSpeakReference = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speakChinese(referenceText, { wordId });
  };

  const renderScoreColor = (n: number) => {
    const level = feedbackLevelFromScore(n);
    if (level === "good") return Colors.light.success;
    if (level === "mid") return Colors.light.primary;
    return Colors.light.alert;
  };

  const totalLevel = score ? feedbackLevelFromScore(score.total) : null;
  const feedbackText = totalLevel === "good"
    ? t("score_feedback_good")
    : totalLevel === "mid"
    ? t("score_feedback_mid")
    : totalLevel === "poor"
    ? t("score_feedback_poor")
    : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <ThemedText style={styles.title}>{t("pronunciation_evaluate_button")}</ThemedText>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              style={[styles.iconBtn, { backgroundColor: theme.backgroundSecondary }]}
              testID="button-close-evaluator"
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={[styles.referenceBox, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText style={[styles.referenceLabel, { color: theme.textSecondary }]}>
                {t("evaluator_reference_label")}
              </ThemedText>
              <ThemedText style={styles.referenceText}>{referenceText}</ThemedText>
              <Pressable
                onPress={handleSpeakReference}
                hitSlop={8}
                testID="button-speak-reference"
                style={[styles.speakSmall, { backgroundColor: `${Colors.light.primary}20` }]}
              >
                <Feather name="volume-2" size={16} color={Colors.light.primary} />
                <ThemedText style={[styles.speakSmallText, { color: Colors.light.primary }]}>
                  {t("speak")}
                </ThemedText>
              </Pressable>
            </View>

            {phase === "checking" ? (
              <ThemedText style={[styles.statusText, { color: theme.textSecondary }]}>
                {t("loading")}
              </ThemedText>
            ) : null}

            {phase === "unavailable" ? (
              <View style={[styles.notice, { backgroundColor: `${Colors.light.alert}10`, borderColor: `${Colors.light.alert}40` }]}>
                <Feather name="alert-circle" size={18} color={Colors.light.alert} />
                <ThemedText style={[styles.noticeText, { color: theme.text }]}>
                  {t("recognition_unavailable")}
                </ThemedText>
              </View>
            ) : null}

            {phase === "permission_denied" ? (
              <View style={[styles.notice, { backgroundColor: `${Colors.light.alert}10`, borderColor: `${Colors.light.alert}40` }]}>
                <Feather name="mic-off" size={18} color={Colors.light.alert} />
                <ThemedText style={[styles.noticeText, { color: theme.text }]}>
                  {t("mic_permission_denied")}
                </ThemedText>
                {Platform.OS !== "web" && !canAskAgain ? (
                  <Pressable
                    onPress={openSettings}
                    style={[styles.primaryBtn, { backgroundColor: Colors.light.primary }]}
                    testID="button-open-settings"
                  >
                    <ThemedText style={styles.primaryBtnText}>{t("open_settings")}</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {(phase === "ready" || phase === "recording" || phase === "result") ? (
              <View style={styles.recordSection}>
                {phase === "recording" ? (
                  <View style={styles.pulseWrap}>
                    <Animated.View
                      style={[
                        styles.pulseRing,
                        { backgroundColor: `${Colors.light.secondary}40` },
                        pulseStyle,
                      ]}
                    />
                    <View style={[styles.recordBtn, { backgroundColor: Colors.light.secondary }]}>
                      <Feather name="mic" size={28} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={startRecording}
                    style={[styles.recordBtn, { backgroundColor: Colors.light.secondary }]}
                    testID="button-start-recording"
                  >
                    <Feather name="mic" size={28} color="#FFFFFF" />
                  </Pressable>
                )}

                <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
                  {phase === "recording"
                    ? t("recording_in_progress")
                    : phase === "result"
                    ? t("evaluator_try_again_hint")
                    : t("tap_to_start")}
                </ThemedText>

                {phase === "recording" ? (
                  <Pressable
                    onPress={stopRecording}
                    style={[styles.secondaryBtn, { borderColor: theme.border }]}
                    testID="button-stop-recording"
                  >
                    <ThemedText style={[styles.secondaryBtnText, { color: theme.text }]}>
                      {t("stop_recording")}
                    </ThemedText>
                  </Pressable>
                ) : null}

                {errorMessage ? (
                  <ThemedText style={[styles.errorText, { color: Colors.light.alert }]}>
                    {errorMessage}
                  </ThemedText>
                ) : null}

                {transcript ? (
                  <View style={[styles.transcriptBox, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.transcriptLabel, { color: theme.textSecondary }]}>
                      {t("evaluator_heard_label")}
                    </ThemedText>
                    <ThemedText style={styles.transcriptText} testID="text-transcript">
                      {transcript}
                    </ThemedText>
                  </View>
                ) : null}

                {score ? (
                  <View style={styles.scoresWrap}>
                    <View
                      style={[
                        styles.totalScoreBox,
                        { backgroundColor: `${renderScoreColor(score.total)}15`, borderColor: renderScoreColor(score.total) },
                      ]}
                    >
                      <ThemedText style={[styles.totalScoreLabel, { color: theme.textSecondary }]}>
                        {t("score_total")}
                      </ThemedText>
                      <ThemedText
                        style={[styles.totalScoreValue, { color: renderScoreColor(score.total) }]}
                        testID="text-score-total"
                      >
                        {score.total}
                      </ThemedText>
                      <ThemedText style={[styles.feedbackText, { color: renderScoreColor(score.total) }]}>
                        {feedbackText}
                      </ThemedText>
                    </View>

                    <View style={styles.subScoresRow}>
                      <View style={[styles.subScoreBox, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText style={[styles.subScoreLabel, { color: theme.textSecondary }]}>
                          {t("score_order_match")}
                        </ThemedText>
                        <ThemedText style={styles.subScoreValue} testID="text-score-order">
                          {score.orderMatch}
                        </ThemedText>
                      </View>
                      <View style={[styles.subScoreBox, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText style={[styles.subScoreLabel, { color: theme.textSecondary }]}>
                          {t("score_char_match")}
                        </ThemedText>
                        <ThemedText style={styles.subScoreValue} testID="text-score-char">
                          {score.charMatch}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ) : null}

                {phase === "result" ? (
                  <Pressable
                    onPress={startRecording}
                    style={[styles.primaryBtn, { backgroundColor: Colors.light.primary }]}
                    testID="button-retry-recording"
                  >
                    <Feather name="refresh-ccw" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.primaryBtnText}>{t("try_again")}</ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleClose}
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  testID="button-close-evaluator-text"
                >
                  <ThemedText style={[styles.secondaryBtnText, { color: theme.text }]}>
                    {t("close")}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    paddingHorizontal: Spacing.md,
  },
  bodyContent: {
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  referenceBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  referenceLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  referenceText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 26,
  },
  speakSmall: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  speakSmallText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  statusText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  notice: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: Spacing.sm,
  },
  noticeText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  recordSection: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pulseWrap: {
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
  },
  transcriptBox: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
  },
  scoresWrap: {
    width: "100%",
    gap: Spacing.sm,
  },
  totalScoreBox: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  totalScoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalScoreValue: {
    fontSize: 40,
    fontWeight: "800",
    fontFamily: "Nunito_700Bold",
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  subScoresRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  subScoreBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: 4,
  },
  subScoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  subScoreValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
});
