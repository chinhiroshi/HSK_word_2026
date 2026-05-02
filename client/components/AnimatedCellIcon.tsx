import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

export type CellAnimVariant = "wobble" | "float" | "drift" | "pulse" | "twinkle" | "none";

interface AnimatedCellIconProps {
  variant: CellAnimVariant;
  seed?: number;
  durationMs?: number;
  children: React.ReactNode;
}

function getDuration(variant: CellAnimVariant, override?: number): number {
  if (override) return override;
  switch (variant) {
    // withRepeat(... reverse=true) makes a full cycle = 2 × duration,
    // so half-cycle 700ms gives a ~1.4s pulse beat as requested.
    case "pulse":
      return 700;
    case "wobble":
      return 1800;
    case "float":
      return 2400;
    case "drift":
      return 3000;
    case "twinkle":
      return 2000;
    default:
      return 1800;
  }
}

export function AnimatedCellIcon({
  variant,
  seed = 0,
  durationMs,
  children,
}: AnimatedCellIconProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (variant === "none") return;
    const dur = getDuration(variant, durationMs);
    const delay = Math.abs(seed * 137) % dur;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [variant, seed, durationMs, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    if (variant === "wobble") {
      const rotation = interpolate(t, [0, 1], [-3, 3]);
      return { transform: [{ rotate: `${rotation}deg` }] };
    }
    if (variant === "float") {
      const ty = interpolate(t, [0, 1], [-2.5, 2.5]);
      const tx = interpolate(t, [0, 1], [-1, 1]);
      return { transform: [{ translateY: ty }, { translateX: tx }] };
    }
    if (variant === "drift") {
      // Slow horizontal drift — used for clouds so they look windblown
      const tx = interpolate(t, [0, 1], [-3.5, 3.5]);
      return { transform: [{ translateX: tx }] };
    }
    if (variant === "pulse") {
      const scale = interpolate(t, [0, 1], [1, 1.1]);
      return { transform: [{ scale }] };
    }
    if (variant === "twinkle") {
      const scale = interpolate(t, [0, 1], [0.92, 1.08]);
      const opacity = interpolate(t, [0, 1], [0.75, 1]);
      return { transform: [{ scale }], opacity };
    }
    return {};
  });

  if (variant === "none") {
    return <>{children}</>;
  }

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
