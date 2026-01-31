import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const emptyStudy = require("../../assets/images/empty-study.png");
const emptyVideos = require("../../assets/images/empty-videos.png");

interface EmptyStateProps {
  type: "study" | "videos";
  title: string;
  message: string;
}

export function EmptyState({ type, title, message }: EmptyStateProps) {
  const { theme } = useTheme();

  const image = type === "study" ? emptyStudy : emptyVideos;

  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} contentFit="contain" />
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
