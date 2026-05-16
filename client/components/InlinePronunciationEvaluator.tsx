import React, { useEffect, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
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
import {
  computeScore,
  feedbackLevelFromScore,
  PronunciationScore,
} from "@/lib/pronunciationScore";
import {
  isRecognitionAvailable,
  RecognitionHandle,
  RecognitionUnavailableError,
  requestRecognitionPermissions,
  resolveRecognitionLanguage,
  startRecognition,
} from "@/lib/speechRecognition";

type Phase =
  | "idle"
  | "checking"
  | "unavailable"
  | "permission_denied"
  | "ready"
  | "recording"
  | "result";

interface Props {
  referenceText: string;
  wordId?: string;
}

export function InlinePronunciationEvaluator({ referenceText, wordId }: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
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
    if (phase === "recording") {
      pulse.value = 1;
      pulse.value = withRepeat(
        withTiming(1.4, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
        }),
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
      try {
        handleRef.current?.stop();
      } catch {}
      handleRef.current = null;
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const ensureReady = async (): Promise<Phase> => {
    const available = await isRecognitionAvailable();
    if (!available) return "unavailable";
    const perm = await requestRecognitionPermissions();
    setCanAskAgain(perm.canAskAgain);
    if (!perm.granted) return "permission_denied";
    return "ready";
  };

  const startRecording = async (e?: GestureResponderEvent) => {
    e?.stopPropagation();
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      try {
        await handleRef.current?.stop();
      } catch {}
      handleRef.current = null;
      setTranscript("");
      setScore(null);
      setErrorMessage(null);
      setPhase("checking");
      const next = await ensureReady();
      if (next !== "ready") {
        setPhase(next);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          if (
            err.code === "not-allowed" ||
            err.code === "permission_denied"
          ) {
            setPhase("permission_denied");
          } else if (
            err.code === "no-speech" ||
            err.code === "aborted"
          ) {
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
    } catch (err) {
      if (err instanceof RecognitionUnavailableError) {
        if (err.reason === "permission_denied") {
          setPhase("permission_denied");
        } else {
          setPhase("unavailable");
        }
      } else {
        setErrorMessage((err as Error).message);
        setPhase("ready");
      }
    } finally {
      startingRef.current = false;
    }
  };

  const stopRecording = async (e?: GestureResponderEvent) => {
    e?.stopPropagation();
    try {
      await handleRef.current?.stop();
    } catch {}
    handleRef.current = null;
  };

  const openSettings = async (e?: GestureResponderEvent) => {
    e?.stopPropagation();
    if (Platform.OS === "web") return;
    try {
      await Linking.openSettings();
    } catch {}
  };

  const resetIdle = (e?: GestureResponderEvent) => {
    e?.stopPropagation();
    setPhase("idle");
    setTranscript("");
    setScore(null);
    setErrorMessage(null);
  };

  const scoreColor = (n: number) => {
    const level = feedbackLevelFromScore(n);
    if (level === "good") return Colors.light.success;
    if (level === "mid") return Colors.light.primary;
    return Colors.light.alert;
  };

  const isExpanded = phase !== "idle";
  const totalLevel = score ? feedbackLevelFromScore(score.total) : null;
  const feedbackText =
    totalLevel === "good"
      ? t("score_feedback_good")
      : totalLevel === "mid"
      ? t("score_feedback_mid")
      : totalLevel === "poor"
      ? t("score_feedback_poor")
      : "";

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={(e) => {
          if (phase === "idle" || phase === "ready" || phase === "result") {
            startRecording(e);
          } else if (phase === "recording") {
            stopRecording(e);
          } else {
            e.stopPropagation();
          }
        }}
        hitSlop={8}
        testID={`button-pronounce-${wordId ?? "anon"}`}
        style={[
          styles.micButton,
          {
            backgroundColor:
              phase === "recording"
                ? Colors.light.secondary
                : `${Colors.light.secondary}20`,
            borderColor: Colors.light.secondary,
          },
        ]}
      >
        <Feather
          name={phase === "recording" ? "square" : "mic"}
          size={14}
          color={phase === "recording" ? "#FFFFFF" : Colors.light.secondary}
        />
      </Pressable>

      {isExpanded ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <ThemedText
              style={[styles.panelTitle, { color: theme.textSecondary }]}
            >
              {t("pronunciation_evaluate_button")}
            </ThemedText>
            <Pressable
              onPress={resetIdle}
              hitSlop={8}
              testID={`button-close-evaluator-${wordId ?? "anon"}`}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="x" size={14} color={theme.textSecondary} />
            </Pressable>
          </View>

          {phase === "checking" ? (
            <ThemedText
              style={[styles.statusText, { color: theme.textSecondary }]}
            >
              {t("loading")}
            </ThemedText>
          ) : null}

          {phase === "unavailable" ? (
            <View style={styles.noticeRow}>
              <Feather
                name="alert-circle"
                size={14}
                color={Colors.light.alert}
              />
              <ThemedText
                style={[styles.noticeText, { color: theme.text }]}
              >
                {t("recognition_unavailable")}
              </ThemedText>
            </View>
          ) : null}

          {phase === "permission_denied" ? (
            <View style={styles.noticeColumn}>
              <View style={styles.noticeRow}>
                <Feather
                  name="mic-off"
                  size={14}
                  color={Colors.light.alert}
                />
                <ThemedText
                  style={[styles.noticeText, { color: theme.text }]}
                >
                  {t("mic_permission_denied")}
                </ThemedText>
              </View>
              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={openSettings}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: Colors.light.primary },
                  ]}
                  testID={`button-open-settings-${wordId ?? "anon"}`}
                >
                  <ThemedText style={styles.primaryBtnText}>
                    {t("open_settings")}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {phase === "recording" ? (
            <View style={styles.recordingRow}>
              <View style={styles.pulseWrap}>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      backgroundColor: `${Colors.light.secondary}40`,
                    },
                    pulseStyle,
                  ]}
                />
                <View
                  style={[
                    styles.pulseDot,
                    { backgroundColor: Colors.light.secondary },
                  ]}
                />
              </View>
              <ThemedText
                style={[styles.hintText, { color: theme.textSecondary }]}
              >
                {t("recording_in_progress")}
              </ThemedText>
              <Pressable
                onPress={stopRecording}
                hitSlop={8}
                style={[
                  styles.stopBtn,
                  { borderColor: theme.border },
                ]}
                testID={`button-stop-recording-${wordId ?? "anon"}`}
              >
                <ThemedText
                  style={[styles.stopBtnText, { color: theme.text }]}
                >
                  {t("stop_recording")}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {transcript && (phase === "recording" || phase === "result") ? (
            <View style={styles.transcriptRow}>
              <ThemedText
                style={[
                  styles.transcriptLabel,
                  { color: theme.textSecondary },
                ]}
              >
                {t("evaluator_heard_label")}
              </ThemedText>
              <ThemedText
                style={[styles.transcriptText, { color: theme.text }]}
                testID={`text-transcript-${wordId ?? "anon"}`}
              >
                {transcript}
              </ThemedText>
            </View>
          ) : null}

          {score && phase === "result" ? (
            <View style={styles.resultColumn}>
              <View style={styles.scoresRow}>
                <View
                  style={[
                    styles.totalScorePill,
                    {
                      backgroundColor: `${scoreColor(score.total)}15`,
                      borderColor: scoreColor(score.total),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.totalScoreLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("score_total")}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.totalScoreValue,
                      { color: scoreColor(score.total) },
                    ]}
                    testID={`text-score-total-${wordId ?? "anon"}`}
                  >
                    {score.total}
                  </ThemedText>
                </View>
                <View style={styles.subScores}>
                  <View
                    style={[
                      styles.subScorePill,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.subScoreLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("score_order_match")}
                    </ThemedText>
                    <ThemedText
                      style={[styles.subScoreValue, { color: theme.text }]}
                    >
                      {score.orderMatch}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.subScorePill,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.subScoreLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("score_char_match")}
                    </ThemedText>
                    <ThemedText
                      style={[styles.subScoreValue, { color: theme.text }]}
                    >
                      {score.charMatch}
                    </ThemedText>
                  </View>
                </View>
              </View>
              {feedbackText ? (
                <ThemedText
                  style={[
                    styles.feedbackText,
                    { color: scoreColor(score.total) },
                  ]}
                >
                  {feedbackText}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={startRecording}
                style={[
                  styles.retryBtn,
                  { backgroundColor: Colors.light.primary },
                ]}
                testID={`button-retry-recording-${wordId ?? "anon"}`}
              >
                <Feather name="refresh-ccw" size={12} color="#FFFFFF" />
                <ThemedText style={styles.retryBtnText}>
                  {t("try_again")}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {phase === "ready" && !transcript && !score ? (
            <ThemedText
              style={[styles.statusText, { color: theme.textSecondary }]}
            >
              {t("tap_to_start")}
            </ThemedText>
          ) : null}

          {errorMessage ? (
            <ThemedText
              style={[styles.errorText, { color: Colors.light.alert }]}
            >
              {errorMessage}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  micButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  panel: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    alignSelf: "stretch",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 4,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  noticeColumn: {
    flexDirection: "column",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pulseWrap: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
  },
  stopBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  stopBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  transcriptRow: {
    gap: 2,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Nunito_400Regular",
  },
  resultColumn: {
    gap: Spacing.sm,
  },
  scoresRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "stretch",
  },
  totalScorePill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 70,
  },
  totalScoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalScoreValue: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Nunito_700Bold",
    lineHeight: 28,
  },
  subScores: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  subScorePill: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  subScoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  subScoreValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  primaryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 11,
    textAlign: "center",
  },
});
