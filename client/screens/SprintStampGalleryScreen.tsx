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
import { LinearGradient } from "expo-linear-gradient";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeHeaderPadding } from "@/hooks/useSafeHeaderPadding";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SpeakButton } from "@/components/SpeakButton";
import { ShareStampSheet } from "@/components/ShareStampSheet";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSprint, getSessionType } from "@/contexts/SprintContext";
import { getQuoteForStamp, Quote } from "@/data/quotes";
import { HSK_QUOTES } from "@/data/hskQuotes";
import { getTutorialStampEarned } from "@/lib/storage";
import { useFocusEffect } from "@react-navigation/native";

import { TUTORIAL_STAMP, PANDA_STAMPS, PANDA_SPECIALS, getPandaImage } from "@/data/pandaStamps";
import { getPandaName, getPandaStampName, getSpecialPandaNameByIndex } from "@/data/pandaStampNames";

const NUM_COLS = 4;
const SCREEN_WIDTH = Dimensions.get("window").width;
const STAMP_SIZE = Math.floor(
  (SCREEN_WIDTH - Spacing.lg * 2 - (NUM_COLS - 1) * Spacing.md) / NUM_COLS
);
const DEV_COLS = 5;
const DEV_SIZE = Math.floor(
  (SCREEN_WIDTH - Spacing.lg * 2 - (DEV_COLS - 1) * Spacing.sm) / DEV_COLS
);

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}


export default function SprintStampGalleryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const safeHeaderPadding = useSafeHeaderPadding();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { sprintData, totalCells, currentLevel } = useSprint();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<{
    image: any;
    label: string;
    isSpecial: boolean;
  } | null>(null);
  const [showShare, setShowShare] = useState(false);
  // Snapshot of stamp/quote data used when opening share sheet.
  // We capture this before closing the parent modal so the data isn't lost.
  const [shareStampData, setShareStampData] = useState<{
    image: any;
    label: string;
    isSpecial: boolean;
    quote: { chinese: string; japanese?: string; source?: string } | null;
  } | null>(null);
  const [tutorialEarned, setTutorialEarned] = useState(false);
  const [showDevPreview, setShowDevPreview] = useState(false);

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
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: theme.specialEmptyBackground,
                  borderWidth: 1.5,
                  borderColor: theme.specialEmptyBorder,
                  borderStyle: "dashed",
                },
              ]}
            />
            <ThemedText style={[styles.legendLabel, { color: theme.textSecondary }]}>
              {t("legend_special_upcoming")}
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
                  const isExpectedSpecialEmpty = !isCompleted && !isTutorial && isTest;

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
                        setSelectedStamp({
                          image: TUTORIAL_STAMP,
                          label: t("tutorial_stamp_label"),
                          isSpecial: true,
                        });
                      }
                      return;
                    }
                    const quote = getQuoteForStamp(cell.index, currentLevel);
                    if (quote) {
                      setSelectedQuote(quote);
                      setSelectedStamp({
                        image: getPandaImage(cell.index, isSpecial, currentLevel),
                        label: `No.${cell.index}`,
                        isSpecial,
                      });
                    }
                  };

                  return (
                    <Pressable key={colIdx} style={[styles.stampWrapper, { width: STAMP_SIZE }]} onPress={handleStampPress}>
                      {/* Tutorial stamp: special gold gradient border */}
                      {isTutorial ? (
                        isCompleted ? (
                          <LinearGradient
                            colors={["#FFD700", "#FFA500", "#FF6B35", "#FFD700"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              width: STAMP_SIZE + 6,
                              height: STAMP_SIZE + 6,
                              borderRadius: (STAMP_SIZE + 6) / 2,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <View style={{
                              width: STAMP_SIZE,
                              height: STAMP_SIZE,
                              borderRadius: STAMP_SIZE / 2,
                              backgroundColor: theme.backgroundDefault,
                              justifyContent: "center",
                              alignItems: "center",
                              overflow: "hidden",
                            }}>
                              <Image
                                source={TUTORIAL_STAMP}
                                style={{ width: STAMP_SIZE - 4, height: STAMP_SIZE - 4, borderRadius: (STAMP_SIZE - 4) / 2 }}
                                resizeMode="cover"
                              />
                            </View>
                            {/* Crown overlay */}
                            <View style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              backgroundColor: "#FFD700",
                              borderRadius: 10,
                              width: 20,
                              height: 20,
                              justifyContent: "center",
                              alignItems: "center",
                              borderWidth: 1.5,
                              borderColor: "#fff",
                            }}>
                              <Feather name="star" size={11} color="#fff" />
                            </View>
                          </LinearGradient>
                        ) : (
                          <View style={{
                            width: STAMP_SIZE + 6,
                            height: STAMP_SIZE + 6,
                            borderRadius: (STAMP_SIZE + 6) / 2,
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 2,
                            borderColor: "#FFD700",
                            borderStyle: "dashed",
                            backgroundColor: theme.backgroundSubtle ?? "#F3F4F6",
                          }}>
                            <Feather
                              name="star"
                              size={Math.round(STAMP_SIZE * 0.42)}
                              color="#FFD700"
                            />
                          </View>
                        )
                      ) : (
                        <View
                          style={[
                            styles.stampCircle,
                            {
                              width: STAMP_SIZE,
                              height: STAMP_SIZE,
                              borderRadius: STAMP_SIZE / 2,
                              borderColor: isCompleted
                                ? borderColor
                                : isExpectedSpecialEmpty
                                ? theme.specialEmptyBorder
                                : theme.border,
                              borderWidth: isCompleted
                                ? 2.5
                                : isExpectedSpecialEmpty
                                ? 2
                                : 1.5,
                              borderStyle: isExpectedSpecialEmpty ? "dashed" : "solid",
                              backgroundColor: isCompleted
                                ? theme.backgroundDefault
                                : isExpectedSpecialEmpty
                                ? theme.specialEmptyBackground
                                : theme.backgroundSubtle ?? "#F3F4F6",
                            },
                          ]}
                        >
                          {isCompleted ? (
                            <Image
                              source={getPandaImage(cell.index, isSpecial, currentLevel)}
                              style={[
                                styles.pandaImage,
                                { width: STAMP_SIZE - 6, height: STAMP_SIZE - 6, borderRadius: (STAMP_SIZE - 6) / 2 },
                              ]}
                              resizeMode="cover"
                            />
                          ) : isExpectedSpecialEmpty ? (
                            <View style={styles.specialEmptyInner}>
                              <ThemedText
                                style={[
                                  styles.specialEmptyLabel,
                                  {
                                    color: theme.specialEmptyText,
                                    fontSize: STAMP_SIZE * 0.11,
                                  },
                                ]}
                                numberOfLines={2}
                              >
                                {t("stamp_special_empty_label")}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.specialEmptyNumber,
                                  {
                                    color: theme.specialEmptyText,
                                    fontSize: STAMP_SIZE * 0.16,
                                  },
                                ]}
                              >
                                No.{cell.index}
                              </ThemedText>
                            </View>
                          ) : (
                            <ThemedText
                              style={[styles.stampNumber, { color: theme.border, fontSize: STAMP_SIZE * 0.26 }]}
                            >
                              {cell.index}
                            </ThemedText>
                          )}
                        </View>
                      )}

                      <View style={styles.stampMeta}>
                        <ThemedText
                          style={[
                            styles.stampDate,
                            {
                              color: isTutorial
                                ? "#FFA500"
                                : theme.textSecondary,
                              fontFamily: isTutorial ? "Nunito_700Bold" : "Nunito_400Regular",
                            },
                          ]}
                        >
                          {isTutorial
                            ? t("tutorial_stamp_label")
                            : (isSpecial || isExpectedSpecialEmpty) && !isCompleted
                            ? "?????"
                            : isSpecial
                            ? `${cell.index} ${getPandaName(cell.index, isSpecial, currentLevel)}`
                            : `${cell.index} ${getPandaName(cell.index, isSpecial, currentLevel).replace(/パンダ$/, "")}`}
                        </ThemedText>
                        {!isTutorial && isCompleted && cell.completedDate ? (
                          <ThemedText style={[styles.stampDate, { color: theme.textSecondary }]}>
                            {formatDate(cell.completedDate)}
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

        {/* Dev: stamp preview button — only visible in development */}
        {__DEV__ ? (
          <Pressable
            testID="button-dev-stamp-preview"
            onPress={() => setShowDevPreview(true)}
            style={({ pressed }) => [
              styles.devBtn,
              { borderColor: "#7C3AED", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="eye" size={14} color="#7C3AED" />
            <ThemedText style={styles.devBtnText}>全スタンプ確認 (DEV)</ThemedText>
          </Pressable>
        ) : null}
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
                <View style={styles.modalActionRow}>
                  <Pressable
                    style={[styles.modalShareBtn, { borderColor: theme.primary }]}
                    onPress={() => {
                      if (!selectedStamp) return;
                      // Snapshot data before closing parent modal
                      setShareStampData({
                        image: selectedStamp.image,
                        label: selectedStamp.label,
                        isSpecial: selectedStamp.isSpecial,
                        quote: selectedQuote
                          ? {
                              chinese: selectedQuote.chinese,
                              japanese:
                                lang === "en" && selectedQuote.english
                                  ? selectedQuote.english
                                  : selectedQuote.japanese,
                              source: selectedQuote.source,
                            }
                          : null,
                      });
                      // Close parent modal first, open share sheet after animation
                      setSelectedQuote(null);
                      setTimeout(() => setShowShare(true), 350);
                    }}
                    testID="button-gallery-share"
                  >
                    <Feather name="share-2" size={16} color={theme.primary} />
                    <ThemedText style={[styles.modalShareBtnText, { color: theme.primary }]}>
                      {t("share_action")}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.modalCloseBtnHalf, { backgroundColor: theme.primary }]}
                    onPress={() => setSelectedQuote(null)}
                  >
                    <ThemedText style={styles.modalCloseBtnText}>{t("close")}</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {shareStampData ? (
        <ShareStampSheet
          visible={showShare}
          onClose={() => {
            setShowShare(false);
            setShareStampData(null);
          }}
          stampImage={shareStampData.image}
          stampLabel={shareStampData.label}
          hskLevel={currentLevel}
          stampCount={completedCount}
          isSpecial={shareStampData.isSpecial}
          quote={shareStampData.quote}
        />
      ) : null}

      {/* Dev-only: full stamp preview modal */}
      {__DEV__ ? (
        <Modal
          visible={showDevPreview}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDevPreview(false)}
        >
          <View style={styles.devOverlay}>
            <View style={[styles.devSheet, { backgroundColor: theme.backgroundDefault }]}>
              {/* Header */}
              <View style={[styles.devSheetHeader, { borderBottomColor: theme.border }]}>
                <View>
                  <ThemedText style={styles.devSheetTitle}>全スタンプ確認</ThemedText>
                  <ThemedText style={[styles.devSheetSub, { color: theme.textSecondary }]}>
                    開発用 — 本番では非表示
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setShowDevPreview(false)}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                >
                  <Feather name="x" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.devScrollContent}>
                {/* Tutorial stamp */}
                <ThemedText style={[styles.devSectionTitle, { color: theme.primary }]}>
                  はじめての一歩スタンプ
                </ThemedText>
                <View style={styles.devStampRow}>
                  <View style={styles.devStampItem}>
                    <LinearGradient
                      colors={["#FFD700", "#FFA500", "#FF6B35", "#FFD700"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: DEV_SIZE + 6,
                        height: DEV_SIZE + 6,
                        borderRadius: (DEV_SIZE + 6) / 2,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <View style={{
                        width: DEV_SIZE,
                        height: DEV_SIZE,
                        borderRadius: DEV_SIZE / 2,
                        backgroundColor: theme.backgroundDefault,
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                      }}>
                        <Image
                          source={TUTORIAL_STAMP}
                          style={{ width: DEV_SIZE - 4, height: DEV_SIZE - 4, borderRadius: (DEV_SIZE - 4) / 2 }}
                          resizeMode="cover"
                        />
                      </View>
                    </LinearGradient>
                    <ThemedText style={[styles.devStampLabel, { color: theme.textSecondary }]}>tutorial</ThemedText>
                  </View>
                </View>

                {/* Special stamps */}
                <ThemedText style={[styles.devSectionTitle, { color: "#7C3AED" }]}>
                  スペシャルスタンプ (テスト合格) — 全{PANDA_SPECIALS.length}種
                </ThemedText>
                <View style={styles.devGrid}>
                  {PANDA_SPECIALS.map((src, idx) => (
                    <View key={`special-${idx}`} style={styles.devStampItem}>
                      <View style={[styles.devStampCircle, { borderColor: Colors.light.alert, backgroundColor: theme.backgroundDefault }]}>
                        <Image
                          source={src}
                          style={{ width: DEV_SIZE - 6, height: DEV_SIZE - 6, borderRadius: (DEV_SIZE - 6) / 2 }}
                          resizeMode="cover"
                        />
                      </View>
                      <ThemedText style={[styles.devStampLabel, { color: theme.textSecondary }]} numberOfLines={2}>{getSpecialPandaNameByIndex(idx)}</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Regular stamps 1–60 */}
                <ThemedText style={[styles.devSectionTitle, { color: theme.primary }]}>
                  通常スタンプ (1〜60)
                </ThemedText>
                <View style={styles.devGrid}>
                  {Object.entries(PANDA_STAMPS).map(([num, src]) => (
                    <View key={num} style={styles.devStampItem}>
                      <View style={[styles.devStampCircle, { borderColor: theme.primary, backgroundColor: theme.backgroundDefault }]}>
                        <Image
                          source={src}
                          style={{ width: DEV_SIZE - 6, height: DEV_SIZE - 6, borderRadius: (DEV_SIZE - 6) / 2 }}
                          resizeMode="cover"
                        />
                      </View>
                      <ThemedText style={[styles.devStampLabel, { color: theme.textSecondary }]} numberOfLines={2}>{getPandaStampName(Number(num))}</ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
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
  specialEmptyInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  specialEmptyLabel: {
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    lineHeight: 11,
  },
  specialEmptyNumber: {
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginTop: 1,
    opacity: 0.85,
  },
  stampMeta: {
    flexDirection: "column",
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
  modalActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
  },
  modalShareBtnText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  modalCloseBtnHalf: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    alignSelf: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full ?? 999,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  devBtnText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#7C3AED",
  },
  devOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  devSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
    paddingBottom: Spacing["3xl"],
  },
  devSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  devSheetTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
  },
  devSheetSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  devScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  devSectionTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  devStampRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  devGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  devStampItem: {
    alignItems: "center",
    gap: 4,
    width: DEV_SIZE + 6,
  },
  devStampCircle: {
    width: DEV_SIZE,
    height: DEV_SIZE,
    borderRadius: DEV_SIZE / 2,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  devStampLabel: {
    fontSize: 9,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
});
