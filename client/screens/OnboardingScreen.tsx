import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useI18n } from "@/contexts/LanguageContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingPage {
  id: string;
  image: any;
  title: string;
  subtitle: string;
  features: string[];
  icon: keyof typeof Feather.glyphMap;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const PAGES: OnboardingPage[] = [
    {
      id: "1",
      image: require("../../assets/images/onboarding-1.png"),
      title: t("onboard_1_title"),
      subtitle: t("onboard_1_subtitle"),
      features: [t("onboard_1_p1"), t("onboard_1_p2"), t("onboard_1_p3")],
      icon: "globe",
    },
    {
      id: "2",
      image: require("../../assets/images/onboarding-2.png"),
      title: t("onboard_2_title"),
      subtitle: t("onboard_2_subtitle"),
      features: [t("onboard_2_p1"), t("onboard_2_p2"), t("onboard_2_p3")],
      icon: "headphones",
    },
    {
      id: "3",
      image: require("../../assets/images/onboarding-3.png"),
      title: t("onboard_3_title"),
      subtitle: t("onboard_3_subtitle"),
      features: [t("onboard_3_p1"), t("onboard_3_p2"), t("onboard_3_p3")],
      icon: "repeat",
    },
    {
      id: "4",
      image: require("../../assets/images/onboarding-4.png"),
      title: t("onboard_4_title"),
      subtitle: t("onboard_4_subtitle"),
      features: [t("onboard_4_p1"), t("onboard_4_p2"), t("onboard_4_p3")],
      icon: "book-open",
    },
    {
      id: "5",
      image: require("../../assets/images/onboarding-5.png"),
      title: t("onboard_5_title"),
      subtitle: t("onboard_5_subtitle"),
      features: [t("onboard_5_p1"), t("onboard_5_p2")],
      icon: "zap",
    },
    {
      id: "6",
      image: require("../../assets/images/onboarding-6.png"),
      title: t("onboard_6_title"),
      subtitle: t("onboard_6_subtitle"),
      features: [t("onboard_6_p1"), t("onboard_6_p2"), t("onboard_6_p3"), t("onboard_6_p4")],
      icon: "award",
    },
  ];

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleGetStarted();
  };

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const isLastPage = currentIndex === PAGES.length - 1;

  const renderPage = ({ item }: { item: OnboardingPage }) => (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.image}
          contentFit="contain"
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name={item.icon} size={22} color={theme.primary} />
        </View>

        <ThemedText style={styles.title}>{item.title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {item.subtitle}
        </ThemedText>

        <View style={styles.featureList}>
          {item.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={[styles.featureText, { color: theme.text }]}>
                {feature}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        {!isLastPage ? (
          <Pressable
            testID="button-skip-onboarding"
            onPress={handleSkip}
            style={styles.skipButton}
          >
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              {t("skip")}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.pagination}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? theme.primary : `${theme.primary}30`,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          testID="button-onboarding-next"
          style={[styles.nextButton, { backgroundColor: theme.primary }]}
          onPress={handleNext}
        >
          {isLastPage ? (
            <ThemedText style={styles.nextButtonText}>{t("onboard_start")}</ThemedText>
          ) : (
            <View style={styles.nextButtonContent}>
              <ThemedText style={styles.nextButtonText}>{t("onboard_next")}</ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxHeight: 260,
  },
  image: {
    width: 200,
    height: 200,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.lg,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: "stretch",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
