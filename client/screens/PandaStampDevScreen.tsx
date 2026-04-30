import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  useWindowDimensions,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PANDA_STAMPS, PANDA_SPECIAL, TUTORIAL_STAMP } from "@/data/pandaStamps";

const NUM_COLUMNS = 3;
const STAMP_COUNT = Object.keys(PANDA_STAMPS).length;

type StampItem = {
  key: string;
  label: string;
  source: any;
  highlight?: "tutorial" | "special";
};

export default function PandaStampDevScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [selected, setSelected] = useState<StampItem | null>(null);

  const data = useMemo<StampItem[]>(() => {
    const items: StampItem[] = [];
    items.push({
      key: "tutorial",
      label: "Tutorial",
      source: TUTORIAL_STAMP,
      highlight: "tutorial",
    });
    items.push({
      key: "special",
      label: "Special",
      source: PANDA_SPECIAL,
      highlight: "special",
    });
    for (let i = 1; i <= STAMP_COUNT; i += 1) {
      items.push({
        key: `n-${i}`,
        label: `No.${i}`,
        source: PANDA_STAMPS[i],
      });
    }
    return items;
  }, []);

  const tileSize = useMemo(() => {
    const totalGap = Spacing.md * (NUM_COLUMNS + 1);
    return (windowWidth - totalGap) / NUM_COLUMNS;
  }, [windowWidth]);

  const renderItem = ({ item }: { item: StampItem }) => {
    const borderColor =
      item.highlight === "tutorial"
        ? theme.secondary
        : item.highlight === "special"
          ? theme.primary
          : theme.border;

    return (
      <Pressable
        testID={`button-stamp-${item.key}`}
        accessibilityRole="button"
        accessibilityLabel={`パンダスタンプ ${item.label}`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelected(item);
        }}
        style={[
          styles.tile,
          {
            width: tileSize,
            backgroundColor: theme.backgroundDefault,
            borderColor,
          },
        ]}
      >
        <Image
          source={item.source}
          style={{ width: tileSize - Spacing.md * 2, height: tileSize - Spacing.md * 2 }}
          contentFit="contain"
        />
        <ThemedText
          style={[
            styles.tileLabel,
            { color: item.highlight ? borderColor : theme.textSecondary },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={
          <View style={styles.summary}>
            <ThemedText style={[styles.summaryTitle, { color: theme.text }]}>
              パンダスタンプ一覧
            </ThemedText>
            <ThemedText style={[styles.summarySub, { color: theme.textSecondary }]}>
              全 {data.length} 種類 (Tutorial + Special + No.1〜{STAMP_COUNT})
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selected ? (
              <>
                <View style={styles.modalHeader}>
                  <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                    {selected.label}
                  </ThemedText>
                  <Pressable
                    testID="button-close-stamp-modal"
                    accessibilityRole="button"
                    accessibilityLabel="閉じる"
                    onPress={() => setSelected(null)}
                    hitSlop={12}
                  >
                    <Feather name="x" size={22} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <Image
                  source={selected.source}
                  style={styles.modalImage}
                  contentFit="contain"
                />
                <ThemedText style={[styles.modalCaption, { color: theme.textSecondary }]}>
                  {selected.highlight === "tutorial"
                    ? "オンボーディング初回スプリント完了で獲得"
                    : selected.highlight === "special"
                      ? "Day 7 テスト合格などで獲得する特別スタンプ"
                      : "通常スタンプ (cellIndex に応じて割り当て)"}
                </ThemedText>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  columnWrapper: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summary: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  tile: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  tileLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  modalImage: {
    width: 260,
    height: 260,
    marginVertical: Spacing.sm,
  },
  modalCaption: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
