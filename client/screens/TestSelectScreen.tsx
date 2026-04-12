import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useI18n } from "@/contexts/LanguageContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

interface TestCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled: boolean;
}

function TestCard({ title, description, icon, onPress, disabled }: TestCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.testCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${Colors.light.primary}20` },
        ]}
      >
        <Feather name={icon} size={28} color={Colors.light.primary} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={24} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

export default function TestSelectScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<NavigationProp>();

  const [unmemorizedCount, setUnmemorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    await initializeData();
    const words = await getWords();
    const count = words.filter((w) => !w.isMemorized).length;
    setUnmemorizedCount(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const handleWordTest = () => {
    navigation.navigate("Test", { testType: "word" });
  };

  const handleSentenceTest = () => {
    navigation.navigate("Test", { testType: "sentence" });
  };

  const isDisabled = unmemorizedCount === 0;

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t("test_mode_title")}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            まだ覚えていない単語をシャッフルしてテストします
          </ThemedText>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: unmemorizedCount > 0
                  ? `${Colors.light.alert}20`
                  : `${Colors.light.success}20`,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.countText,
                {
                  color: unmemorizedCount > 0
                    ? Colors.light.alert
                    : Colors.light.success,
                },
              ]}
            >
              {unmemorizedCount > 0
                ? `${t("not_started")}: ${unmemorizedCount}${t("words_unit")}`
                : t("test_all_memorized")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.testOptions}>
          <TestCard
            title={t("test_word")}
            description={t("test_word_desc")}
            icon="type"
            onPress={handleWordTest}
            disabled={isDisabled}
          />
          <TestCard
            title={t("test_sentence")}
            description={t("test_sentence_desc")}
            icon="headphones"
            onPress={handleSentenceTest}
            disabled={isDisabled}
          />
        </View>

        {isDisabled ? (
          <View style={styles.noTestMessage}>
            <Feather name="award" size={48} color={Colors.light.success} />
            <ThemedText style={styles.noTestTitle}>{t("congratulations")}</ThemedText>
            <ThemedText style={[styles.noTestText, { color: theme.textSecondary }]}>
              {t("all_words_memorized_msg")}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  countBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  testOptions: {
    gap: Spacing.lg,
  },
  testCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  noTestMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  noTestTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  noTestText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
