import React, { useEffect, useRef, useMemo } from "react";
import { View, Animated, StyleSheet, Dimensions, Easing } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#FF922B",
  "#E64980",
  "#7950F2",
  "#20C997",
  "#F06595",
  "#74C0FC",
  "#FFA94D",
  "#63E6BE",
];

const PIECE_COUNT = 70;

interface Piece {
  id: number;
  color: string;
  startX: number;
  width: number;
  height: number;
  delay: number;
  duration: number;
  rotateDir: number;
  driftX: number;
  isCircle: boolean;
}

interface Props {
  visible: boolean;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    startX: Math.random() * W,
    width: Math.random() * 10 + 6,
    height: Math.random() * 7 + 4,
    delay: Math.random() * 700,
    duration: Math.random() * 900 + 1200,
    rotateDir: Math.random() > 0.5 ? 1 : -1,
    driftX: (Math.random() - 0.5) * 100,
    isCircle: Math.random() > 0.6,
  }));
}

export default function ConfettiAnimation({ visible }: Props) {
  const pieces = useMemo(makePieces, []);
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;
  const runningRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) return;

    anims.forEach((a) => a.setValue(0));

    const composed = Animated.parallel(
      anims.map((a, i) =>
        Animated.sequence([
          Animated.delay(pieces[i].delay),
          Animated.timing(a, {
            toValue: 1,
            duration: pieces[i].duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    runningRef.current = composed;
    composed.start(() => {
      runningRef.current = null;
    });

    return () => {
      runningRef.current?.stop();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => {
        const a = anims[i];
        const translateY = a.interpolate({
          inputRange: [0, 1],
          outputRange: [-24, H + 40],
        });
        const translateX = a.interpolate({
          inputRange: [0, 1],
          outputRange: [piece.startX, piece.startX + piece.driftX],
        });
        const rotate = a.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${piece.rotateDir * 720}deg`],
        });
        const opacity = a.interpolate({
          inputRange: [0, 0.05, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={piece.id}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: piece.width,
              height: piece.isCircle ? piece.width : piece.height,
              borderRadius: piece.isCircle ? piece.width / 2 : 2,
              backgroundColor: piece.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
