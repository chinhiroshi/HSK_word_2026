import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
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
import { PlantIcon, FlowerIcon, MonsterIcon, TreeIcon, CloudIcon, MountainIcon } from "@/components/SprintCellIcons";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;
type SessionMode = "study" | "text-only" | "audio-only" | "review";
type CellDir = "right" | "left" | "down" | "up" | null;

// Grid: 5 columns, 9 rows
// Col 0: cells 0-8 going DOWN
// Col 1: cell 9 (single connector, same row as cell 8)
// Col 2: cells 10-18 going UP
// Col 3: cell 19 (single connector, same row as cell 18 = row 0)
// Col 4: cells 20-28 going DOWN
const NUM_GRID_COLS = 5;
const NUM_GRID_ROWS = 9;
const SCREEN_WIDTH = Dimensions.get("window").width;
const ROW_WIDTH = SCREEN_WIDTH - Spacing.sm * 2;
const CELL_SIZE = Math.floor(ROW_WIDTH / NUM_GRID_COLS);

const CELL_POSITIONS: [number, number][] = [
  // Col 0 — going down (cells 0–8)
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
  // Col 1 — single connector (cell 9)
  [8, 1],
  // Col 2 — going up (cells 10–18)
  [8, 2], [7, 2], [6, 2], [5, 2], [4, 2], [3, 2], [2, 2], [1, 2], [0, 2],
  // Col 3 — single connector (cell 19)
  [0, 3],
  // Col 4 — going down (cells 20–28)
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
];

const pathGrid: number[][] = Array.from({ length: NUM_GRID_ROWS }, () =>
  Array(NUM_GRID_COLS).fill(-1)
);
CELL_POSITIONS.forEach(([row, col], i) => {
  pathGrid[row][col] = i;
});

function getCellArrowDir(index: number): CellDir {
  if (index >= CELL_POSITIONS.length - 1) return null;
  const [r1, c1] = CELL_POSITIONS[index];
  const [r2, c2] = CELL_POSITIONS[index + 1];
  if (r2 > r1) return "down";
  if (r2 < r1) return "up";
  if (c2 > c1) return "right";
  if (c2 < c1) return "left";
  return null;
}

const DECO_TYPES = ["tree", "cloud", "mountain"] as const;
type DecoType = (typeof DECO_TYPES)[number];
function getDecoType(row: number, col: number): DecoType {
  // Mostly trees in empty columns (col 1 and col 3), occasional variety
  const seed = row * 13 + col * 7;
  if (seed % 5 === 3) return "cloud";
  if (seed % 9 === 7) return "mountain";
  return "tree";
}

function getDaysElapsed(setupDate: string | null): number {
  if (!setupDate) return 0;
  const start = new Date(setupDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}


interface CellProps {
  index: number;
  sessionType: SprintSessionType;
  isCurrent: boolean;
  isCompleted: boolean;
  isSpecialStamp: boolean;
  completedDate?: string;
  direction: CellDir;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function Cell({ index, sessionType, isCurrent, isCompleted, isSpecialStamp, completedDate, direction, onPress, theme }: CellProps) {
  const isFlag = index === 0;

  let bgColor = theme.backgroundDefault;
  let borderColor = theme.border;
  let iconColor = theme.textSecondary + "80";
  let textColor: string = theme.textSecondary;
  let featherIcon: keyof typeof Feather.glyphMap | null = null;

  if (isFlag) {
    bgColor = Colors.light.success;
    borderColor = Colors.light.success;
    featherIcon = "flag";
    iconColor = "#fff";
    textColor = "#fff";
  } else if (isSpecialStamp) {
    bgColor = Colors.light.alert;
    borderColor = Colors.light.alert;
    featherIcon = "star";
    iconColor = "#fff";
    textColor = "#fff";
  } else if (isCompleted) {
    bgColor = theme.primary + "20";
    borderColor = theme.primary + "60";
    featherIcon = "check-circle";
    iconColor = theme.primary;
    textColor = theme.primary;
  } else if (isCurrent) {
    bgColor = Colors.light.secondary;
    borderColor = Colors.light.secondary;
    featherIcon = "zap";
    iconColor = "#fff";
    textColor = "#fff";
  } else if (sessionType === "test") {
    bgColor = "#EDE9FE";
    borderColor = "#C4B5FD";
    textColor = "#7C3AED";
  } else if (sessionType === "review") {
    bgColor = Colors.light.secondary + "18";
    borderColor = Colors.light.secondary + "50";
    textColor = Colors.light.secondary;
  } else {
    bgColor = theme.primary + "12";
    borderColor = theme.primary + "40";
    textColor = theme.primary;
  }

  const iconSize = CELL_SIZE * 0.38;

  const renderIcon = () => {
    if (featherIcon) {
      return <Feather name={featherIcon} size={CELL_SIZE * 0.32} color={iconColor} />;
    }
    if (sessionType === "test") {
      return <MonsterIcon size={iconSize} color="#7C3AED" />;
    }
    if (sessionType === "review") {
      return <FlowerIcon size={iconSize} color={Colors.light.secondary} />;
    }
    return <PlantIcon size={iconSize} color={theme.primary} />;
  };

  return (
    <Pressable
      testID={`cell-${index}`}
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: bgColor, borderColor, width: CELL_SIZE, height: CELL_SIZE },
      ]}
    >
      {renderIcon()}
      {index > 0 ? (
        <ThemedText style={[styles.cellNumber, { color: textColor, fontSize: CELL_SIZE * 0.16 }]}>
          {index}
        </ThemedText>
      ) : null}
      {isCompleted && completedDate ? (
        <ThemedText style={[styles.cellDate, { color: theme.primary + "CC", fontSize: CELL_SIZE * 0.14 }]}>
          {formatShortDate(completedDate)}
        </ThemedText>
      ) : null}
      {direction ? (
        <View
          style={[
            styles.cellArrow,
            direction === "right"
              ? { right: 1, top: Math.floor(CELL_SIZE / 2) - 6 }
              : direction === "left"
              ? { left: 1, top: Math.floor(CELL_SIZE / 2) - 6 }
              : direction === "down"
              ? { bottom: 1, left: Math.floor(CELL_SIZE / 2) - 6 }
              : { top: 1, left: Math.floor(CELL_SIZE / 2) - 6 },
          ]}
        >
          <Feather
            name={
              direction === "right"
                ? "arrow-right"
                : direction === "left"
                ? "arrow-left"
                : direction === "down"
                ? "arrow-down"
                : "arrow-up"
            }
            size={10}
            color={isCurrent ? "rgba(255,255,255,0.65)" : isCompleted ? theme.primary + "55" : theme.textSecondary + "35"}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function DecoCell({ row, col, theme }: { row: number; col: number; theme: ReturnType<typeof useTheme>["theme"] }) {
  const decoType = getDecoType(row, col);
  const iconSize = CELL_SIZE * 0.6;
  return (
    <View style={[styles.decoCell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: theme.backgroundSecondary + "50" }]}>
      {decoType === "tree" ? (
        <TreeIcon size={iconSize} />
      ) : decoType === "cloud" ? (
        <CloudIcon size={iconSize} />
      ) : (
        <MountainIcon size={iconSize} />
      )}
    </View>
  );
}

interface ProgressChartProps {
  setupDate: string | null;
  completedCount: number;
  totalCells: number;
  theme: ReturnType<typeof useTheme>["theme"];
}

function ProgressChart({ setupDate, completedCount, totalCells, theme }: ProgressChartProps) {
  const maxCells = totalCells - 1;
  const expected = Math.min(getDaysElapsed(setupDate), maxCells);
  const actual = Math.min(completedCount, maxCells);
  const diff = actual - expected;
  const diffColor = diff === 0 ? theme.textSecondary : diff > 0 ? Colors.light.success : Colors.light.alert;
  const diffLabel = diff === 0 ? "予定通り" : diff > 0 ? `${diff}マス先行` : `${Math.abs(diff)}マス遅れ`;

  return (
    <View style={[styles.progressChart, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      <View style={styles.progressChartHeader}>
        <ThemedText style={[styles.progressChartTitle, { color: theme.text }]}>スプリント進捗</ThemedText>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + "18" }]}>
          <Feather name={diff === 0 ? "minus" : diff > 0 ? "trending-up" : "trending-down"} size={11} color={diffColor} />
          <ThemedText style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>予定</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.barFill, { width: `${(expected / maxCells) * 100}%`, backgroundColor: theme.textSecondary + "50" }]} />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.textSecondary }]}>{expected}/{maxCells}</ThemedText>
      </View>
      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>実績</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.barFill, { width: `${(actual / maxCells) * 100}%`, backgroundColor: diff >= 0 ? Colors.light.success : Colors.light.alert }]} />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.text }]}>{actual}/{maxCells}</ThemedText>
      </View>
    </View>
  );
}

interface SessionModalProps {
  visible: boolean;
  cellIndex: number;
  phaseProgress: { text: boolean; audio: boolean };
  onClose: () => void;
  onSelect: (mode: SessionMode) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function SessionModal({ visible, cellIndex, phaseProgress, onClose, onSelect, theme }: SessionModalProps) {
  const bothDone = phaseProgress.text && phaseProgress.audio;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
            学習モードを選択
          </ThemedText>
          {bothDone ? (
            <ThemedText style={[styles.modalSub, { color: Colors.light.success }]}>
              マス {cellIndex} — 両方完了済み！スタンプ獲得
            </ThemedText>
          ) : (phaseProgress.text || phaseProgress.audio) ? (
            <View style={[styles.modalProgressHint, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
              <Feather name="info" size={13} color={Colors.light.alert} />
              <ThemedText style={[styles.modalProgressHintText, { color: Colors.light.alert }]}>
                {phaseProgress.text ? "文字学習済み — 音声学習でスタンプ獲得" : "音声学習済み — 文字学習でスタンプ獲得"}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.modalSub, { color: theme.textSecondary }]}>
              両方完了でスタンプ獲得（順番は自由）
            </ThemedText>
          )}

          <Pressable
            testID="modal-text-study"
            onPress={() => onSelect("text-only")}
            style={[
              styles.modalOption,
              phaseProgress.text
                ? { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "40" }
                : { backgroundColor: theme.primary + "12", borderColor: theme.primary + "40" },
            ]}
          >
            <View style={[styles.modalOptionIcon, { backgroundColor: phaseProgress.text ? Colors.light.success + "20" : theme.primary + "20" }]}>
              {phaseProgress.text ? (
                <Feather name="check-circle" size={22} color={Colors.light.success} />
              ) : (
                <Feather name="book-open" size={22} color={theme.primary} />
              )}
            </View>
            <View style={styles.modalOptionText}>
              <ThemedText style={[styles.modalOptionTitle, { color: phaseProgress.text ? Colors.light.success : theme.primary }]}>
                文字学習{phaseProgress.text ? "（完了）" : ""}
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                文字を見て意味を覚える
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={phaseProgress.text ? Colors.light.success : theme.primary} />
          </Pressable>

          <Pressable
            testID="modal-audio-study"
            onPress={() => onSelect("audio-only")}
            style={[
              styles.modalOption,
              phaseProgress.audio
                ? { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "40" }
                : { backgroundColor: Colors.light.secondary + "12", borderColor: Colors.light.secondary + "40" },
            ]}
          >
            <View style={[styles.modalOptionIcon, { backgroundColor: phaseProgress.audio ? Colors.light.success + "20" : Colors.light.secondary + "20" }]}>
              {phaseProgress.audio ? (
                <Feather name="check-circle" size={22} color={Colors.light.success} />
              ) : (
                <Feather name="headphones" size={22} color={Colors.light.secondary} />
              )}
            </View>
            <View style={styles.modalOptionText}>
              <ThemedText style={[styles.modalOptionTitle, { color: phaseProgress.audio ? Colors.light.success : Colors.light.secondary }]}>
                音声学習{phaseProgress.audio ? "（完了）" : ""}
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                音声を聞いて意味を覚える
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={phaseProgress.audio ? Colors.light.success : Colors.light.secondary} />
          </Pressable>

          <Pressable
            testID="modal-both-study"
            onPress={() => onSelect("study")}
            style={[styles.modalOption, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          >
            <View style={[styles.modalOptionIcon, { backgroundColor: theme.border + "40" }]}>
              <Feather name="layers" size={22} color={theme.textSecondary} />
            </View>
            <View style={styles.modalOptionText}>
              <ThemedText style={[styles.modalOptionTitle, { color: theme.text }]}>両方やる</ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                文字 → 音声の順に一気に学習
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SprintScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { sprintData, loading, loadSprint, totalCells, getSessionType, canSkipCurrentSession, skipSession, getCellPhaseProgress } = useSprint();

  const [words, setWords] = useState<Word[]>([]);
  const [canSkip, setCanSkip] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(0);

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
      setSelectedCell(index);
      setModalVisible(true);
    }
  };

  const handleModeSelect = (mode: SessionMode) => {
    setModalVisible(false);
    if (mode === "review") {
      navigation.navigate("SprintStudySession", { mode: "review" });
    } else {
      navigation.navigate("SprintStudySession", { mode });
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skipSession();
    const allWords = await getWords();
    setWords(allWords);
  };

  const currentPosition = sprintData?.currentPosition ?? 0;
  const isSetup = sprintData?.hasSetup ?? false;
  const streakCount = sprintData?.streakCount ?? 0;
  const specialStamps = sprintData?.specialStamps ?? [];
  const completedDates = sprintData?.completedDates ?? {};
  const completedCount = Object.keys(completedDates).length;
  const currentSessionType = isSetup ? getSessionType(currentPosition) : "flag";

  const getSessionTypeLabel = (type: SprintSessionType) => {
    switch (type) {
      case "study": return "学習";
      case "review": return "復習";
      case "test": return "テスト";
      default: return "";
    }
  };

  const getSessionTypeColor = (type: SprintSessionType) => {
    switch (type) {
      case "study": return theme.primary;
      case "review": return Colors.light.secondary;
      case "test": return "#7C3AED";
      default: return theme.textSecondary;
    }
  };

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
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing["3xl"] },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.streakBadge}>
            <Feather name="zap" size={15} color={Colors.light.secondary} />
            <ThemedText style={[styles.streakText, { color: Colors.light.secondary }]}>
              {streakCount}日連続
            </ThemedText>
          </View>
          {isSetup && currentSessionType !== "flag" ? (
            <View style={[styles.todayBadge, { backgroundColor: getSessionTypeColor(currentSessionType) + "18" }]}>
              <ThemedText style={[styles.todayText, { color: getSessionTypeColor(currentSessionType) }]}>
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
          <View style={[styles.setupPrompt, { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "30" }]}>
            <Feather name="flag" size={20} color={Colors.light.success} />
            <ThemedText style={[styles.setupPromptText, { color: theme.text }]}>
              旗のマスをタップして学習を始めましょう
            </ThemedText>
          </View>
        ) : canSkip ? (
          <Pressable
            testID="button-skip-session"
            onPress={handleSkip}
            style={[styles.skipBanner, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}
          >
            <Feather name="check-circle" size={18} color={theme.primary} />
            <ThemedText style={[styles.skipText, { color: theme.primary }]}>
              今日の単語は学習済みです。スタンプを進める
            </ThemedText>
            <Feather name="chevron-right" size={18} color={theme.primary} />
          </Pressable>
        ) : null}

        {/* Free-form path grid */}
        <View style={styles.gridWrapper}>
          {pathGrid.map((rowSlots, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {rowSlots.map((cellIndex, colIdx) => {
                if (cellIndex >= 0) {
                  const isCurrent = isSetup && cellIndex === currentPosition;
                  const isCompleted = isSetup && !isCurrent && (completedDates[cellIndex] != null || cellIndex < currentPosition);
                  const isSpecialStamp = specialStamps.includes(cellIndex);
                  return (
                    <Cell
                      key={colIdx}
                      index={cellIndex}
                      sessionType={getSessionType(cellIndex)}
                      isCurrent={isCurrent}
                      isCompleted={isCompleted}
                      isSpecialStamp={isSpecialStamp}
                      completedDate={completedDates[cellIndex]}
                      direction={getCellArrowDir(cellIndex)}
                      onPress={() => handleCellPress(cellIndex)}
                      theme={theme}
                    />
                  );
                }
                return <DecoCell key={colIdx} row={rowIdx} col={colIdx} theme={theme} />;
              })}
            </View>
          ))}
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
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate("SprintSetup"); }}
            style={styles.resetLink}
          >
            <ThemedText style={[styles.resetLinkText, { color: theme.textSecondary }]}>設定を変更する</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>

      <SessionModal
        visible={modalVisible}
        cellIndex={selectedCell}
        phaseProgress={getCellPhaseProgress(selectedCell)}
        onClose={() => setModalVisible(false)}
        onSelect={handleModeSelect}
        theme={theme}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.sm },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.lg },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, backgroundColor: Colors.light.secondary + "15", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  streakText: { fontSize: 13, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  todayBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  todayText: { fontSize: 12, fontWeight: "600", fontFamily: "Nunito_600SemiBold" },
  progressChart: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  progressChartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xs },
  progressChartTitle: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  diffLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  barRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  barLabel: { fontSize: 11, fontFamily: "Nunito_400Regular", width: 26 },
  barTrack: { flex: 1, height: 9, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  barCount: { fontSize: 11, fontFamily: "Nunito_600SemiBold", width: 34, textAlign: "right" },
  setupPrompt: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.lg },
  setupPromptText: { fontSize: 13, fontFamily: "Nunito_600SemiBold", flex: 1 },
  skipBanner: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.lg },
  skipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold", flex: 1 },
  gridWrapper: { marginBottom: Spacing.xl },
  gridRow: { flexDirection: "row" },
  cell: { borderRadius: 6, borderWidth: 1.5, justifyContent: "center", alignItems: "center", gap: 1, position: "relative" },
  cellNumber: { fontWeight: "700", fontFamily: "Nunito_700Bold", lineHeight: 15 },
  cellDate: { fontFamily: "Nunito_400Regular", lineHeight: 12 },
  cellArrow: { position: "absolute" },
  decoCell: { justifyContent: "center", alignItems: "center", borderRadius: 6 },
  legend: { marginBottom: Spacing.xl },
  legendTitle: { fontSize: 11, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  legendItems: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  resetLink: { alignItems: "center", paddingVertical: Spacing.sm },
  resetLinkText: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, paddingBottom: Spacing["3xl"], gap: Spacing.md },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.sm },
  modalProgressHint: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  modalProgressHintText: { fontSize: 12, fontFamily: "Nunito_600SemiBold", flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Nunito_700Bold", textAlign: "center" },
  modalSub: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: Spacing.xs },
  modalOption: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.md },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  modalOptionText: { flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Nunito_700Bold", marginBottom: 2 },
  modalOptionDesc: { fontSize: 12, fontFamily: "Nunito_400Regular" },
});
