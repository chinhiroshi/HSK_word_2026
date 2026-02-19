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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingPage {
  id: string;
  image: any;
  title: string;
  subtitle: string;
  features: string[];
  icon: keyof typeof Feather.glyphMap;
}

const PAGES: OnboardingPage[] = [
  {
    id: "1",
    image: require("../../assets/images/onboarding-1.png"),
    title: "HSK全級を網羅",
    subtitle: "HSK1級〜6級、約5,000語を収録",
    features: [
      "各級の単語を50語ずつのグループで学習",
      "級ごとに独立した進捗管理",
      "ネイティブ発音で音声確認",
    ],
    icon: "globe",
  },
  {
    id: "2",
    image: require("../../assets/images/onboarding-2.png"),
    title: "音を聞いて覚える",
    subtitle: "リスニング重視の学習法で記憶に定着",
    features: [
      "まず音声だけで単語を聞く",
      "タップで文字を確認して答え合わせ",
      "「聞いてわかる」力を鍛える",
    ],
    icon: "headphones",
  },
  {
    id: "3",
    image: require("../../assets/images/onboarding-3.png"),
    title: "繰り返し再生で定着",
    subtitle: "覚えていない単語だけを集中リピート",
    features: [
      "単語→訳→例文を自動で連続再生",
      "再生範囲を自由に設定",
      "ながら学習にも最適",
    ],
    icon: "repeat",
  },
  {
    id: "4",
    image: require("../../assets/images/onboarding-4.png"),
    title: "例文で使い方を確認",
    subtitle: "短い例文と長い例文で用法をマスター",
    features: [
      "すべての単語に例文付き",
      "長い例文で実践的な使い方も学べる",
      "文字カードを見ながら学習も可能",
    ],
    icon: "book-open",
  },
  {
    id: "5",
    image: require("../../assets/images/onboarding-5.png"),
    title: "さあ、始めましょう！",
    subtitle: "最初の50単語は無料でお試しいただけます",
    features: [
      "今すぐ学習をスタート",
      "自分のペースで着実にレベルアップ",
    ],
    icon: "zap",
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
              スキップ
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
            <ThemedText style={styles.nextButtonText}>始める</ThemedText>
          ) : (
            <View style={styles.nextButtonContent}>
              <ThemedText style={styles.nextButtonText}>次へ</ThemedText>
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
    justifyContent: "center",
    alignItems: "center",
    height: 180,
    marginBottom: Spacing.sm,
  },
  image: {
    width: 160,
    height: 160,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.xs,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  featureList: {
    alignSelf: "stretch",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
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
