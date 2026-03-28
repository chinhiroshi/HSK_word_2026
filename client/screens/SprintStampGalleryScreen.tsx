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

// Must match SprintScreen's NUM_GRID_COLS = 5
const NUM_GRID_COLS = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = Spacing.lg * 2;
const GAP = Spacing.sm;
const STAMP_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING - (NUM_GRID_COLS - 1) * GAP) / NUM_GRID_COLS
);

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function getPandaImage(cellIndex: number, isSpecial: boolean) {
  if (isSpecial) return PANDA_SPECIAL;
  const variant = ((cellIndex - 1) % 12) + 1;
  return PANDA_STAMPS[variant];
}

// Mirrors buildCellPositions from SprintScreen.tsx (must stay in sync)
function buildCellPositions(totalCells: number): [number, number][] {
  const positions: [number, number][] = [];
  let segIdx = 0;
  while (positions.length < totalCells) {
    const gridRow = segIdx * 2;
    const isRight = segIdx % 2 === 0;
    const remaining = totalCells - positions.length;
    const count = Math.min(5, remaining);
    for (let i = 0; i < count; i++) {
      positions.push([gridRow, isRight ? i : 4 - i]);
    }
    if (positions.length < totalCells) {
      positions.push([gridRow + 1, isRight ? 4 : 0]);
    }
    segIdx++;
  }
  return positions;
}

export default function SprintStampGalleryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { sprintData, totalCells } = useSprint();

  const wordsPerDay = sprintData?.wordsPerDay ?? 10;
  const completedDates = sprintData?.completedDates ?? {};
  const specialStamps = sprintData?.specialStamps ?? [];
  const isSetup = sprintData?.hasSetup ?? false;

  // Build positional grid matching sprint map layout
  const { grid } = useMemo(() => {
    const positions = buildCellPositions(totalCells);
    const maxRow = positions.reduce((max, [r]) => Math.max(max, r), 0);
    const rows = maxRow + 1;
    const g: (number | null)[][] = Array.from({ length: rows }, () =>
      Array(NUM_GRID_COLS).fill(null)
    );
    positions.forEach(([r, c], idx) => {
      g[r][c] = idx;
    });
    return { grid: g };
  }, [totalCells]);

  const cells = useMemo(() => {
    const result: Record<number, { sessionType: "flag" | "study" | "test"; completedDate: string | null; isSpecial: boolean }> = {};
    for (let i = 0; i < totalCells; i++) {
      const sessionType = getSessionType(i, wordsPerDay);
      const completedDate = completedDates[i] ?? null;
      const isSpecial = specialStamps.includes(i);
      result[i] = { sessionType, completedDate, isSpecial };
    }
    return result;
  }, [totalCells, wordsPerDay, completedDates, specialStamps]);

  const completedCount = Object.values(cells).filter(
    (c) => c.completedDate !== null && c.sessionType !== "flag"
  ).length;
  const specialCount = Object.values(cells).filter((c) => c.isSpecial).length;
  const studyCount = Object.values(cells).filter(
    (c) => c.sessionType === "study" && c.completedDate
  ).length;
  const testCount = Object.values(cells).filter(
    (c) => c.sessionType === "test" && c.completedDate
  ).length;
  const nonFlagTotal = totalCells - 1;
  const progressPercent =
    nonFlagTotal > 0 ? Math.round((completedCount / nonFlagTotal) * 100) : 0;

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
                {
                  backgroundColor: theme.primary,
                  width: `${progressPercent}%`,
                },
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
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              学習
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              テスト
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.alert }]} />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              特別パンダ
            </ThemedText>
          </View>
        </View>

        {/* Stamp Grid — same layout as sprint map */}
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
          <View style={[styles.grid, { gap: GAP }]}>
            {grid.map((row, rowIdx) => (
              <View key={rowIdx} style={[styles.gridRow, { gap: GAP }]}>
                {row.map((cellIdx, colIdx) => {
                  // Empty grid position
                  if (cellIdx === null) {
                    return (
                      <View
                        key={colIdx}
                        style={{ width: STAMP_SIZE, height: STAMP_SIZE }}
                      />
                    );
                  }

                  const cell = cells[cellIdx];
                  if (!cell) return <View key={colIdx} style={{ width: STAMP_SIZE, height: STAMP_SIZE }} />;

                  const { sessionType, completedDate, isSpecial } = cell;
                  const isCompleted = completedDate !== null;

                  // Flag cell
                  if (sessionType === "flag") {
                    return (
                      <View key={colIdx} style={[styles.stampWrapper, { width: STAMP_SIZE }]}>
                        <View
                          style={[
                            styles.stampCircle,
                            {
                              width: STAMP_SIZE,
                              height: STAMP_SIZE,
                              borderRadius: STAMP_SIZE / 2,
                              backgroundColor: Colors.light.success,
                              borderColor: Colors.light.success,
                              borderWidth: 2,
                            },
                          ]}
                        >
                          <Feather name="flag" size={STAMP_SIZE * 0.38} color="#fff" />
                        </View>
                        <ThemedText style={[styles.stampDate, { color: "transparent" }]}>--</ThemedText>
                      </View>
                    );
                  }

                  const borderColor = isSpecial
                    ? Colors.light.alert
                    : sessionType === "test"
                    ? "#7C3AED"
                    : theme.primary;

                  return (
                    <View key={colIdx} style={[styles.stampWrapper, { width: STAMP_SIZE }]}>
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
                            source={getPandaImage(cellIdx, isSpecial)}
                            style={[
                              styles.pandaImage,
                              {
                                width: STAMP_SIZE - 6,
                                height: STAMP_SIZE - 6,
                                borderRadius: (STAMP_SIZE - 6) / 2,
                              },
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <ThemedText
                            style={[styles.stampNumber, { color: theme.border, fontSize: STAMP_SIZE * 0.26 }]}
                          >
                            {cellIdx}
                          </ThemedText>
                        )}
                      </View>

                      {isCompleted && completedDate ? (
                        <ThemedText style={[styles.stampDate, { color: theme.textSecondary }]}>
                          {formatDate(completedDate)}
                        </ThemedText>
                      ) : (
                        <ThemedText style={[styles.stampDate, { color: "transparent" }]}>
                          --
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
  grid: {},
  gridRow: {
    flexDirection: "row",
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
});
