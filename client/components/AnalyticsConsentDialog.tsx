import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

export function AnalyticsConsentDialog({
  visible,
  onDecide,
  onDismiss,
}: {
  visible: boolean;
  onDecide: (granted: boolean) => void;
  /**
   * Called when the user dismisses the dialog without making an explicit
   * choice (e.g. Android hardware back button). If omitted, dismissal is
   * treated as a decline for backward compatibility with the onboarding
   * flow where a decision is required.
   */
  onDismiss?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const handleRequestClose = () => {
    if (onDismiss) onDismiss();
    else onDecide(false);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.title}>{t("analytics_consent_title")}</ThemedText>
          <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
            {t("analytics_consent_message")}
          </ThemedText>
          <View style={styles.row}>
            <Pressable
              testID="button-analytics-decline"
              onPress={() => onDecide(false)}
              style={[styles.btn, { borderColor: theme.border }]}
            >
              <ThemedText style={[styles.btnText, { color: theme.textSecondary }]}>
                {t("analytics_consent_decline")}
              </ThemedText>
            </Pressable>
            <Pressable
              testID="button-analytics-accept"
              onPress={() => onDecide(true)}
              style={[styles.btn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <ThemedText style={[styles.btnText, { color: "#FFFFFF" }]}>
                {t("analytics_consent_accept")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Nunito_400Regular",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
