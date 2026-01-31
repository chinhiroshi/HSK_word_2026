import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonLoaderProps {
  count?: number;
}

function SkeletonCard() {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundSecondary },
        animatedStyle,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[styles.circle, { backgroundColor: theme.backgroundTertiary }]}
        />
        <View style={styles.textContainer}>
          <View
            style={[
              styles.titleBar,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          />
          <View
            style={[
              styles.subtitleBar,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

export function SkeletonLoader({ count = 5 }: SkeletonLoaderProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    gap: Spacing.sm,
  },
  titleBar: {
    height: 16,
    borderRadius: 4,
    width: "60%",
  },
  subtitleBar: {
    height: 12,
    borderRadius: 4,
    width: "40%",
  },
});
