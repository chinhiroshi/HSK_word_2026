import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Colors } from "@/constants/theme";

interface ProgressBarProps {
  progress: number;
  height?: number;
}

const springConfig: WithSpringConfig = {
  damping: 20,
  mass: 0.5,
  stiffness: 100,
};

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const { theme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${Math.min(100, Math.max(0, progress))}%`, springConfig),
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, height },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: Colors.light.primary, height },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
});
