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
import { Colors } from "@/constants/theme";
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
import {
  speakChinese,
  stopSpeaking,
  getCurrentPronunciationReveal,
  subscribePronunciationReveal,
} from "@/lib/speech";
import type { PronunciationReveal } from "@/lib/storage";

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
  playReferenceFirst?: boolean;
  showReferenceWhenActive?: boolean;
}

export function InlinePronunciationEvaluator({
  referenceText,
  wordId,
  playReferenceFirst = true,
  showReferenceWhenActive = false,
}: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [revealPref, setRevealPref] = useState<PronunciationReveal>(getCurrentPronunciationReveal);
  const handleRef = useRef<RecognitionHandle | null>(null);
  const startingRef = useRef(false);

  useEffect(() => subscribePronunciationReveal(setRevealPref), []);

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  useEffect(() => {
    if (phase === "recording") {
      pulse.value = 1;
      pulse.value = withRepeat(
        withTiming(1.6, {
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
      setPhase("checking");
      const next = await ensureReady();
      if (next !== "ready") {
        setPhase(next);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (playReferenceFirst) {
        try {
          await speakChinese(referenceText, { wordId });
        } catch {}
      }
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
          } else {
            setPhase("idle");
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
            return "idle";
          });
        },
      });
      handleRef.current = handle;
      setPhase("recording");
    } catch (err) {
      if (err instanceof RecognitionUnavailableError) {
        setPhase(
          err.reason === "permission_denied" ? "permission_denied" : "unavailable",
        );
      } else {
        setPhase("idle");
      }
    } finally {
      startingRef.current = false;
    }
  };

  const stopRecording = async (e?: GestureResponderEvent) => {
    e?.stopPropagation();
    try {
      await stopSpeaking();
    } catch {}
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

  const handlePress = (e: GestureResponderEvent) => {
    if (phase === "recording") {
      stopRecording(e);
    } else if (phase === "permission_denied") {
      openSettings(e);
    } else if (phase === "unavailable" || phase === "checking") {
      e.stopPropagation();
    } else {
      startRecording(e);
    }
  };

  const scoreColor = (n: number) => {
    const level = feedbackLevelFromScore(n);
    if (level === "good") return Colors.light.success;
    if (level === "mid") return Colors.light.primary;
    return Colors.light.alert;
  };

  const micIconName: React.ComponentProps<typeof Feather>["name"] =
    phase === "recording"
      ? "square"
      : phase === "permission_denied"
      ? "mic-off"
      : phase === "unavailable"
      ? "alert-circle"
      : "mic";

  const micColor =
    phase === "permission_denied" || phase === "unavailable"
      ? Colors.light.alert
      : Colors.light.secondary;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        testID={`button-pronounce-${wordId ?? "anon"}`}
        style={[
          styles.micButton,
          {
            backgroundColor:
              phase === "recording"
                ? Colors.light.secondary
                : `${micColor}20`,
            borderColor: micColor,
          },
        ]}
      >
        <Feather
          name={micIconName}
          size={14}
          color={phase === "recording" ? "#FFFFFF" : micColor}
        />
      </Pressable>

      {showReferenceWhenActive && (
        (revealPref === "before" && (phase === "checking" || phase === "ready" || phase === "recording" || phase === "result")) ||
        (revealPref === "after" && phase === "result")
      ) ? (
        <ThemedText
          style={[styles.referenceText, { color: theme.text }]}
          numberOfLines={2}
        >
          {`原文: ${referenceText}`}
        </ThemedText>
      ) : null}

      {phase === "recording" ? (
        <View style={styles.pulseWrap}>
          <Animated.View
            style={[
              styles.pulseRing,
              { backgroundColor: `${Colors.light.secondary}55` },
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
      ) : null}

      {transcript && (phase === "recording" || phase === "result") ? (
        <ThemedText
          style={[styles.transcriptText, { color: theme.text }]}
          numberOfLines={1}
          testID={`text-transcript-${wordId ?? "anon"}`}
        >
          {transcript}
        </ThemedText>
      ) : null}

      {score && phase === "result" ? (
        <ThemedText
          style={[styles.scoreText, { color: scoreColor(score.total) }]}
          testID={`text-score-total-${wordId ?? "anon"}`}
        >
          {score.total}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flexShrink: 1,
    gap: 6,
  },
  micButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  pulseWrap: {
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transcriptText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    flexShrink: 1,
    flexBasis: "100%",
  },
  referenceText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    flexShrink: 1,
    flexBasis: "100%",
  },
  scoreText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    fontWeight: "800",
  },
});
