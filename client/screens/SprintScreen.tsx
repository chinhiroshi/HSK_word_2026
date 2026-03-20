import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Word } from "@/types";
import { getWords, initializeData } from "@/lib/storage";
import { useSprint } from "@/contexts/SprintContext";
import { SprintSessionType } from "@/types";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;

const GRID_COLS = 4;
const CELL_GAP = 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - CELL_GAP * (GRID_COLS - 1)) / GRID_COLS;

function getCellPosition(index: number): { row: number; col: number } {
  const row = Math.floor(index / GRID_COLS);
  const posInRow = index % GRID_COLS;
  const col = row % 2 === 0 ? posInRow : GRID_COLS - 1 - posInRow;
  return { row, col };
}

function buildGrid(totalCells: number): number[] {
  const rows: number[][] = [];
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / GRID_COLS);
    if (!rows[row]) rows[row] = new Array(GRID_COLS).fill(-1);
    const { col } = getCellPosition(i);
    rows[row][col] = i;
  }
  return rows.flat();
}

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function getDaysElapsed(setupDate: string | null): number {
  if (!setupDate) return 0;
  const start = new Date(setupDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

interface CellProps {
  index: number;
  sessionType: SprintSessionType;
  isCurrent: boolean;
  isCompleted: boolean;
  isSpecialStamp: boolean;
  completedDate?: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function Cell({ index, sessionType, isCurrent, isCompleted, isSpecialStamp, completedDate, onPress, theme }: CellProps) {
  const isFlag = index === 0;

  let bgColor = theme.backgroundDefault;
  let borderColor = theme.border;
  let iconName: keyof typeof Feather.glyphMap = "user";
  let iconColor = theme.border;

  if (isFlag) {
    bgColor = Colors.light.success;
    borderColor = Colors.light.success;
    iconName = "flag";
    iconColor = "#fff";
  } else if (isSpecialStamp) {
    bgColor = Colors.light.alert;
    borderColor = Colors.light.alert;
    iconName = "star";
    iconColor = "#fff";
  } else if (isCompleted) {
    bgColor = theme.primary + "25";
    borderColor = theme.primary;
    iconName = "check-circle";
    iconColor = theme.primary;
  } else if (isCurrent) {
    bgColor = Colors.light.secondary;
    borderColor = Colors.light.secondary;
    iconName = "play-circle";
    iconColor = "#fff";
  } else if (sessionType === "test") {
    bgColor = "#EDE9FE";
    borderColor = "#7C3AED";
    iconName = "award";
    iconColor = "#7C3AED";
  } else if (sessionType === "review") {
    bgColor = theme.backgroundSecondary;
    borderColor = theme.border;
    iconName = "refresh-cw";
    iconColor = theme.textSecondary;
  } else {
    iconName = "book-open";
    iconColor = theme.textSecondary;
  }

  const cellNumber = index > 0 ? index : null;
  const textColor = (isCompleted || isSpecialStamp) ? theme.primary : isCurrent ? "#fff" : theme.textSecondary;
  const specialTextColor = isSpecialStamp ? "#fff" : textColor;

  return (
    <Pressable
      testID={`cell-${index}`}
      onPress={onPress}
      style={[
        styles.cell,
        {
          backgroundColor: bgColor,
          borderColor,
          width: CELL_SIZE,
          height: CELL_SIZE,
        },
      ]}
    >
      <Feather name={iconName} size={CELL_SIZE * 0.32} color={iconColor} />
      {cellNumber !== null ? (
        <ThemedText
          style={[
            styles.cellNumber,
            {
              color: isCurrent ? "#fff" : specialTextColor,
              fontSize: CELL_SIZE * 0.16,
            },
          ]}
        >
          {cellNumber}
        </ThemedText>
      ) : null}
      {isCompleted && completedDate ? (
        <ThemedText
          style={[
            styles.cellDate,
            { color: theme.primary, fontSize: CELL_SIZE * 0.14 },
          ]}
        >
          {formatShortDate(completedDate)}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function getSessionTypeLabel(type: SprintSessionType): string {
  switch (type) {
    case "study": return "学習";
    case "review": return "復習";
    case "test": return "テスト";
    default: return "";
  }
}

function getSessionTypeColor(type: SprintSessionType, theme: ReturnType<typeof useTheme>["theme"]): string {
  switch (type) {
    case "study": return theme.primary;
    case "review": return Colors.light.secondary;
    case "test": return "#7C3AED";
    default: return theme.textSecondary;
  }
}

interface ProgressChartProps {
  setupDate: string | null;
  completedCount: number;
  totalCells: number;
  theme: ReturnType<typeof useTheme>["theme"];
}

function ProgressChart({ setupDate, completedCount, totalCells, theme }: ProgressChartProps) {
  const maxCells = totalCells - 1;
  const daysElapsed = getDaysElapsed(setupDate);
  const expected = Math.min(daysElapsed, maxCells);
  const actual = Math.min(completedCount, maxCells);

  const diff = actual - expected;
  const isAhead = diff >= 0;
  const diffLabel = diff === 0
    ? "予定通り"
    : isAhead
    ? `${diff}マス先行`
    : `${Math.abs(diff)}マス遅れ`;
  const diffColor = diff === 0 ? theme.textSecondary : isAhead ? Colors.light.success : Colors.light.alert;

  const expectedRatio = maxCells > 0 ? expected / maxCells : 0;
  const actualRatio = maxCells > 0 ? actual / maxCells : 0;

  return (
    <View style={[styles.progressChart, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      <View style={styles.progressChartHeader}>
        <ThemedText style={[styles.progressChartTitle, { color: theme.text }]}>
          スプリント進捗
        </ThemedText>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + "18" }]}>
          <Feather
            name={diff === 0 ? "minus" : isAhead ? "trending-up" : "trending-down"}
            size={12}
            color={diffColor}
          />
          <ThemedText style={[styles.diffLabel, { color: diffColor }]}>
            {diffLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>予定</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.barFill,
              { width: `${expectedRatio * 100}%`, backgroundColor: theme.textSecondary + "60" },
            ]}
          />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.textSecondary }]}>
          {expected}/{maxCells}
        </ThemedText>
      </View>

      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>実績</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.barFill,
              { width: `${actualRatio * 100}%`, backgroundColor: isAhead ? Colors.light.success : Colors.light.alert },
            ]}
          />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.text }]}>
          {actual}/{maxCells}
        </ThemedText>
      </View>
    </View>
  );
}

export default function SprintScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { sprintData, loading, loadSprint, totalCells, getSessionType, canSkipCurrentSession, skipSession } = useSprint();

  const [words, setWords] = useState<Word[]>([]);
  const [canSkip, setCanSkip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await loadSprint();
        await initializeData();
        const allWords = await getWords();
        setWords(allWords);
      };
      load();
    }, [loadSprint])
  );

  useEffect(() => {
    if (sprintData && words.length > 0) {
      setCanSkip(canSkipCurrentSession(words));
    }
  }, [sprintData, words, canSkipCurrentSession]);

  const handleCellPress = (index: number) => {
    if (!sprintData || !sprintData.hasSetup) {
      if (index === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("SprintSetup");
      }
      return;
    }

    if (index === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sessionType = getSessionType(index);
    if (sessionType === "test") {
      navigation.navigate("SprintTest");
    } else if (sessionType === "review") {
      navigation.navigate("SprintStudySession", { mode: "review" });
    } else {
      navigation.navigate("SprintStudySession", { mode: "study" });
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skipSession();
    const allWords = await getWords();
    setWords(allWords);
  };

  const gridIndices = buildGrid(totalCells);
  const currentPosition = sprintData?.currentPosition ?? 0;
  const isSetup = sprintData?.hasSetup ?? false;
  const streakCount = sprintData?.streakCount ?? 0;
  const specialStamps = sprintData?.specialStamps ?? [];
  const completedDates = sprintData?.completedDates ?? {};
  const completedCount = Object.keys(completedDates).length;

  const currentSessionType = isSetup ? getSessionType(currentPosition) : "flag";

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centered, { paddingTop: headerHeight + Spacing.xl }]}>
          <ThemedText style={{ color: theme.textSecondary }}>読み込み中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

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
      >
        <View style={styles.topBar}>
          <View style={styles.streakBadge}>
            <Feather name="zap" size={16} color={Colors.light.secondary} />
            <ThemedText style={[styles.streakText, { color: Colors.light.secondary }]}>
              {streakCount}日連続
            </ThemedText>
          </View>

          {isSetup && currentSessionType !== "flag" ? (
            <View
              style={[
                styles.todayBadge,
                { backgroundColor: getSessionTypeColor(currentSessionType, theme) + "18" },
              ]}
            >
              <ThemedText
                style={[
                  styles.todayText,
                  { color: getSessionTypeColor(currentSessionType, theme) },
                ]}
              >
                今日: {getSessionTypeLabel(currentSessionType)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {isSetup ? (
          <ProgressChart
            setupDate={sprintData?.setupDate ?? null}
            completedCount={completedCount}
            totalCells={totalCells}
            theme={theme}
          />
        ) : null}

        {!isSetup ? (
          <View
            style={[
              styles.setupPrompt,
              { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "30" },
            ]}
          >
            <Feather name="flag" size={20} color={Colors.light.success} />
            <ThemedText style={[styles.setupPromptText, { color: theme.text }]}>
              旗のマスをタップして学習を始めましょう
            </ThemedText>
          </View>
        ) : canSkip ? (
          <Pressable
            testID="button-skip-session"
            onPress={handleSkip}
            style={[
              styles.skipBanner,
              { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" },
            ]}
          >
            <Feather name="check-circle" size={18} color={theme.primary} />
            <ThemedText style={[styles.skipText, { color: theme.primary }]}>
              今日の単語は学習済みです。スタンプを進める
            </ThemedText>
            <Feather name="chevron-right" size={18} color={theme.primary} />
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          {gridIndices.map((cellIndex, gridPos) => {
            if (cellIndex === -1) {
              return <View key={`empty-${gridPos}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: "transparent", borderWidth: 0 }]} />;
            }
            const sessionType = getSessionType(cellIndex);
            const isCurrent = isSetup && cellIndex === currentPosition;
            const isCompleted = isSetup ? cellIndex < currentPosition || (completedDates[cellIndex] != null) : false;
            const isSpecialStamp = specialStamps.includes(cellIndex);

            return (
              <Cell
                key={cellIndex}
                index={cellIndex}
                sessionType={sessionType}
                isCurrent={isCurrent}
                isCompleted={isCompleted && !isCurrent}
                isSpecialStamp={isSpecialStamp}
                completedDate={completedDates[cellIndex]}
                onPress={() => handleCellPress(cellIndex)}
                theme={theme}
              />
            );
          })}
        </View>

        <View style={styles.legend}>
          <ThemedText style={[styles.legendTitle, { color: theme.textSecondary }]}>凡例</ThemedText>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.secondary }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>現在地</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>完了済み</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>テスト</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.alert }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>特別スタンプ</ThemedText>
            </View>
          </View>
        </View>

        {isSetup ? (
          <Pressable
            testID="button-reset-sprint"
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("SprintSetup");
            }}
            style={[styles.resetLink]}
          >
            <ThemedText style={[styles.resetLinkText, { color: theme.textSecondary }]}>
              設定を変更する
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.light.secondary + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  todayBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  todayText: { fontSize: 13, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  progressChart: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  progressChartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  progressChartTitle: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  diffLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    width: 28,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  barCount: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    width: 36,
    textAlign: "right",
  },
  setupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  setupPromptText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  skipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
    marginBottom: Spacing.xl,
  },
  cell: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  cellNumber: {
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 16,
  },
  cellDate: {
    fontFamily: "Nunito_400Regular",
    lineHeight: 13,
  },
  legend: { marginBottom: Spacing.xl },
  legendTitle: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItems: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  resetLink: { alignItems: "center", paddingVertical: Spacing.sm },
  resetLinkText: { fontSize: 13, fontFamily: "Nunito_400Regular" },
});
