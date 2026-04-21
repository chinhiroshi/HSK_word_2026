import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useI18n } from "@/contexts/LanguageContext";
import { setSelectedHskLevel } from "@/lib/storage";
import { HskLevel } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Panda stamp images (static requires)
const PANDA_STAMPS = [
  require("../../assets/images/panda-stamp-1.png"),
  require("../../assets/images/panda-stamp-2.png"),
  require("../../assets/images/panda-stamp-3.png"),
  require("../../assets/images/panda-stamp-7.png"),
  require("../../assets/images/panda-stamp-8.png"),
  require("../../assets/images/panda-stamp-9.png"),
];
const PANDA_STAMP_SPECIAL = require("../../assets/images/panda-stamp-special.png");

const STAMP_CELL = 72;
const STAMP_IMG = 54;

interface OnboardingPage {
  id: string;
  image?: any;
  title: string;
  subtitle: string;
  features: string[];
  icon: keyof typeof Feather.glyphMap;
  isSprintPage?: boolean;
  accentColor?: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const HSK_LEVEL_INFO: { level: HskLevel; wordCount: number; isFree: boolean }[] = [
  { level: 1, wordCount: 150, isFree: true },
  { level: 2, wordCount: 150, isFree: false },
  { level: 3, wordCount: 300, isFree: false },
  { level: 4, wordCount: 600, isFree: false },
  { level: 5, wordCount: 1300, isFree: false },
  { level: 6, wordCount: 2500, isFree: false },
];

function PandaStampGrid({ theme }: { theme: any }) {
  const secondary = Colors.light.secondary;
  return (
    <View style={styles.stampGridWrapper}>
      <View style={styles.stampGrid}>
        {PANDA_STAMPS.map((src, i) => (
          <View
            key={i}
            style={[styles.stampCell, { backgroundColor: theme.backgroundDefault, borderColor: `${secondary}30` }]}
          >
            <Image source={src} style={styles.stampImg} contentFit="contain" />
          </View>
        ))}
      </View>

      <View style={styles.stampDivider} />

      <View style={styles.specialRow}>
        <View style={[styles.specialCell, { backgroundColor: `${secondary}12`, borderColor: `${secondary}50` }]}>
          <Image source={PANDA_STAMP_SPECIAL} style={styles.specialImg} contentFit="contain" />
        </View>
        <View style={styles.specialLabel}>
          <View style={[styles.specialBadge, { backgroundColor: secondary }]}>
            <ThemedText style={styles.specialBadgeText}>Special</ThemedText>
          </View>
          <ThemedText style={[styles.specialDescription, { color: theme.textSecondary }]}>
            {"スプリントのテスト合格で獲得"}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.stampCountRow, { backgroundColor: `${secondary}10`, borderColor: `${secondary}25` }]}>
        <Feather name="award" size={13} color={secondary} />
        <ThemedText style={[styles.stampCountText, { color: secondary }]}>
          {"全60種類 + 特別スタンプ1種"}
        </ThemedText>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<HskLevel>(1);
  const flatListRef = useRef<FlatList>(null);

  const secondary = Colors.light.secondary;

  const PAGES: OnboardingPage[] = [
    {
      id: "1",
      image: require("../../assets/images/onboarding-1.png"),
      title: t("onboard_1_title"),
      subtitle: t("onboard_1_subtitle"),
      features: [t("onboard_1_p1"), t("onboard_1_p2"), t("onboard_1_p3")],
      icon: "book-open",
      accentColor: theme.primary,
    },
    {
      id: "2",
      image: require("../../assets/images/onboarding-2.png"),
      title: t("onboard_2_title"),
      subtitle: t("onboard_2_subtitle"),
      features: [t("onboard_2_p1"), t("onboard_2_p2"), t("onboard_2_p3")],
      icon: "headphones",
      accentColor: theme.primary,
    },
    {
      id: "3",
      image: require("../../assets/images/onboarding-3.png"),
      title: t("onboard_3_title"),
      subtitle: t("onboard_3_subtitle"),
      features: [t("onboard_3_p1"), t("onboard_3_p2"), t("onboard_3_p3")],
      icon: "repeat",
      accentColor: theme.primary,
    },
    {
      id: "6",
      title: t("onboard_6_title"),
      subtitle: t("onboard_6_subtitle"),
      features: [t("onboard_6_p1"), t("onboard_6_p2"), t("onboard_6_p3"), t("onboard_6_p4")],
      icon: "award",
      isSprintPage: true,
      accentColor: secondary,
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
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleGetStarted();
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLevelSelect(true);
  };

  const handleLevelConfirm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setSelectedHskLevel(selectedLevel);
    onComplete();
  };

  const isLastPage = currentIndex === PAGES.length - 1;
  const currentPage = PAGES[currentIndex];
  const activeColor = currentPage?.accentColor ?? theme.primary;

  const renderPage = ({ item }: { item: OnboardingPage }) => (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.imageContainer}>
        {item.isSprintPage ? (
          <PandaStampGrid theme={theme} />
        ) : (
          <Image
            source={item.image}
            style={styles.image}
            contentFit="contain"
          />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={[styles.iconBadge, { backgroundColor: `${item.accentColor ?? theme.primary}18` }]}>
          <Feather name={item.icon} size={22} color={item.accentColor ?? theme.primary} />
        </View>

        <ThemedText style={styles.title}>{item.title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {item.subtitle}
        </ThemedText>

        <View style={styles.featureList}>
          {item.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureCheck, { backgroundColor: `${item.accentColor ?? theme.primary}15` }]}>
                <Feather name="check" size={11} color={item.accentColor ?? theme.primary} />
              </View>
              <ThemedText style={[styles.featureText, { color: theme.text }]}>
                {feature}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (showLevelSelect) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          contentContainerStyle={[
            styles.levelSelectContent,
            { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.levelIconBadge, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="layers" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.levelTitle}>{t("onboard_level_title")}</ThemedText>
          <ThemedText style={[styles.levelSubtitle, { color: theme.textSecondary }]}>
            {t("onboard_level_subtitle")}
          </ThemedText>

          <View style={styles.levelCards}>
            {HSK_LEVEL_INFO.map(({ level, wordCount, isFree }) => {
              const isSelected = selectedLevel === level;
              return (
                <Pressable
                  key={level}
                  testID={`button-level-${level}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLevel(level);
                  }}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: isSelected ? `${theme.primary}12` : theme.backgroundDefault,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.levelCardLeft}>
                    <View style={[styles.levelBadge, { backgroundColor: isSelected ? theme.primary : `${theme.primary}20` }]}>
                      <ThemedText style={[styles.levelBadgeText, { color: isSelected ? "#FFFFFF" : theme.primary }]}>
                        {level}
                      </ThemedText>
                    </View>
                    <View style={styles.levelCardInfo}>
                      <ThemedText style={[styles.levelCardName, { color: theme.text }]}>
                        HSK{level}{"  "}{t(`hsk_title_${level}` as any)}
                      </ThemedText>
                      <ThemedText style={[styles.levelCardWords, { color: theme.textSecondary }]}>
                        {wordCount}{t("words_unit")}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.levelCardRight}>
                    {isFree ? (
                      <View style={[styles.freeBadge, { backgroundColor: Colors.light.success + "20" }]}>
                        <ThemedText style={[styles.freeBadgeText, { color: Colors.light.success }]}>
                          {t("onboard_level_free")}
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={[styles.premiumNote, { color: theme.textSecondary }]}>
                        {t("onboard_level_premium_note")}
                      </ThemedText>
                    )}
                    {isSelected ? (
                      <Feather name="check-circle" size={20} color={theme.primary} />
                    ) : (
                      <View style={[styles.emptyCircle, { borderColor: theme.border }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.levelFooter, { paddingBottom: insets.bottom + Spacing.xl, backgroundColor: theme.backgroundRoot }]}>
          <Pressable
            testID="button-level-confirm"
            style={[styles.nextButton, { backgroundColor: theme.primary }]}
            onPress={handleLevelConfirm}
          >
            <ThemedText style={styles.nextButtonText}>{t("onboard_level_btn")}</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

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
                    index === currentIndex ? activeColor : `${activeColor}30`,
                  width: index === currentIndex ? 20 : 7,
                  height: index === currentIndex ? 7 : 7,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          testID="button-onboarding-next"
          style={[styles.nextButton, { backgroundColor: activeColor }]}
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
    maxHeight: 270,
  },
  image: {
    width: 200,
    height: 200,
  },

  // ── Panda stamp grid ──
  stampGridWrapper: {
    alignItems: "center",
    gap: Spacing.md,
    width: "100%",
  },
  stampGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  stampCell: {
    width: STAMP_CELL,
    height: STAMP_CELL,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stampImg: {
    width: STAMP_IMG,
    height: STAMP_IMG,
  },
  stampDivider: {
    height: 1,
    width: 40,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 1,
  },
  specialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  specialCell: {
    width: STAMP_CELL + 8,
    height: STAMP_CELL + 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  specialImg: {
    width: STAMP_IMG + 6,
    height: STAMP_IMG + 6,
  },
  specialLabel: {
    gap: 6,
  },
  specialBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  specialBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  specialDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 17,
  },
  stampCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  stampCountText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },

  // ── Content ──
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
    lineHeight: 34,
    paddingTop: 4,
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
    gap: Spacing.md,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    flex: 1,
    lineHeight: 21,
  },

  // ── Footer ──
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

  // ── Level Select ──
  levelSelectContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  levelIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  levelTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 36,
    paddingTop: 4,
  },
  levelSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 20,
  },
  levelCards: {
    alignSelf: "stretch",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  levelCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  levelCardInfo: {
    gap: 2,
  },
  levelCardName: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  levelCardWords: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  levelCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  freeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  freeBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  premiumNote: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  levelFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
