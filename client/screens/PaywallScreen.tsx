import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, Platform } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getApiUrl } from "@/lib/query-client";
import { useI18n } from "@/contexts/LanguageContext";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { purchaseSubscription, restorePurchase, isPremium, availablePackages, loading, initError } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const FEATURES = [
    { icon: "book-open" as const, title: t("paywall_feature_all_words"), desc: t("paywall_feature_all_words_desc") },
    { icon: "headphones" as const, title: t("paywall_feature_audio"), desc: t("paywall_feature_audio_desc") },
    { icon: "play-circle" as const, title: t("paywall_feature_playback"), desc: t("paywall_feature_playback_desc") },
    { icon: "check-circle" as const, title: t("paywall_feature_tracking"), desc: t("paywall_feature_tracking_desc") },
  ];

  const monthlyPackage = availablePackages.find(
    (pkg) => pkg.packageType === "MONTHLY"
  ) || availablePackages[0];

  const priceString = monthlyPackage?.product?.priceString || "¥380";

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await purchaseSubscription(monthlyPackage);
      if (result.success) {
        navigation.goBack();
      } else if (result.cancelled) {
      } else if (result.error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(result.error);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await restorePurchase();
      if (result.success) {
        setSuccessMessage(t("paywall_restored"));
        setTimeout(() => navigation.goBack(), 1500);
      } else if (result.error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(result.error);
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.heroSection}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}20` }]}>
          <Feather name="unlock" size={40} color={theme.primary} />
        </View>
        <ThemedText style={styles.heroTitle}>
          {t("paywall_hero_title")}
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          {t("paywall_hero_subtitle")}
        </ThemedText>
      </View>

      <View style={styles.featuresSection}>
        {FEATURES.map((feature, index) => (
          <View
            key={index}
            style={[
              styles.featureRow,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name={feature.icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.featureText}>
              <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
              <ThemedText style={[styles.featureDesc, { color: theme.textSecondary }]}>
                {feature.desc}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      {initError && Platform.OS !== "web" && !Constants.appOwnership ? (
        <View style={[styles.errorBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <ThemedText style={styles.errorBannerText}>{initError}</ThemedText>
        </View>
      ) : null}

      <View style={styles.priceSection}>
        <View
          style={[
            styles.priceCard,
            { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          <ThemedText style={styles.priceLabel}>{t("paywall_monthly")}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceAmount}>{priceString}</ThemedText>
            <ThemedText style={styles.pricePeriod}>{t("paywall_per_month")}</ThemedText>
          </View>
          <ThemedText style={styles.priceNote}>
            {t("paywall_cancel_anytime")}
          </ThemedText>
        </View>
      </View>

      <Pressable
        testID="button-subscribe"
        style={[styles.subscribeButton, { backgroundColor: theme.primary, opacity: purchasing ? 0.7 : 1 }]}
        onPress={handlePurchase}
        disabled={purchasing}
      >
        {purchasing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.subscribeButtonText}>
            {t("paywall_subscribe")}
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        testID="button-restore"
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color={theme.primary} size="small" />
        ) : (
          <ThemedText style={[styles.restoreButtonText, { color: theme.primary }]}>
            {t("paywall_restore")}
          </ThemedText>
        )}
      </Pressable>

      <ThemedText style={[styles.disclaimer, { color: theme.textSecondary }]}>
        {t("paywall_disclaimer")}
      </ThemedText>

      <View style={styles.legalLinks}>
        <Pressable
          testID="link-privacy-policy"
          onPress={async () => {
            try {
              const url = new URL("/privacy-policy", getApiUrl()).toString();
              await WebBrowser.openBrowserAsync(url);
            } catch {}
          }}
        >
          <ThemedText style={[styles.legalLinkText, { color: theme.primary }]}>
            {t("privacy_policy")}
          </ThemedText>
        </Pressable>
        <ThemedText style={[styles.legalSeparator, { color: theme.textSecondary }]}>|</ThemedText>
        <Pressable
          testID="link-terms-of-use"
          onPress={async () => {
            try {
              const url = new URL("/terms", getApiUrl()).toString();
              await WebBrowser.openBrowserAsync(url);
            } catch {}
          }}
        >
          <ThemedText style={[styles.legalLinkText, { color: theme.primary }]}>
            {t("terms_of_use")}
          </ThemedText>
        </Pressable>
      </View>

      <Modal
        visible={errorMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="alert-triangle" size={28} color="#DC2626" />
            </View>
            <ThemedText style={styles.modalTitle}>{t("paywall_error_title")}</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {errorMessage}
            </ThemedText>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => setErrorMessage(null)}
            >
              <ThemedText style={styles.modalButtonText}>{t("close")}</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={successMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="check-circle" size={28} color="#059669" />
            </View>
            <ThemedText style={styles.modalTitle}>{t("done")}</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {successMessage}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  featuresSection: {
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    lineHeight: 18,
  },
  priceSection: {
    marginBottom: Spacing.xl,
  },
  priceCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xs,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  subscribeButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  restoreButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  legalLinkText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    textDecorationLine: "underline" as const,
  },
  legalSeparator: {
    fontSize: 13,
    marginHorizontal: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  modalButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
});
