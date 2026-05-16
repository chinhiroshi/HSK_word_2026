import React, { useState } from "react";
import { Pressable, StyleSheet, GestureResponderEvent } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { PronunciationEvaluatorModal } from "@/components/PronunciationEvaluatorModal";

interface PronounceButtonProps {
  text: string;
  size?: "small" | "medium";
  wordId?: string;
}

export function PronounceButton({ text, size = "small", wordId }: PronounceButtonProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const buttonSize = size === "small" ? 28 : 36;
  const iconSize = size === "small" ? 14 : 18;

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        testID={`button-pronounce-${wordId ?? "anon"}`}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: `${Colors.light.secondary}20`,
            borderColor: Colors.light.secondary,
          },
        ]}
      >
        <Feather name="mic" size={iconSize} color={Colors.light.secondary} />
      </Pressable>
      {open ? (
        <PronunciationEvaluatorModal
          visible={open}
          referenceText={text}
          wordId={wordId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});
