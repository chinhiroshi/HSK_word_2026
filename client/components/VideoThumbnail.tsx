import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Video } from "@/types";

const sampleThumbnail1 = require("../../assets/images/sample-thumbnail-1.png");
const sampleThumbnail2 = require("../../assets/images/sample-thumbnail-2.png");

interface VideoThumbnailProps {
  video: Video;
  onPress: () => void;
  size?: "small" | "large";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VideoThumbnail({
  video,
  onPress,
  size = "small",
}: VideoThumbnailProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const getThumbnail = () => {
    if (video.thumbnailUrl === "sample-thumbnail-1") {
      return sampleThumbnail1;
    }
    return sampleThumbnail2;
  };

  const isLarge = size === "large";
  const containerStyle = isLarge ? styles.containerLarge : styles.container;
  const imageStyle = isLarge ? styles.imageLarge : styles.image;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[containerStyle, animatedStyle]}
      testID={`video-thumbnail-${video.id}`}
    >
      <Image source={getThumbnail()} style={imageStyle} contentFit="cover" />
      <View style={styles.playOverlay}>
        <View
          style={[styles.playButton, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        >
          <Feather name="play" size={isLarge ? 24 : 16} color="#FFFFFF" />
        </View>
      </View>
      <View
        style={[
          styles.titleContainer,
          { backgroundColor: "rgba(0,0,0,0.5)" },
        ]}
      >
        <ThemedText
          style={styles.title}
          numberOfLines={1}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          {video.title}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 100,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginRight: Spacing.sm,
  },
  containerLarge: {
    flex: 1,
    height: 120,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageLarge: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  title: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
  },
});
