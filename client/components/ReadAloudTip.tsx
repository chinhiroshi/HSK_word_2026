import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ReadAloudTipProps {
  variant?: "audio" | "text";
}

export function ReadAloudTip({ variant = "text" }: ReadAloudTipProps) {
  const { theme } = useTheme();

  const title = "声に出して読みましょう";
  const subtitle =
    variant === "audio"
      ? "聞いたあとに発音すると、リスニングと記憶が一緒に鍛えられます"
      : "発音しながら学習すると、記憶への定着が大きく上がります";

  return (
    <View
      testID={`read-aloud-tip-${variant}`}
      style={[
        styles.container,
        {
          backgroundColor: `${theme.primary}12`,
          borderColor: `${theme.primary}40`,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
        <Feather name="mic" size={16} color="#fff" />
      </View>
      <View style={styles.textBlock}>
        <ThemedText style={[styles.title, { color: theme.primary }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 16,
  },
});
