import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint, getSessionType } from "@/contexts/SprintContext";

// Panda stamp images (12 variants + 1 special)
const PANDA_STAMPS: Record<number, any> = {
  1: require("../../assets/images/panda-stamp-1.png"),
  2: require("../../assets/images/panda-stamp-2.png"),
  3: require("../../assets/images/panda-stamp-3.png"),
  4: require("../../assets/images/panda-stamp-4.png"),
  5: require("../../assets/images/panda-stamp-5.png"),
  6: require("../../assets/images/panda-stamp-6.png"),
  7: require("../../assets/images/panda-stamp-7.png"),
  8: require("../../assets/images/panda-stamp-8.png"),
  9: require("../../assets/images/panda-stamp-9.png"),
  10: require("../../assets/images/panda-stamp-10.png"),
  11: require("../../assets/images/panda-stamp-11.png"),
  12: require("../../assets/images/panda-stamp-12.png"),
};
const PANDA_SPECIAL = require("../../assets/images/panda-stamp-special.png");

// 3 stamps per row with arrows between them
const NUM_COLS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const ARROW_WIDTH = 20;
const ENTRY_WIDTH = Math.floor((CONTENT_WIDTH - (NUM_COLS - 1) * ARROW_WIDTH) / NUM_COLS);
const CIRCLE_SIZE = Math.min(52, Math.floor(ENTRY_WIDTH * 0.48));

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function getPandaImage(cellIndex: number, isSpecial: boolean) {
  if (isSpecial) return PANDA_SPECIAL;
  const variant = ((cellIndex - 1) % 12) + 1;
  return PANDA_STAMPS[variant];
}

interface StampCell {
  index: number;
  sessionType: "flag" | "study" | "test";
  completedDate: string | null;
  isSpecial: boolean;
}

interface StampEntryProps {
  cell: StampCell;
  theme: any;
}

function StampEntry({ cell, theme }: StampEntryProps) {
  const isCompleted = cell.completedDate !== null;
  const isTest = cell.sessionType === "test";
  const isSpecial = cell.isSpecial;

  const accentColor = isSpecial
    ? Colors.light.alert
    : isTest
    ? "#7C3AED"
    : theme.primary;

  return (
    <View style={[entryStyles.root, { width: ENTRY_WIDTH }]}>
      {/* Circle */}
      <View
        style={[
          entryStyles.circle,
          {
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderRadius: CIRCLE_SIZE / 2,
            borderColor: isCompleted ? accentColor : theme.border,
            borderWidth: isCompleted ? 2 : 1.5,
            backgroundColor: isCompleted ? theme.backgroundDefault : (theme.backgroundSubtle ?? "#F3F4F6"),
          },
        ]}
      >
        {isCompleted ? (
          <Image
            source={getPandaImage(cell.index, isSpecial)}
            style={{
              width: CIRCLE_SIZE - 4,
              height: CIRCLE_SIZE - 4,
              borderRadius: (CIRCLE_SIZE - 4) / 2,
              position: "absolute",
            }}
            resizeMode="cover"
          />
        ) : (
          <ThemedText style={[entryStyles.emptyNum, { color: theme.border }]}>
            {cell.index}
          </ThemedText>
        )}
      </View>

      {/* Number + Date beside circle */}
      <View style={entryStyles.info}>
        <ThemedText
          style={[
            entryStyles.numText,
            { color: isCompleted ? accentColor : theme.border },
          ]}
        >
          {cell.index}
        </ThemedText>
        <ThemedText style={[entryStyles.dateText, { color: isCompleted ? theme.textSecondary : theme.border }]}>
          {isCompleted && cell.completedDate ? formatDate(cell.completedDate) : "--"}
        </ThemedText>
      </View>
    </View>
  );
}

const entryStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  emptyNum: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  info: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 1,
  },
  numText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 16,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    lineHeight: 14,
  },
});

export default function SprintStampGalleryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { sprintData, totalCells } = useSprint();

  const wordsPerDay = sprintData?.wordsPerDay ?? 10;
  const completedDates = sprintData?.completedDates ?? {};
  const specialStamps = sprintData?.specialStamps ?? [];
  const isSetup = sprintData?.hasSetup ?? false;

  const cells = useMemo((): StampCell[] => {
    const result: StampCell[] = [];
    for (let i = 1; i < totalCells; i++) {
      const sessionType = getSessionType(i, wordsPerDay);
      const completedDate = completedDates[i] ?? null;
      const isSpecial = specialStamps.includes(i);
      result.push({ index: i, sessionType, completedDate, isSpecial });
    }
    return result;
  }, [totalCells, wordsPerDay, completedDates, specialStamps]);

  // Group into rows of NUM_COLS
  const rows: (StampCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += NUM_COLS) {
    const row = cells.slice(i, i + NUM_COLS);
    while (row.length < NUM_COLS) row.push(null);
    rows.push(row);
  }

  const completedCount = cells.filter((c) => c.completedDate !== null).length;
  const specialCount = cells.filter((c) => c.isSpecial).length;
  const testCount = cells.filter(
    (c) => c.sessionType === "test" && c.completedDate
  ).length;
  const progressPercent =
    cells.length > 0 ? Math.round((completedCount / cells.length) * 100) : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
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
                取得済み
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: "#7C3AED" }]}>
                {testCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                テスト合格
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: Colors.light.alert }]}>
                {specialCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                特別スタンプ
              </ThemedText>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.primary, width: `${progressPercent}%` },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {progressPercent}% 達成
          </ThemedText>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>学習</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>テスト</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.alert }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>特別</ThemedText>
          </View>
        </View>

        {/* Stamp List with Arrows */}
        {!isSetup ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <Feather name="map" size={40} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              スプリントを開始すると{"\n"}パンダが集まります
            </ThemedText>
          </View>
        ) : (
          <View style={styles.stampList}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.stampRow}>
                {row.map((cell, colIdx) => (
                  <React.Fragment key={colIdx}>
                    {cell ? (
                      <StampEntry cell={cell} theme={theme} />
                    ) : (
                      <View style={{ width: ENTRY_WIDTH }} />
                    )}
                    {/* Arrow between entries (not after the last one in a row) */}
                    {colIdx < NUM_COLS - 1 ? (
                      <ThemedText style={[styles.arrow, { color: theme.border }]}>→</ThemedText>
                    ) : null}
                  </React.Fragment>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  summaryValue: { fontSize: 28, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 2 },
  summaryDivider: { width: 1, height: 40 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
  legend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  stampList: { gap: Spacing.md },
  stampRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrow: {
    width: ARROW_WIDTH,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
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
});
