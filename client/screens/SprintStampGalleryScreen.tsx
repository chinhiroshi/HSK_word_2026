import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint } from "@/contexts/SprintContext";
import { getSessionType } from "@/contexts/SprintContext";

const NUM_COLS = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const STAMP_SIZE = Math.floor((SCREEN_WIDTH - Spacing.lg * 2 - (NUM_COLS - 1) * Spacing.sm) / NUM_COLS);

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export default function SprintStampGalleryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { sprintData, totalCells, getSessionType: boundGetSessionType } = useSprint();

  const wordsPerDay = sprintData?.wordsPerDay ?? 10;
  const completedDates = sprintData?.completedDates ?? {};
  const specialStamps = sprintData?.specialStamps ?? [];
  const isSetup = sprintData?.hasSetup ?? false;

  // Cells 1..totalCells-1 (skip flag cell at 0)
  const cells = useMemo(() => {
    const result = [];
    for (let i = 1; i < totalCells; i++) {
      const sessionType = getSessionType(i, wordsPerDay);
      const completedDate = completedDates[i] ?? null;
      const isSpecial = specialStamps.includes(i);
      result.push({ index: i, sessionType, completedDate, isSpecial });
    }
    return result;
  }, [totalCells, wordsPerDay, completedDates, specialStamps]);

  const completedCount = cells.filter((c) => c.completedDate !== null).length;
  const specialCount = cells.filter((c) => c.isSpecial).length;
  const studyCount = cells.filter((c) => c.sessionType === "study" && c.completedDate).length;
  const testCount = cells.filter((c) => c.sessionType === "test" && c.completedDate).length;

  // Group into rows of NUM_COLS
  const rows: (typeof cells[0] | null)[][] = [];
  for (let i = 0; i < cells.length; i += NUM_COLS) {
    const row = cells.slice(i, i + NUM_COLS);
    while (row.length < NUM_COLS) row.push(null);
    rows.push(row as any);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
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
                {
                  backgroundColor: theme.primary,
                  width: cells.length > 0 ? `${(completedCount / cells.length) * 100}%` : "0%",
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {cells.length > 0 ? Math.round((completedCount / cells.length) * 100) : 0}% 達成
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

        {/* Stamp Grid */}
        {!isSetup ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="map" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              スプリントを開始すると{"\n"}スタンプが集まります
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map((cell, colIdx) => {
                  if (!cell) {
                    return <View key={colIdx} style={[styles.stamp, styles.stampPlaceholder]} />;
                  }
                  const isCompleted = cell.completedDate !== null;
                  const isTest = cell.sessionType === "test";
                  const isSpecial = cell.isSpecial;

                  const baseColor = isSpecial
                    ? Colors.light.alert
                    : isTest
                    ? "#7C3AED"
                    : theme.primary;

                  return (
                    <View key={colIdx} style={styles.stampWrapper}>
                      <View
                        style={[
                          styles.stamp,
                          {
                            backgroundColor: isCompleted ? baseColor : "transparent",
                            borderColor: isCompleted ? baseColor : theme.border,
                            borderWidth: isCompleted ? 0 : 1.5,
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <>
                            {isSpecial ? (
                              <Feather name="star" size={STAMP_SIZE * 0.38} color="#FFFFFF" />
                            ) : isTest ? (
                              <Feather name="check-circle" size={STAMP_SIZE * 0.38} color="#FFFFFF" />
                            ) : (
                              <Feather name="book-open" size={STAMP_SIZE * 0.34} color="#FFFFFF" />
                            )}
                          </>
                        ) : (
                          <ThemedText style={[styles.stampNumber, { color: theme.border }]}>
                            {cell.index}
                          </ThemedText>
                        )}
                      </View>
                      {isCompleted && cell.completedDate ? (
                        <ThemedText style={[styles.stampDate, { color: theme.textSecondary }]}>
                          {formatDate(cell.completedDate)}
                        </ThemedText>
                      ) : (
                        <ThemedText style={[styles.stampDate, { color: theme.border }]}>
                          {cell.index}
                        </ThemedText>
                      )}
                    </View>
                  );
                })}
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
  grid: { gap: Spacing.sm },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  stampWrapper: {
    width: STAMP_SIZE,
    alignItems: "center",
    gap: 3,
  },
  stamp: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    borderRadius: STAMP_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  stampPlaceholder: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
  },
  stampNumber: {
    fontSize: STAMP_SIZE * 0.28,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  stampDate: {
    fontSize: 9,
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
});
