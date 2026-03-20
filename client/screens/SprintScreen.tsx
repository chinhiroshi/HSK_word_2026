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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

interface CellProps {
  index: number;
  sessionType: SprintSessionType;
  isCurrent: boolean;
  isCompleted: boolean;
  isSpecialStamp: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function Cell({ index, sessionType, isCurrent, isCompleted, isSpecialStamp, onPress, theme }: CellProps) {
  const isFuture = !isCurrent && !isCompleted;
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
    iconColor = isFuture ? theme.border : theme.textSecondary;
  } else {
    iconName = "user";
    iconColor = isFuture ? theme.border : theme.textSecondary;
  }

  const cellNumber = index > 0 ? index : null;

  return (
    <Pressable
      testID={`cell-${index}`}
      onPress={onPress}
      style={[
        styles.cell,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: 1,
          width: CELL_SIZE,
          height: CELL_SIZE,
        },
      ]}
    >
      <Feather name={iconName} size={CELL_SIZE * 0.38} color={iconColor} />
      {cellNumber !== null ? (
        <ThemedText
          style={[
            styles.cellNumber,
            {
              color: isCompleted || isCurrent || isSpecialStamp
                ? isFlag ? "#fff" : isCurrent ? "#fff" : isSpecialStamp ? "#fff" : theme.textSecondary
                : theme.textSecondary,
              fontSize: CELL_SIZE * 0.18,
            },
          ]}
        >
          {cellNumber}
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

export default function SprintScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
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

  const currentSessionType = isSetup
    ? getSessionType(currentPosition)
    : "flag";

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
            const isCompleted = isSetup ? cellIndex < currentPosition : false;
            const isSpecialStamp = specialStamps.includes(cellIndex);

            return (
              <Cell
                key={cellIndex}
                index={cellIndex}
                sessionType={sessionType}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
                isSpecialStamp={isSpecialStamp}
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
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>学習済み</ThemedText>
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
    gap: 2,
  },
  cellNumber: {
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    lineHeight: 16,
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
