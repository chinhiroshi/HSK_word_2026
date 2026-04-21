import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SpeakButton } from "@/components/SpeakButton";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint, getSessionType } from "@/contexts/SprintContext";
import { getQuoteForStamp, Quote } from "@/data/quotes";
import { HSK_QUOTES } from "@/data/hskQuotes";
import { getTutorialStampEarned } from "@/lib/storage";
import { useFocusEffect } from "@react-navigation/native";

// Panda stamp images (60 variants + 1 special)
const PANDA_STAMPS: Record<number, any> = {
  1:  require("../../assets/images/panda-stamp-1.png"),
  2:  require("../../assets/images/panda-stamp-2.png"),
  3:  require("../../assets/images/panda-stamp-3.png"),
  4:  require("../../assets/images/panda-stamp-4.png"),
  5:  require("../../assets/images/panda-stamp-5.png"),
  6:  require("../../assets/images/panda-stamp-6.png"),
  7:  require("../../assets/images/panda-stamp-7.png"),
  8:  require("../../assets/images/panda-stamp-8.png"),
  9:  require("../../assets/images/panda-stamp-9.png"),
  10: require("../../assets/images/panda-stamp-10.png"),
  11: require("../../assets/images/panda-stamp-11.png"),
  12: require("../../assets/images/panda-stamp-12.png"),
  // Sports / activities
  13: require("../../assets/images/panda-stamp-13.png"),
  14: require("../../assets/images/panda-stamp-14.png"),
  15: require("../../assets/images/panda-stamp-15.png"),
  16: require("../../assets/images/panda-stamp-16.png"),
  17: require("../../assets/images/panda-stamp-17.png"),
  18: require("../../assets/images/panda-stamp-18.png"),
  19: require("../../assets/images/panda-stamp-19.png"),
  20: require("../../assets/images/panda-stamp-20.png"),
  21: require("../../assets/images/panda-stamp-21.png"),
  22: require("../../assets/images/panda-stamp-22.png"),
  // Food themed
  23: require("../../assets/images/panda-stamp-23.png"),
  24: require("../../assets/images/panda-stamp-24.png"),
  25: require("../../assets/images/panda-stamp-25.png"),
  26: require("../../assets/images/panda-stamp-26.png"),
  27: require("../../assets/images/panda-stamp-27.png"),
  28: require("../../assets/images/panda-stamp-28.png"),
  29: require("../../assets/images/panda-stamp-29.png"),
  30: require("../../assets/images/panda-stamp-30.png"),
  31: require("../../assets/images/panda-stamp-31.png"),
  32: require("../../assets/images/panda-stamp-32.png"),
  // Seasons / nature
  33: require("../../assets/images/panda-stamp-33.png"),
  34: require("../../assets/images/panda-stamp-34.png"),
  35: require("../../assets/images/panda-stamp-35.png"),
  36: require("../../assets/images/panda-stamp-36.png"),
  37: require("../../assets/images/panda-stamp-37.png"),
  38: require("../../assets/images/panda-stamp-38.png"),
  39: require("../../assets/images/panda-stamp-39.png"),
  40: require("../../assets/images/panda-stamp-40.png"),
  41: require("../../assets/images/panda-stamp-41.png"),
  42: require("../../assets/images/panda-stamp-42.png"),
  // Costumes / roles
  43: require("../../assets/images/panda-stamp-43.png"),
  44: require("../../assets/images/panda-stamp-44.png"),
  45: require("../../assets/images/panda-stamp-45.png"),
  46: require("../../assets/images/panda-stamp-46.png"),
  47: require("../../assets/images/panda-stamp-47.png"),
  48: require("../../assets/images/panda-stamp-48.png"),
  49: require("../../assets/images/panda-stamp-49.png"),
  50: require("../../assets/images/panda-stamp-50.png"),
  51: require("../../assets/images/panda-stamp-51.png"),
  52: require("../../assets/images/panda-stamp-52.png"),
  // Expressions / emotions
  53: require("../../assets/images/panda-stamp-53.png"),
  54: require("../../assets/images/panda-stamp-54.png"),
  55: require("../../assets/images/panda-stamp-55.png"),
  56: require("../../assets/images/panda-stamp-56.png"),
  57: require("../../assets/images/panda-stamp-57.png"),
  58: require("../../assets/images/panda-stamp-58.png"),
  59: require("../../assets/images/panda-stamp-59.png"),
  60: require("../../assets/images/panda-stamp-60.png"),
};
const PANDA_SPECIAL = require("../../assets/images/panda-stamp-special.png");

const NUM_COLS = 4;
const SCREEN_WIDTH = Dimensions.get("window").width;
const STAMP_SIZE = Math.floor(
  (SCREEN_WIDTH - Spacing.lg * 2 - (NUM_COLS - 1) * Spacing.md) / NUM_COLS
);

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function getPandaImage(cellIndex: number, isSpecial: boolean) {
  if (isSpecial) return PANDA_SPECIAL;
  const variant = ((cellIndex - 1) % 60) + 1;
  return PANDA_STAMPS[variant];
}

export default function SprintStampGalleryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { sprintData, totalCells, currentLevel } = useSprint();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [tutorialEarned, setTutorialEarned] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const earned = await getTutorialStampEarned();
        if (!cancelled) setTutorialEarned(earned);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const wordsPerDay = sprintData?.wordsPerDay ?? 10;
  const completedDates = sprintData?.completedDates ?? {};
  const specialStamps = sprintData?.specialStamps ?? [];
  const isSetup = sprintData?.hasSetup ?? false;

  type Cell = {
    index: number;
    sessionType: ReturnType<typeof getSessionType> | "tutorial";
    completedDate: string | null;
    isSpecial: boolean;
    isTutorial?: boolean;
  };

  const cells = useMemo<Cell[]>(() => {
    const result: Cell[] = [];
    // First cell (top-left) is reserved for the onboarding tutorial stamp.
    result.push({
      index: 0,
      sessionType: "tutorial",
      completedDate: tutorialEarned ? "" : null,
      isSpecial: false,
      isTutorial: true,
    });
    for (let i = 1; i < totalCells; i++) {
      const sessionType = getSessionType(i, wordsPerDay);
      const completedDate = completedDates[i] ?? null;
      const isSpecial = specialStamps.includes(i);
      result.push({ index: i, sessionType, completedDate, isSpecial });
    }
    return result;
  }, [totalCells, wordsPerDay, completedDates, specialStamps, tutorialEarned]);

  // Simple sequential rows — left to right, top to bottom
  const rows: (Cell | null)[][] = [];
  for (let i = 0; i < cells.length; i += NUM_COLS) {
    const row: (Cell | null)[] = cells.slice(i, i + NUM_COLS);
    while (row.length < NUM_COLS) row.push(null);
    rows.push(row);
  }

  // Exclude the tutorial cell from sprint stats so progress reflects the
  // actual 7-day cycle, not the onboarding stamp.
  const sprintCells = cells.filter((c) => !c.isTutorial);
  const completedCount = sprintCells.filter((c) => c.completedDate !== null).length;
  const specialCount = sprintCells.filter((c) => c.isSpecial).length;
  const testCount = sprintCells.filter(
    (c) => c.sessionType === "test" && c.completedDate
  ).length;

  const progressPercent =
    sprintCells.length > 0
      ? Math.round((completedCount / sprintCells.length) * 100)
      : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: safeHeaderPadding + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: theme.primary }]}>
                {completedCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {t("stamps_collected")}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: "#7C3AED" }]}>
                {testCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {t("test_passed_count_label")}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: Colors.light.alert }]}>
                {specialCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {t("legend_special")}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {progressPercent}{t("percent_achieved")}
          </ThemedText>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              {t("legend_study")}
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              {t("legend_test")}
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.alert }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              {t("legend_special_panda")}
            </ThemedText>
          </View>
        </View>

        {/* Tap hint */}
        {isSetup ? (
          <View style={styles.tapHintRow}>
            <Feather name="info" size={13} color={theme.textSecondary} />
            <ThemedText style={[styles.tapHintText, { color: theme.textSecondary }]}>
              {t("tap_stamp_hint")}
            </ThemedText>
          </View>
        ) : null}

        {/* Stamp Grid */}
        {!isSetup ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Feather name="map" size={40} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("stamp_gallery_empty")}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map((cell, colIdx) => {
                  if (!cell) {
                    return <View key={colIdx} style={{ width: STAMP_SIZE }} />;
                  }

                  const isCompleted = cell.completedDate !== null;
                  const isTest = cell.sessionType === "test";
                  const isSpecial = cell.isSpecial;
                  const isTutorial = !!cell.isTutorial;

                  const borderColor = isTutorial
                    ? Colors.light.secondary
                    : isSpecial
                    ? Colors.light.alert
                    : isTest
                    ? "#7C3AED"
                    : theme.primary;

                  const handleStampPress = () => {
                    if (!isCompleted) return;
                    if (isTutorial) {
                      const hq = HSK_QUOTES[currentLevel as 1 | 2 | 3 | 4 | 5 | 6];
                      if (hq) {
                        setSelectedQuote({
                          number: 0,
                          flag: "🇨🇳",
                          chinese: hq.original,
                          pinyin: "",
                          source: lang === "en" ? hq.sourceEn : hq.source,
                          japanese: hq.literal,
                          english: hq.literalEn,
                        });
                      }
                      return;
                    }
                    const quote = getQuoteForStamp(cell.index, currentLevel);
                    if (quote) setSelectedQuote(quote);
                  };

                  return (
                    <Pressable key={colIdx} style={[styles.stampWrapper, { width: STAMP_SIZE }]} onPress={handleStampPress}>
                      <View
                        style={[
                          styles.stampCircle,
                          {
                            width: STAMP_SIZE,
                            height: STAMP_SIZE,
                            borderRadius: STAMP_SIZE / 2,
                            borderColor: isCompleted ? borderColor : theme.border,
                            borderWidth: isCompleted ? 2.5 : 1.5,
                            backgroundColor: isCompleted
                              ? theme.backgroundDefault
                              : theme.backgroundSubtle ?? "#F3F4F6",
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <Image
                            source={
                              isTutorial
                                ? PANDA_STAMPS[1]
                                : getPandaImage(cell.index, isSpecial)
                            }
                            style={[
                              styles.pandaImage,
                              { width: STAMP_SIZE - 6, height: STAMP_SIZE - 6, borderRadius: (STAMP_SIZE - 6) / 2 },
                            ]}
                            resizeMode="cover"
                          />
                        ) : isTutorial ? (
                          <Feather
                            name="award"
                            size={Math.round(STAMP_SIZE * 0.42)}
                            color={theme.border}
                          />
                        ) : (
                          <ThemedText
                            style={[styles.stampNumber, { color: theme.border, fontSize: STAMP_SIZE * 0.26 }]}
                          >
                            {cell.index}
                          </ThemedText>
                        )}
                      </View>

                      <View style={styles.stampMeta}>
                        <ThemedText
                          style={[
                            styles.stampDate,
                            {
                              color: isTutorial
                                ? Colors.light.secondary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {isTutorial ? "はじめての一歩" : `No.${cell.index}`}
                        </ThemedText>
                        {!isTutorial && isCompleted && cell.completedDate ? (
                          <ThemedText style={[styles.stampDate, { color: theme.textSecondary }]}>
                            {` ${formatDate(cell.completedDate)}`}
                          </ThemedText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {/* Quote Modal */}
      <Modal
        visible={selectedQuote !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedQuote(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedQuote(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            {selectedQuote ? (
              <>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalFlag}>{selectedQuote.flag}</ThemedText>
                  <ThemedText style={[styles.modalSource, { color: theme.textSecondary }]}>{selectedQuote.source}</ThemedText>
                </View>
                <ThemedText style={[styles.modalChinese, { color: theme.text }]}>{selectedQuote.chinese}</ThemedText>
                <View style={styles.modalSpeakRow}>
                  <SpeakButton text={selectedQuote.chinese} size="small" />
                </View>
                <ThemedText style={[styles.modalPinyin, { color: theme.primary }]}>{selectedQuote.pinyin}</ThemedText>
                <ThemedText style={[styles.modalJapanese, { color: theme.textSecondary }]}>
                  {lang === "en" && selectedQuote.english ? selectedQuote.english : selectedQuote.japanese}
                </ThemedText>
                <Pressable
                  style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedQuote(null)}
                >
                  <ThemedText style={styles.modalCloseBtnText}>{t("close")}</ThemedText>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 40 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  tapHintRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, alignSelf: "center", marginTop: Spacing.xs, marginBottom: Spacing.sm },
  tapHintText: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  grid: { gap: Spacing.md },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  stampWrapper: {
    alignItems: "center",
    gap: 4,
  },
  stampCircle: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  pandaImage: {
    position: "absolute",
  },
  stampNumber: {
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  stampMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stampDate: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  emptyCard: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalFlag: {
    fontSize: 28,
  },
  modalSource: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
    flexWrap: "wrap",
  },
  modalChinese: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    lineHeight: 30,
  },
  modalSpeakRow: { marginTop: Spacing.xs, marginBottom: Spacing.xs },
  modalPinyin: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
  },
  modalJapanese: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
  },
  modalCloseBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
