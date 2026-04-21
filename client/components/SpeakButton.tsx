import React, { useState } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { speakChinese } from "@/lib/speech";
import { incrementSpeakCount } from "@/lib/storage";

interface SpeakButtonProps {
  text: string;
  size?: "small" | "medium" | "large";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SpeakButton({ text, size = "medium" }: SpeakButtonProps) {
  const { theme } = useTheme();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.9, springConfig, () => {
      scale.value = withSpring(1, springConfig);
    });

    setIsSpeaking(true);
    pulse.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      ),
      -1,
      true
    );

    incrementSpeakCount(text).catch(() => {});
    await speakChinese(text);
    
    pulse.value = withSpring(1, springConfig);
    setIsSpeaking(false);
  };

  const buttonSize = size === "small" ? 32 : size === "large" ? 56 : 44;
  const iconSize = size === "small" ? 16 : size === "large" ? 28 : 22;

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: isSpeaking ? Colors.light.secondary : Colors.light.primary,
        },
        animatedStyle,
      ]}
      testID="speak-button"
    >
      <Feather
        name={isSpeaking ? "volume-2" : "volume-2"}
        size={iconSize}
        color="#FFFFFF"
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
