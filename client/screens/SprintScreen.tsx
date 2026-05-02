import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
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
import { getWords, initializeData, getTutorialStampEarned } from "@/lib/storage";
import { useSprint, getSessionType as getSessionTypeFn } from "@/contexts/SprintContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SprintSessionType } from "@/types";
import { useI18n } from "@/contexts/LanguageContext";
import { NotificationReminderCard } from "@/components/NotificationReminderCard";
import {
  getSprintNotifEnabled,
  getSprintNotifTime,
  enableSprintNotification,
  disableSprintNotification,
  sendTestSprintNotification,
} from "@/lib/notifications";
import { SprintStackParamList } from "@/navigation/SprintStackNavigator";
import {
  PlantIcon, MonsterIcon, TreeIcon, CloudIcon, MountainIcon, FlowerIcon,
  WaveIcon, FishIcon, PalmIcon, SnowflakeIcon, SnowyMountainIcon, CedarTreeIcon,
  BuildingIcon, SmallBuildingIcon, SunIcon, MushroomIcon, TropicalFlowerIcon,
  MoonIcon, StarIcon, RocketIcon,
} from "@/components/SprintCellIcons";
import { AnimatedSprintIcon, SprintIconAnim } from "@/components/AnimatedSprintIcon";
import { HskLevel } from "@/types";

type NavigationProp = NativeStackNavigationProp<SprintStackParamList>;
type SessionMode = "study" | "text-only" | "audio-only" | "audio-cards-only" | "audio-playback";
type CellDir = "right" | "left" | "down" | "up" | null;

// Grid: 5 columns, dynamic rows — horizontal snake path
const NUM_GRID_COLS = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const ROW_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CELL_SIZE = Math.floor(ROW_WIDTH / NUM_GRID_COLS) - 12;

// ─── Level theme ────────────────────────────────────────────────────────────
interface LevelTheme {
  name: string;
  studyColor: string;
  studyBg: string;
  studyBorder: string;
  decoColor: string;
  decoBg: string;
}

const LEVEL_THEMES: Record<number, LevelTheme> = {
  1: { name: "草原",  studyColor: "#5B8C85", studyBg: "#5B8C8514", studyBorder: "#5B8C8545", decoColor: "#6EAF6E", decoBg: "#EBF5EB" },
  2: { name: "雪山",  studyColor: "#455A64", studyBg: "#455A6414", studyBorder: "#455A6445", decoColor: "#78909C", decoBg: "#ECEFF1" },
  3: { name: "森林",  studyColor: "#2E7D32", studyBg: "#2E7D3214", studyBorder: "#2E7D3245", decoColor: "#388E3C", decoBg: "#E6F4E6" },
  4: { name: "熱帯",  studyColor: "#E65100", studyBg: "#E6510014", studyBorder: "#E6510045", decoColor: "#FF8C42", decoBg: "#FFF3E0" },
  5: { name: "海",    studyColor: "#1976D2", studyBg: "#1976D214", studyBorder: "#1976D245", decoColor: "#38A2D7", decoBg: "#E3F2FD" },
  6: { name: "都市",  studyColor: "#37474F", studyBg: "#37474F14", studyBorder: "#37474F45", decoColor: "#546E7A", decoBg: "#ECEFF1" },
};

function getLevelTheme(level: number): LevelTheme {
  return LEVEL_THEMES[level] ?? LEVEL_THEMES[1];
}

// ─── Cell deco icon selection per level ────────────────────────────────────
// 7 variants: 0-5 = level icons; 6 = cloud (≈14% cloud coverage)
function getDecoVariant(row: number, col: number): number {
  return (row * 17 + col * 11 + row * col * 3 + row * 5) % 7;
}

function renderDecoIcon(variant: number, level: number, size: number, seed: number = 0) {
  const lv = getLevelTheme(level);
  // variant 6 → cloud (horizontal float)
  if (variant === 6) {
    return wrapDeco("float", seed, <CloudIcon size={size} color={lv.decoColor} />);
  }

  switch (level) {
    case 1: // 草原: tree / flower / plant の3種類 × 2
      if (variant === 0 || variant === 3) return wrapDeco("wobble", seed, <TreeIcon size={size} color={lv.decoColor} />);
      if (variant === 1 || variant === 4) return wrapDeco("wobble", seed, <FlowerIcon size={size} color="#C8A45A" />);
      return wrapDeco("wobble", seed, <PlantIcon size={size} color={lv.decoColor} />);
    case 2: // 雪山: snowy mountain (多め) / cedar / snowflake
      if (variant === 0 || variant === 2 || variant === 4) return <SnowyMountainIcon size={size} color={lv.decoColor} />;
      if (variant === 1 || variant === 3) return wrapDeco("wobble", seed, <CedarTreeIcon size={size} color="#455A64" />);
      return wrapDeco("twinkle", seed, <SnowflakeIcon size={size} color="#90CAF9" />);
    case 3: // 森林: 濃い木 / キノコ / 明るい木 の3種類 × 2
      if (variant === 0 || variant === 3) return wrapDeco("wobble", seed, <TreeIcon size={size} color="#2E7D32" />);
      if (variant === 1 || variant === 4) return wrapDeco("wobble", seed, <MushroomIcon size={size} color="#C62828" />);
      return wrapDeco("wobble", seed, <TreeIcon size={size} color="#66BB6A" />);
    case 4: // 熱帯: palm / tropical flower / plant の3種類 × 2
      if (variant === 0 || variant === 3) return wrapDeco("wobble", seed, <PalmIcon size={size} color={lv.decoColor} />);
      if (variant === 1 || variant === 4) return wrapDeco("wobble", seed, <TropicalFlowerIcon size={size} color="#E91E63" />);
      return wrapDeco("wobble", seed, <PlantIcon size={size} color="#66BB6A" />);
    case 5: // 海: wave / sun / fish の3種類 × 2
      if (variant === 0 || variant === 3) return wrapDeco("float", seed, <WaveIcon size={size} color={lv.decoColor} />);
      if (variant === 1 || variant === 4) return wrapDeco("twinkle", seed, <SunIcon size={size} color="#FFB300" />);
      return wrapDeco("float", seed, <FishIcon size={size} color="#42A5F5" />);
    case 6: // 都市: building / moon / star / rocket / small building の5種類
      if (variant === 0) return <BuildingIcon size={size} color="#546E7A" />;
      if (variant === 1) return wrapDeco("twinkle", seed, <MoonIcon size={size} color="#5C6BC0" />);
      if (variant === 2) return wrapDeco("twinkle", seed, <StarIcon size={size} color="#FFB300" />);
      if (variant === 3) return wrapDeco("float", seed, <RocketIcon size={size} color="#E53935" />);
      if (variant === 4) return <SmallBuildingIcon size={size} color="#607D8B" />;
      return wrapDeco("twinkle", seed, <MoonIcon size={size} color="#7986CB" />);
    default:
      return wrapDeco("wobble", seed, <TreeIcon size={size} color={lv.decoColor} />);
  }
}

function wrapDeco(type: SprintIconAnim, seed: number, child: React.ReactNode) {
  return (
    <AnimatedSprintIcon type={type} seed={seed}>
      {child}
    </AnimatedSprintIcon>
  );
}

// ─── Study cell icon per level ──────────────────────────────────────────────
function renderStudyIcon(level: number, size: number, color: string) {
  switch (level) {
    case 1: return <PlantIcon size={size} color={color} />;
    case 2: return <SnowyMountainIcon size={size} color={color} />;  // 雪山
    case 3: return <TreeIcon size={size} color={color} />;
    case 4: return <PalmIcon size={size} color={color} />;
    case 5: return <FishIcon size={size} color={color} />;           // 海
    case 6: return <BuildingIcon size={size} color={color} />;
    default: return <PlantIcon size={size} color={color} />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
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

function buildPathGrid(cellPositions: [number, number][], numRows: number): number[][] {
  const grid = Array.from({ length: numRows }, () => Array(NUM_GRID_COLS).fill(-1));
  cellPositions.forEach(([row, col], i) => { grid[row][col] = i; });
  return grid;
}

function getCellArrowDir(index: number, cellPositions: [number, number][]): CellDir {
  if (index >= cellPositions.length - 1) return null;
  const [r1, c1] = cellPositions[index];
  const [r2, c2] = cellPositions[index + 1];
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

function getTestNumber(cellIndex: number, wordsPerDay: number): number {
  let count = 0;
  for (let i = 1; i <= cellIndex; i++) {
    if (getSessionTypeFn(i, wordsPerDay) === "test") count++;
  }
  return count;
}

function getPreviousTestCell(cellIndex: number, wordsPerDay: number): number | null {
  for (let i = cellIndex - 1; i >= 1; i--) {
    if (getSessionTypeFn(i, wordsPerDay) === "test") return i;
  }
  return null;
}

// Count study sessions before position → used to compute word range for premium check
function getStudyWordOffset(position: number, wordsPerDay: number): number {
  let count = 0;
  for (let i = 1; i < position; i++) {
    if (getSessionTypeFn(i, wordsPerDay) === "study") count++;
  }
  return count;
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
  testNumber?: number;
  isLocked?: boolean;
  isPremiumLocked?: boolean;
  currentLevel: number;
}

function Cell({ index, sessionType, isCurrent, isCompleted, isSpecialStamp, completedDate, direction, onPress, theme, testNumber, isLocked, isPremiumLocked, currentLevel }: CellProps) {
  const isFlag = index === 0;
  const lvTheme = getLevelTheme(currentLevel);

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
    if (sessionType === "test") {
      bgColor = "#7C3AED";
      borderColor = "#7C3AED";
      iconColor = "#fff";
      textColor = "rgba(255,255,255,0.85)";
    } else {
      bgColor = lvTheme.studyColor;
      borderColor = lvTheme.studyColor;
      iconColor = "#fff";
      textColor = "rgba(255,255,255,0.85)";
    }
  } else if (isCurrent) {
    bgColor = Colors.light.secondary;
    borderColor = Colors.light.secondary;
    if (sessionType !== "test") featherIcon = "zap";
    iconColor = "#fff";
    textColor = "#fff";
  } else if (sessionType === "test") {
    if (isLocked) {
      // Test cell locked: not yet reached / prerequisite not met → amber tint
      bgColor = "#FFFBEA";
      borderColor = "#FFD54F";
      textColor = "#F59E0B";
    } else {
      bgColor = "#EDE9FE";
      borderColor = "#C4B5FD";
      textColor = "#7C3AED";
    }
  } else if (isPremiumLocked) {
    // Study cell locked: premium subscription required → grey tint
    bgColor = theme.backgroundSecondary;
    borderColor = theme.border;
    textColor = theme.textSecondary;
  } else {
    bgColor = lvTheme.studyBg;
    borderColor = lvTheme.studyBorder;
    textColor = lvTheme.studyColor;
  }

  const iconSize = CELL_SIZE * 0.38;

  const stampColor = isCompleted || isSpecialStamp || isCurrent || isFlag
    ? iconColor
    : undefined;

  const renderIcon = () => {
    if (featherIcon) {
      const icon = <Feather name={featherIcon} size={CELL_SIZE * 0.32} color={iconColor} />;
      // Special stamp star → twinkle, current zap → pulse, flag → static
      if (isSpecialStamp) {
        return <AnimatedSprintIcon type="twinkle" seed={index}>{icon}</AnimatedSprintIcon>;
      }
      if (isCurrent && featherIcon === "zap") {
        return <AnimatedSprintIcon type="pulse" seed={index}>{icon}</AnimatedSprintIcon>;
      }
      return icon;
    }
    // Test cell locked: sequential lock (not yet reached) → monster in amber, no animation
    if (isLocked) {
      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <MonsterIcon size={iconSize * 0.85} color="#7C3AED" />
          {testNumber != null ? (
            <View style={[styles.testNumBadge, { backgroundColor: "#7C3AED22" }]}>
              <ThemedText style={[styles.testNumText, { color: "#7C3AED" }]}>{testNumber}</ThemedText>
            </View>
          ) : null}
        </View>
      );
    }
    // Study cell premium locked: lock icon in grey, no animation
    if (isPremiumLocked) {
      return <Feather name="lock" size={CELL_SIZE * 0.30} color={theme.textSecondary + "70"} />;
    }
    if (sessionType === "test") {
      const monster = <MonsterIcon size={iconSize * 0.85} color={stampColor ?? "#7C3AED"} />;
      // Animate monster on unreached test cells (not completed) → hop
      const animatedMonster = isCompleted ? monster : (
        <AnimatedSprintIcon type="hop" seed={index}>{monster}</AnimatedSprintIcon>
      );
      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {animatedMonster}
          {testNumber != null ? (
            <View style={[styles.testNumBadge, (isCompleted || isCurrent) ? { backgroundColor: "rgba(255,255,255,0.3)" } : { backgroundColor: "#7C3AED22" }]}>
              <ThemedText style={[styles.testNumText, { color: (isCompleted || isCurrent) ? "#fff" : "#7C3AED" }]}>
                {testNumber}
              </ThemedText>
            </View>
          ) : null}
        </View>
      );
    }
    // Completed non-test cells all show PlantIcon (HSK1 style) — no animation
    if (isCompleted) return <PlantIcon size={iconSize} color={stampColor ?? "#fff"} />;
    return renderStudyIcon(currentLevel, iconSize, stampColor ?? lvTheme.studyColor);
  };

  return (
    <Pressable
      testID={`cell-${index}`}
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: bgColor, borderColor, width: CELL_SIZE, height: CELL_SIZE },
        (isLocked || isPremiumLocked) ? { opacity: 0.65 } : null,
      ]}
    >
      {renderIcon()}
      {index > 0 && sessionType !== "test" ? (
        <ThemedText style={[styles.cellNumber, { color: textColor, fontSize: CELL_SIZE * 0.16 }]}>
          {index}
        </ThemedText>
      ) : null}
      {isCompleted && completedDate ? (
        <View style={{ alignItems: "center" }}>
          {sessionType === "test" ? (
            <ThemedText style={[styles.cellDate, { color: textColor, fontSize: CELL_SIZE * 0.13, fontWeight: "600" }]}>
              クリア
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.cellDate, { color: textColor, fontSize: CELL_SIZE * 0.13 }]}>
            {formatShortDate(completedDate)}
          </ThemedText>
        </View>
      ) : null}
      {direction ? (
        <View
          style={[
            styles.cellArrow,
            direction === "right"
              ? { right: -8, top: Math.floor(CELL_SIZE / 2) - 8 }
              : direction === "left"
              ? { left: -8, top: Math.floor(CELL_SIZE / 2) - 8 }
              : direction === "down"
              ? { bottom: -8, left: Math.floor(CELL_SIZE / 2) - 8 }
              : { top: -8, left: Math.floor(CELL_SIZE / 2) - 8 },
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
            size={16}
            color={isCurrent ? "rgba(255,255,255,0.7)" : isCompleted ? theme.primary + "70" : theme.textSecondary + "50"}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function DecoCell({ row, col, theme, currentLevel }: { row: number; col: number; theme: ReturnType<typeof useTheme>["theme"]; currentLevel: number }) {
  const variant = getDecoVariant(row, col);
  const iconSize = CELL_SIZE * 0.6;
  const lvTheme = getLevelTheme(currentLevel);
  const seed = row * 137 + col * 53 + row * col * 7;
  return (
    <View style={[styles.decoCell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: lvTheme.decoBg + "60" }]}>
      {renderDecoIcon(variant, currentLevel, iconSize, seed)}
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
  const { t } = useI18n();
  const maxCells = totalCells - 1;
  const expected = Math.min(getDaysElapsed(setupDate), maxCells);
  const actualVal = Math.min(completedCount, maxCells);
  const diff = actualVal - expected;
  const diffColor = diff === 0 ? theme.textSecondary : diff > 0 ? Colors.light.success : Colors.light.alert;
  const diffLabel = diff === 0 ? t("on_schedule") : diff > 0 ? `${diff}${t("ahead")}` : `${Math.abs(diff)}${t("behind")}`;

  return (
    <View style={[styles.progressChart, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      <View style={styles.progressChartHeader}>
        <ThemedText style={[styles.progressChartTitle, { color: theme.text }]}>{t("sprint_progress")}</ThemedText>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + "18" }]}>
          <Feather name={diff === 0 ? "minus" : diff > 0 ? "trending-up" : "trending-down"} size={11} color={diffColor} />
          <ThemedText style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>{t("scheduled")}</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.barFill, { width: `${(expected / maxCells) * 100}%`, backgroundColor: theme.textSecondary + "50" }]} />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.textSecondary }]}>{expected}/{maxCells}</ThemedText>
      </View>
      <View style={styles.barRow}>
        <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>{t("actual")}</ThemedText>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.barFill, { width: `${(actualVal / maxCells) * 100}%`, backgroundColor: diff >= 0 ? Colors.light.success : Colors.light.alert }]} />
        </View>
        <ThemedText style={[styles.barCount, { color: theme.text }]}>{actualVal}/{maxCells}</ThemedText>
      </View>
    </View>
  );
}

interface SessionModalProps {
  visible: boolean;
  cellIndex: number;
  phaseProgress: { text: boolean; audio: boolean; audioCards: boolean };
  onClose: () => void;
  onSelect: (mode: SessionMode) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function SessionModal({ visible, cellIndex, phaseProgress, onClose, onSelect, theme }: SessionModalProps) {
  const bothDone = phaseProgress.text && phaseProgress.audio && phaseProgress.audioCards;
  const doneCount = [phaseProgress.text, phaseProgress.audio, phaseProgress.audioCards].filter(Boolean).length;
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
              マス {cellIndex} — 3つ完了！スタンプ獲得
            </ThemedText>
          ) : doneCount > 0 ? (
            <View style={[styles.modalProgressHint, { backgroundColor: Colors.light.alert + "15", borderColor: Colors.light.alert + "40" }]}>
              <Feather name="info" size={13} color={Colors.light.alert} />
              <ThemedText style={[styles.modalProgressHintText, { color: Colors.light.alert }]}>
                {doneCount}/3 完了 — 残りを完了するとスタンプ獲得
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.modalSub, { color: theme.textSecondary }]}>
              文字・音声リスト・音声カードの3つを完了しよう
            </ThemedText>
          )}

          {/* 1: 文字リスト */}
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
                文字リスト{phaseProgress.text ? "（完了）" : ""}
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                文字を見て覚えた／まだをマーク
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={phaseProgress.text ? Colors.light.success : theme.primary} />
          </Pressable>

          {/* 2: 音声リスト */}
          <Pressable
            testID="modal-audio-list"
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
                音声リスト{phaseProgress.audio ? "（完了）" : ""}
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                音声を聴いて覚えた／まだをマーク
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={phaseProgress.audio ? Colors.light.success : Colors.light.secondary} />
          </Pressable>

          {/* 3: 音声カード */}
          <Pressable
            testID="modal-audio-cards"
            onPress={() => onSelect("audio-cards-only")}
            style={[
              styles.modalOption,
              phaseProgress.audioCards
                ? { backgroundColor: Colors.light.success + "12", borderColor: Colors.light.success + "40" }
                : { backgroundColor: Colors.light.alert + "12", borderColor: Colors.light.alert + "40" },
            ]}
          >
            <View style={[styles.modalOptionIcon, { backgroundColor: phaseProgress.audioCards ? Colors.light.success + "20" : Colors.light.alert + "20" }]}>
              {phaseProgress.audioCards ? (
                <Feather name="check-circle" size={22} color={Colors.light.success} />
              ) : (
                <Feather name="layers" size={22} color={Colors.light.alert} />
              )}
            </View>
            <View style={styles.modalOptionText}>
              <ThemedText style={[styles.modalOptionTitle, { color: phaseProgress.audioCards ? Colors.light.success : Colors.light.alert }]}>
                音声カード{phaseProgress.audioCards ? "（完了）" : ""}
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                音声→文字→意味の順で3段階確認
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={phaseProgress.audioCards ? Colors.light.success : Colors.light.alert} />
          </Pressable>

          {/* 4: 音声連続再生 */}
          <Pressable
            testID="modal-audio-playback"
            onPress={() => onSelect("audio-playback")}
            style={[
              styles.modalOption,
              { backgroundColor: "#7C3AED12", borderColor: "#7C3AED40" },
            ]}
          >
            <View style={[styles.modalOptionIcon, { backgroundColor: "#7C3AED20" }]}>
              <Feather name="play-circle" size={22} color="#7C3AED" />
            </View>
            <View style={styles.modalOptionText}>
              <ThemedText style={[styles.modalOptionTitle, { color: "#7C3AED" }]}>
                音声連続再生
              </ThemedText>
              <ThemedText style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                このマスの音声未暗記単語を連続再生
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color="#7C3AED" />
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SprintScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const safeHeaderPadding = Math.max(headerHeight, insets.top + 44);
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { sprintData, loading, loadSprint, totalCells, getSessionType, canSkipCurrentSession, skipSession, getCellPhaseProgress, currentLevel } = useSprint();
  const { isPremium } = useSubscription();

  const [words, setWords] = useState<Word[]>([]);
  const [canSkip, setCanSkip] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(0);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [tutorialEarned, setTutorialEarned] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await loadSprint();
        await initializeData();
        const allWords = await getWords();
        setWords(allWords);
        const earned = await getTutorialStampEarned();
        setTutorialEarned(earned);
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
    if (index === 0) {
      if (!tutorialEarned) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        (navigation as any).navigate("TutorialSprint");
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wPD = sprintData.wordsPerDay ?? 10;
    const sessionType = getSessionType(index, wPD);
    const sStamps = sprintData.specialStamps ?? [];

    if (sessionType === "test") {
      const testNum = getTestNumber(index, wPD);
      const prevTestCell = getPreviousTestCell(index, wPD);
      const cDates = sprintData.completedDates ?? {};

      // Test is truly "cleared" only if it's in specialStamps (passed ≥85%)
      if (sStamps.includes(index)) {
        Alert.alert(t("test_cleared").replace("{n}", String(testNum)), formatShortDate(cDates[index] ?? ""), [{ text: t("ok") }]);
        return;
      }
      if (index !== currentPosition) {
        Alert.alert(`${t("session_type_test")} ${testNum}`, t("test_locked"), [{ text: t("ok") }]);
        return;
      }
      if (prevTestCell !== null && !sStamps.includes(prevTestCell) && !cDates[prevTestCell]) {
        Alert.alert(`${t("session_type_test")} ${testNum}`, t("test_locked"), [{ text: t("ok") }]);
        return;
      }
      if (testNum > 1 && !isPremium) {
        (navigation as any).navigate("Paywall");
        return;
      }
      navigation.navigate("SprintTest");
    } else {
      // Premium check for study cells: words 51+ require premium (except HSK1)
      const studyOffset = getStudyWordOffset(index, wPD);
      if (studyOffset * wPD >= 50 && currentLevel !== 1 && !isPremium) {
        (navigation as any).navigate("Paywall");
        return;
      }
      setSelectedCell(index);
      setModalVisible(true);
    }
  };

  const handleModeSelect = (mode: SessionMode) => {
    setModalVisible(false);
    if (mode === "audio-playback") {
      navigation.navigate("SprintAudioPlayback", { cellIndex: selectedCell });
    } else {
      navigation.navigate("SprintStudySession", { mode, cellIndex: selectedCell });
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

  const cellPositions = useMemo(() => buildCellPositions(totalCells), [totalCells]);
  const numGridRows = useMemo(
    () => cellPositions.reduce((max, [row]) => Math.max(max, row), 0) + 1,
    [cellPositions]
  );
  const pathGrid = useMemo(
    () => buildPathGrid(cellPositions, numGridRows),
    [cellPositions, numGridRows]
  );
  const completedCount = Object.keys(completedDates).length;
  const wordsPerDay = sprintData?.wordsPerDay ?? 10;
  const currentSessionType = isSetup ? getSessionType(currentPosition, wordsPerDay) : "flag";

  const getSessionTypeLabel = (type: SprintSessionType) => {
    switch (type) {
      case "study": return t("session_type_study");
      case "test": return t("session_type_test");
      default: return "";
    }
  };

  const getSessionTypeColor = (type: SprintSessionType) => {
    switch (type) {
      case "study": return theme.primary;
      case "test": return "#7C3AED";
      default: return theme.textSecondary;
    }
  };

  const getLevelName = (level: number) => {
    const keys: Record<number, string> = {
      1: t("level_grassland"), 2: t("level_snowy"), 3: t("level_forest"),
      4: t("level_tropical"), 5: t("level_ocean"), 6: t("level_city"),
    };
    return keys[level] ?? t("level_grassland");
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centered, { paddingTop: safeHeaderPadding + Spacing.xl }]}>
          <ThemedText style={{ color: theme.textSecondary }}>{t("loading")}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: safeHeaderPadding + Spacing.xl, paddingBottom: tabBarHeight + Spacing["3xl"] },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.streakBadge}>
              <Feather name="zap" size={15} color={Colors.light.secondary} />
              <ThemedText style={[styles.streakText, { color: Colors.light.secondary }]}>
                {t("streak_days").replace("{n}", String(streakCount))}
              </ThemedText>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: getLevelTheme(currentLevel).studyColor + "18", borderColor: getLevelTheme(currentLevel).studyColor + "50" }]}>
              <ThemedText style={[styles.levelBadgeText, { color: getLevelTheme(currentLevel).studyColor }]}>
                HSK{currentLevel}・{getLevelName(currentLevel)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.topBarRight}>
            {isSetup && currentSessionType !== "flag" ? (
              <View style={[styles.todayBadge, { backgroundColor: getSessionTypeColor(currentSessionType) + "18" }]}>
                <ThemedText style={[styles.todayText, { color: getSessionTypeColor(currentSessionType) }]}>
                  今日: {getSessionTypeLabel(currentSessionType)}
                </ThemedText>
              </View>
            ) : null}
            <Pressable
              testID="button-stamp-gallery"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate("SprintStampGallery"); }}
              style={[styles.stampGalleryBtn, { backgroundColor: Colors.light.secondary }]}
            >
              <Feather name="award" size={16} color="#FFFFFF" />
              <ThemedText style={[styles.stampGalleryBtnText, { color: "#FFFFFF" }]}>{t("stamp_gallery_btn")}</ThemedText>
              {Object.keys(sprintData?.completedDates ?? {}).length > 0 ? (
                <View style={styles.stampCountBadge}>
                  <ThemedText style={styles.stampCountText}>
                    {Object.keys(sprintData?.completedDates ?? {}).length}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
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
        ) : null}

        {/* Free-form path grid */}
        <View style={styles.gridWrapper}>
          {pathGrid.map((rowSlots, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {rowSlots.map((cellIndex, colIdx) => {
                if (cellIndex >= 0) {
                  const isCurrent = isSetup && cellIndex === currentPosition;
                  const wPD = sprintData?.wordsPerDay ?? 10;
                  const cellSessionType = getSessionType(cellIndex, wPD);
                  // Test cells: "completed" only when passed (in specialStamps) OR skipped (in completedDates)
                  // Study cells: completed when in completedDates
                  const isCompleted = isSetup && !isCurrent && (
                    cellSessionType === "test"
                      ? specialStamps.includes(cellIndex) || completedDates[cellIndex] != null
                      : completedDates[cellIndex] != null
                  );
                  const isSpecialStamp = specialStamps.includes(cellIndex);
                  const cellTestNum = cellSessionType === "test" ? getTestNumber(cellIndex, wPD) : undefined;
                  const prevTestForCell = cellSessionType === "test" ? getPreviousTestCell(cellIndex, wPD) : null;
                  // Lock test cells that can't be attempted yet (sequential lock)
                  // Previous test must be either specially stamped (passed) OR in completedDates (skipped)
                  const testIsLocked = cellSessionType === "test" && !isCompleted && (
                    (prevTestForCell !== null && !specialStamps.includes(prevTestForCell) && !completedDates[prevTestForCell]) ||
                    cellIndex !== currentPosition
                  );
                  // Lock study cells that require premium words (word 51+ for non-HSK1)
                  const studyIsPremiumLocked = cellSessionType === "study" &&
                    currentLevel !== 1 &&
                    !isPremium &&
                    (getStudyWordOffset(cellIndex, wPD) * wPD >= 50);
                  return (
                    <Cell
                      key={colIdx}
                      index={cellIndex}
                      sessionType={cellSessionType}
                      isCurrent={isCurrent}
                      isCompleted={isCompleted}
                      isSpecialStamp={isSpecialStamp}
                      completedDate={completedDates[cellIndex]}
                      direction={getCellArrowDir(cellIndex, cellPositions)}
                      onPress={() => handleCellPress(cellIndex)}
                      theme={theme}
                      testNumber={cellTestNum}
                      isLocked={testIsLocked}
                      isPremiumLocked={studyIsPremiumLocked}
                      currentLevel={currentLevel}
                    />
                  );
                }
                return <DecoCell key={colIdx} row={rowIdx} col={colIdx} theme={theme} currentLevel={currentLevel} />;
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <ThemedText style={[styles.legendTitle, { color: theme.textSecondary }]}>{t("legend")}</ThemedText>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.secondary }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>{t("legend_current")}</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>{t("legend_done")}</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>{t("legend_test")}</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.alert }]} />
              <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>{t("legend_special")}</ThemedText>
            </View>
          </View>
        </View>

        {isSetup ? (
          <View style={styles.bottomActionRow}>
            <Pressable
              testID="button-reset-sprint"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate("SprintSetup", { isChange: true }); }}
              style={({ pressed }) => [
                styles.resetLink,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="settings" size={15} color={theme.textSecondary} />
              <ThemedText style={[styles.resetLinkText, { color: theme.textSecondary }]}>{t("change_settings")}</ThemedText>
            </Pressable>
            <Pressable
              testID="button-open-sprint-reminder"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReminderModalVisible(true); }}
              style={({ pressed }) => [
                styles.resetLink,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="bell" size={15} color={theme.textSecondary} />
              <ThemedText style={[styles.resetLinkText, { color: theme.textSecondary }]}>{t("reminder_settings")}</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <Pressable
          style={styles.reminderOverlay}
          onPress={() => setReminderModalVisible(false)}
        >
          <Pressable
            style={[styles.reminderSheet, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.reminderSheetHeader}>
              <ThemedText style={styles.reminderSheetTitle}>{t("reminder_settings")}</ThemedText>
              <Pressable
                testID="button-close-sprint-reminder"
                onPress={() => setReminderModalVisible(false)}
                style={({ pressed }) => [styles.reminderCloseBtn, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={10}
              >
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <NotificationReminderCard
              title={t("sprint_reminder_title")}
              description={t("sprint_reminder_desc")}
              infoText={t("sprint_reminder_info")}
              iconName="bell"
              accentColor={Colors.light.secondary}
              testIdPrefix="sprint-notif"
              getEnabled={getSprintNotifEnabled}
              getTime={getSprintNotifTime}
              enable={enableSprintNotification}
              disable={disableSprintNotification}
              sendTest={sendTestSprintNotification}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
  content: { paddingHorizontal: Spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: Spacing.lg },
  topBarLeft: { flexDirection: "column", alignItems: "flex-start", gap: Spacing.xs },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, backgroundColor: Colors.light.secondary + "15", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  streakText: { fontSize: 13, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  levelBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  levelBadgeText: { fontSize: 12, fontFamily: "Nunito_700Bold", fontWeight: "700" },
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
  gridRow: { flexDirection: "row", justifyContent: "space-between", overflow: "visible" },
  cell: { borderRadius: 6, borderWidth: 1.5, justifyContent: "center", alignItems: "center", gap: 1, position: "relative", overflow: "visible" },
  cellNumber: { fontWeight: "700", fontFamily: "Nunito_700Bold", lineHeight: 15 },
  cellDate: { fontFamily: "Nunito_400Regular", lineHeight: 12 },
  cellArrow: { position: "absolute" },
  testNumBadge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  testNumText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  decoCell: { justifyContent: "center", alignItems: "center", borderRadius: 6 },
  legend: { marginBottom: Spacing.xl },
  legendTitle: { fontSize: 11, fontFamily: "Nunito_600SemiBold", marginBottom: Spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  legendItems: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  stampGalleryBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full },
  stampGalleryBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Nunito_700Bold" },
  stampCountBadge: { backgroundColor: "rgba(255,255,255,0.3)", borderRadius: BorderRadius.full, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  stampCountText: { fontSize: 11, fontFamily: "Nunito_700Bold", color: "#FFFFFF" },
  resetLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 999,
    borderWidth: 1.5,
    alignSelf: "center",
  },
  resetLinkText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  bottomActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  reminderOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  reminderSheet: {
    width: "100%",
    maxWidth: 480,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reminderSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderSheetTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  reminderCloseBtn: {
    padding: Spacing.xs,
  },
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
