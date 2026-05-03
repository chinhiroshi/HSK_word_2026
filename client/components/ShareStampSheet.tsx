import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { APP_STORE_URL } from "@/constants/links";

interface QuoteData {
  chinese: string;
  japanese?: string;
  source?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  stampImage: any;
  stampLabel: string;
  hskLevel?: number;
  memorizedCount?: number;
  totalCount?: number;
  stampCount?: number;
  quote?: QuoteData | null;
  isSpecial?: boolean;
}

export function ShareStampSheet({
  visible,
  onClose,
  stampImage,
  stampLabel,
  hskLevel,
  memorizedCount,
  totalCount,
  stampCount,
  quote,
  isSpecial,
}: Props) {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [comment, setComment] = useState("");
  const [sharing, setSharing] = useState(false);
  const viewRef = useRef<ViewShot>(null);

  const progressLine =
    hskLevel != null
      ? lang === "en"
        ? `Studying HSK ${hskLevel}`
        : `HSK ${hskLevel}級 学習中`
      : "";
  const memorizedLine =
    memorizedCount != null && totalCount != null
      ? lang === "en"
        ? `Memorized: ${memorizedCount} / ${totalCount} words`
        : `暗記済み: ${memorizedCount} / ${totalCount} 単語`
      : "";
  const stampsLine =
    stampCount != null && stampCount > 0
      ? lang === "en"
        ? `Stamps collected: ${stampCount}`
        : `集めたスタンプ: ${stampCount}個`
      : "";
  const hashtagLine =
    lang === "en"
      ? "#HSKPanda #HSK #LearnChinese"
      : "#HSK単語帳 #HSK #中国語学習";

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    let stableUri: string | null = null;
    try {
      const ref = viewRef.current;
      if (!ref || !ref.capture) {
        await Share.share({ message: buildFallbackMessage() });
        return;
      }
      const tempUri = await ref.capture();
      const message = buildFallbackMessage();

      if (Platform.OS === "web") {
        await Share.share({ message, url: tempUri });
        return;
      }

      // iOS/Android: ViewShot の一時ファイルをキャッシュディレクトリにコピーして安定させる
      const filename = `stamp-share-${Date.now()}.png`;
      stableUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({ from: tempUri, to: stableUri });

      // RN の Share API を使うことで、iOS では画像とタップ可能なリンクテキストの
      // 両方を共有シートに渡せる。Android では message が本文として渡り、URL は
      // 文字列として含まれるためタップ可能になる。
      await Share.share({
        message,
        url: stableUri,
        title: t("share_dialog_title"),
      });
    } catch (e) {
      console.warn("Share failed", e);
      try {
        await Share.share({ message: buildFallbackMessage() });
      } catch {
        // ignore
      }
    } finally {
      setSharing(false);
      if (stableUri) {
        FileSystem.deleteAsync(stableUri, { idempotent: true }).catch(() => {});
      }
      onClose();
    }
  };

  const buildFallbackMessage = () => {
    const parts: string[] = [];
    parts.push(stampLabel);
    if (progressLine) parts.push(progressLine);
    if (memorizedLine) parts.push(memorizedLine);
    if (stampsLine) parts.push(stampsLine);
    if (comment.trim()) parts.push(comment.trim());
    parts.push(hashtagLine);
    parts.push("");
    parts.push(t("share_app_link_label"));
    parts.push(APP_STORE_URL);
    return parts.join("\n");
  };

  const handleClose = () => {
    if (sharing) return;
    setComment("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: theme.backgroundDefault },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={20}
            extraKeyboardSpace={20}
          >
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>
                {t("share_sheet_title")}
              </ThemedText>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                testID="button-share-close"
              >
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ViewShot
              ref={viewRef}
              options={{ format: "png", quality: 0.95 }}
              style={styles.shotWrap}
            >
              <LinearGradient
                colors={
                  isSpecial
                    ? ["#FFF7E6", "#FFE5C4"]
                    : ["#EAF6F4", "#F8F6FF"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareCard}
              >
                <View style={styles.brandRow}>
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.brandIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.brandText}>
                    {lang === "en" ? "HSK Panda" : "HSK単語帳"}
                  </ThemedText>
                </View>

                <View style={styles.stampCircleWrap}>
                  <LinearGradient
                    colors={
                      isSpecial
                        ? ["#FFD700", "#FFA500", "#FF6B35", "#FFD700"]
                        : ["#5B8C85", "#86B5AE", "#5B8C85"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stampRing}
                  >
                    <View style={styles.stampInner}>
                      <Image
                        source={stampImage}
                        style={styles.stampImg}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                </View>

                <ThemedText style={styles.stampTitle}>{stampLabel}</ThemedText>

                <View style={styles.progressBlock}>
                  {progressLine ? (
                    <ThemedText style={styles.progressText}>
                      {progressLine}
                    </ThemedText>
                  ) : null}
                  {memorizedLine ? (
                    <ThemedText style={styles.progressSub}>
                      {memorizedLine}
                    </ThemedText>
                  ) : null}
                  {stampsLine ? (
                    <ThemedText style={styles.progressSub}>
                      {stampsLine}
                    </ThemedText>
                  ) : null}
                </View>

                {quote ? (
                  <View style={styles.quoteBox}>
                    <ThemedText style={styles.quoteZh}>
                      {quote.chinese}
                    </ThemedText>
                    {quote.japanese ? (
                      <ThemedText style={styles.quoteJa}>
                        {quote.japanese}
                      </ThemedText>
                    ) : null}
                    {quote.source ? (
                      <ThemedText style={styles.quoteSource}>
                        — {quote.source}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}

                {comment.trim() ? (
                  <View style={styles.commentBox}>
                    <ThemedText style={styles.commentText}>
                      {comment.trim()}
                    </ThemedText>
                  </View>
                ) : null}
              </LinearGradient>
            </ViewShot>

            <View style={styles.inputWrap}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                {t("share_comment_label")}
              </ThemedText>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t("share_comment_placeholder")}
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={140}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                testID="input-share-comment"
              />
              <ThemedText
                style={[styles.counter, { color: theme.textSecondary }]}
              >
                {comment.length} / 140
              </ThemedText>
            </View>

            <Pressable
              onPress={handleShare}
              disabled={sharing}
              style={[
                styles.shareBtn,
                {
                  backgroundColor: isSpecial
                    ? Colors.light.secondary
                    : theme.primary,
                  opacity: sharing ? 0.6 : 1,
                },
              ]}
              testID="button-share-confirm"
            >
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="share-2" size={18} color="#fff" />
                  <ThemedText style={styles.shareBtnText}>
                    {t("share_action")}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "92%",
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
  },
  shotWrap: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  shareCard: {
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.xs,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  brandText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#374151",
  },
  stampCircleWrap: {
    marginVertical: Spacing.sm,
  },
  stampRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: "center",
    alignItems: "center",
  },
  stampInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  stampImg: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  stampTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    color: "#1F2937",
    marginTop: 4,
  },
  progressBlock: {
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#5B8C85",
  },
  progressSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#4B5563",
  },
  quoteBox: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignSelf: "stretch",
    alignItems: "center",
    gap: 4,
  },
  quoteZh: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 22,
  },
  quoteJa: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 17,
  },
  quoteSource: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B7280",
  },
  commentBox: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignSelf: "stretch",
  },
  commentText: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#1F2937",
    lineHeight: 19,
    textAlign: "center",
  },
  hashtagText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B7280",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  appLinkBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    alignSelf: "stretch",
    alignItems: "center",
    gap: 2,
  },
  appLinkLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#6B7280",
  },
  appLinkUrl: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#5B8C85",
  },
  inputWrap: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  input: {
    minHeight: 64,
    maxHeight: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlignVertical: "top",
  },
  counter: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    textAlign: "right",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
