import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { useShouldAnimate } from "@/lib/appStateBus";

export type SprintIconAnim =
  | "wobble"
  | "float"
  | "drift"
  | "pulse"
  | "twinkle"
  | "hop"
  | "here";

interface Props {
  type: SprintIconAnim;
  seed?: number;
  children: React.ReactNode;
}

// Tempo tiers indexed 0..3: stop / slow / medium / fast.
const DURATION_TIERS: Record<SprintIconAnim, number>[] = [
  { wobble: 0, float: 0, drift: 0, pulse: 0, twinkle: 0, hop: 0, here: 0 },
  { wobble: 1470, float: 1470, drift: 2800, pulse: 980, twinkle: 1180, hop: 700, here: 650 },
  { wobble: 880, float: 880, drift: 1700, pulse: 630, twinkle: 740, hop: 460, here: 650 },
  { wobble: 410, float: 410, drift: 950, pulse: 320, twinkle: 360, hop: 280, here: 650 },
];

// Each icon breathes through this pattern. Single STOP per loop at the start;
// the rest of the cycle keeps moving with FAST as the prolonged peak.
const PHASE_PATTERN = [0, 1, 2, 3, 2, 1]; // STOP→SLOW→MED→FAST→MED→SLOW→loop
// Per-position duration. FAST is held 5x longer than the other phases so the
// peak energy moment lingers, while STOP/SLOW/MED stay snappy.
const PHASE_DURATIONS_MS = [3000, 3000, 3000, 15000, 3000, 3000];
const FULL_CYCLE_MS = PHASE_DURATIONS_MS.reduce((a, b) => a + b, 0);

function phaseAtOffset(offsetMs: number): { idx: number; remainingMs: number } {
  let acc = 0;
  for (let i = 0; i < PHASE_DURATIONS_MS.length; i++) {
    const next = acc + PHASE_DURATIONS_MS[i];
    if (offsetMs < next) {
      return { idx: i, remainingMs: next - offsetMs };
    }
    acc = next;
  }
  return { idx: 0, remainingMs: PHASE_DURATIONS_MS[0] };
}

function hashSeed(seed: number, salt: number): number {
  const base = Math.abs(Math.floor(seed));
  return Math.abs((base * 374761393 + salt) ^ (base << 7) ^ (base >>> 4));
}

export function AnimatedSprintIcon({ type, seed = 0, children }: Props) {
  if (type === "hop") {
    return <MonsterHop seed={seed}>{children}</MonsterHop>;
  }
  if (type === "here") {
    return <HereMarker>{children}</HereMarker>;
  }
  return (
    <DecoCycle type={type} seed={seed}>
      {children}
    </DecoCycle>
  );
}

// Current-position marker: bold "I'm here!" pulse with a small hop. Always
// animating since there is at most one current cell on the map.
function HereMarker({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);
  const shouldAnimate = useShouldAnimate();

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = 0.9 + p * 0.25; // 0.90 → 1.15 — strong pump
    const ty = -p * 5; // 0 → -5 — small lift at peak
    return { transform: [{ translateY: ty }, { scale }] };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// Always-on MED-tempo wrapper for emoji decorations. Same motion vocabulary as
// DecoCycle (wobble/float/drift/pulse/twinkle/hop) but with no phase cycling —
// emojis breathe at a steady MED pace as the user requested.
function ConstantMedAnim({
  type,
  seed,
  children,
}: {
  type: SprintIconAnim;
  seed: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);
  const shouldAnimate = useShouldAnimate();

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      return;
    }
    const duration = DURATION_TIERS[2][type] || 600;
    const delay = hashSeed(seed, 2017) % duration;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [seed, type, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    switch (type) {
      case "pulse": {
        const scale = 1 + p * 0.13;
        return { transform: [{ scale }] };
      }
      case "float": {
        const tx = (p - 0.5) * 10;
        return { transform: [{ translateX: tx }] };
      }
      case "drift": {
        const tx = (p - 0.5) * 14;
        return { transform: [{ translateX: tx }] };
      }
      case "wobble": {
        const rot = (p - 0.5) * 26;
        const scale = 0.96 + p * 0.08;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
      }
      case "twinkle": {
        const scale = 0.9 + p * 0.2;
        const rot = (p - 0.5) * 20;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
      }
      case "hop": {
        const ty = (p - 0.5) * 14; // ±7px vertical bounce for emoji
        return { transform: [{ translateY: ty }] };
      }
      default:
        return {};
    }
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// Emoji deco sprite — renders an emoji as Text and animates it at a constant
// MED tempo using the supplied motion type.
export function EmojiSprite({
  emoji,
  anim,
  seed = 0,
  size,
}: {
  emoji: string;
  anim: SprintIconAnim;
  seed?: number;
  size: number;
}) {
  return (
    <ConstantMedAnim type={anim} seed={seed}>
      <Text style={{ fontSize: size, lineHeight: size * 1.15 }}>{emoji}</Text>
    </ConstantMedAnim>
  );
}

// Test-cell monster: always-on vertical bounce at MED tempo, no phase cycling.
// A deterministic per-seed delay desyncs monsters so they don't bounce in unison.
function MonsterHop({
  seed,
  children,
}: {
  seed: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);
  const shouldAnimate = useShouldAnimate();

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      return;
    }
    const duration = DURATION_TIERS[2].hop; // MED tier, fixed forever
    const delay = hashSeed(seed, 1009) % duration;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [seed, shouldAnimate]);

  // Only ~1/3 of monsters get the rotational wobble; the rest stay as plain
  // vertical hoppers so the map doesn't feel uniformly busy.
  const swayed = hashSeed(seed, 4421) % 3 === 0;

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const ty = (p - 0.5) * 20; // ±10px vertical bounce
    // Linear sway in-phase with the bounce — peaks ±15° at landing/takeoff so
    // the swayed monsters visibly swing rather than vibrate mid-air.
    const rot = swayed ? (p - 0.5) * 30 : 0;
    return { transform: [{ translateY: ty }, { rotate: `${rot}deg` }] };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// Cycles through STOP/SLOW/MED/FAST/MED/SLOW/STOP, starting at a deterministic
// random offset so the map is always a mix of stopped and moving cells at
// varied tempos.
function DecoCycle({
  type,
  seed,
  children,
}: {
  type: SprintIconAnim;
  seed: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);
  const shouldAnimate = useShouldAnimate();

  const [phaseIdx, setPhaseIdx] = useState(
    () => phaseAtOffset(hashSeed(seed, 12345) % FULL_CYCLE_MS).idx,
  );

  // Drive phase progression. Paused when the screen is unfocused or the
  // app is backgrounded so we don't keep firing setTimeouts off-screen.
  // On resume, we schedule from the *current* phaseIdx (not the original
  // offset) so the timer chain stays aligned with the animation effect.
  useEffect(() => {
    if (!shouldAnimate) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = (currentIdx: number) => {
      const nextIdx = (currentIdx + 1) % PHASE_PATTERN.length;
      timeoutId = setTimeout(() => {
        setPhaseIdx(nextIdx);
        scheduleNext(nextIdx);
      }, PHASE_DURATIONS_MS[nextIdx]);
    };

    scheduleNext(phaseIdx);

    return () => clearTimeout(timeoutId);
    // phaseIdx intentionally omitted — re-running on every phase change
    // would double-schedule. scheduleNext drives subsequent transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, shouldAnimate]);

  // React to phase change: swap the animation tempo or ease back to rest.
  // Also pauses when the screen is unfocused or the app is backgrounded.
  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      return;
    }
    const tierIdx = PHASE_PATTERN[phaseIdx];
    const duration = DURATION_TIERS[tierIdx][type];
    cancelAnimation(progress);
    if (duration === 0) {
      progress.value = withTiming(0, {
        duration: 800,
        easing: Easing.inOut(Easing.sin),
      });
    } else {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [phaseIdx, type, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    switch (type) {
      case "pulse": {
        const scale = 1 + p * 0.13;
        return { transform: [{ scale }] };
      }
      case "float": {
        const tx = (p - 0.5) * 10;
        return { transform: [{ translateX: tx }] };
      }
      case "drift": {
        // Clouds: gentle, wider horizontal drift than `float`.
        const tx = (p - 0.5) * 14;
        return { transform: [{ translateX: tx }] };
      }
      case "wobble": {
        // Wider sway plus a subtle scale pump — feels alive, like a plant
        // catching a gust of wind rather than gently nodding.
        const rot = (p - 0.5) * 26;
        const scale = 0.96 + p * 0.08;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
      }
      case "twinkle": {
        const scale = 0.9 + p * 0.2;
        const rot = (p - 0.5) * 20;
        return { transform: [{ scale }, { rotate: `${rot}deg` }] };
      }
      default:
        return {};
    }
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
