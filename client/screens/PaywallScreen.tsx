import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, Platform } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getApiUrl } from "@/lib/query-client";
import { useI18n } from "@/contexts/LanguageContext";
import { capture as captureAnalytics } from "@/lib/analytics";

const STICKY_BAR_HEIGHT = 156;

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

  const [paywallShownLogged, setPaywallShownLogged] = useState(false);
  useEffect(() => {
    if (paywallShownLogged) return;
    if (loading) return;
    setPaywallShownLogged(true);
    captureAnalytics("paywall_shown", {
      price_string: priceString,
      offering: monthlyPackage?.offeringIdentifier,
      package_type: monthlyPackage?.packageType,
    });
  }, [loading, paywallShownLogged, priceString, monthlyPackage]);

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await purchaseSubscription(monthlyPackage);
      if (result.success) {
        captureAnalytics("subscription_started", {
          price_string: priceString,
          package_type: monthlyPackage?.packageType,
          source: "paywall",
        });
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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + STICKY_BAR_HEIGHT + Spacing.xl,
          },
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
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}
      >
        <View style={styles.priceLine}>
          <ThemedText style={styles.priceLineAmount}>{priceString}</ThemedText>
          <ThemedText style={[styles.priceLinePeriod, { color: theme.textSecondary }]}>
            {t("paywall_per_month")}
          </ThemedText>
          <View style={[styles.priceLineDot, { backgroundColor: theme.textSecondary }]} />
          <ThemedText style={[styles.priceLineNote, { color: theme.textSecondary }]}>
            {t("paywall_cancel_anytime")}
          </ThemedText>
        </View>

        <Pressable
          testID="button-subscribe"
          style={({ pressed }) => [
            styles.subscribeButton,
            {
              backgroundColor: theme.primary,
              opacity: purchasing ? 0.7 : pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
              shadowColor: theme.primary,
            },
          ]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.subscribeButtonInner}>
              <ThemedText style={styles.subscribeButtonText}>
                {t("paywall_subscribe")}
              </ThemedText>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <Pressable
          testID="button-restore"
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
          hitSlop={8}
        >
          {restoring ? (
            <ActivityIndicator color={theme.primary} size="small" />
          ) : (
            <ThemedText style={[styles.restoreButtonText, { color: theme.textSecondary }]}>
              {t("paywall_restore")}
            </ThemedText>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
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
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  priceLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  priceLineAmount: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
  },
  priceLinePeriod: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginLeft: 2,
  },
  priceLineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.sm,
    alignSelf: "center",
    opacity: 0.5,
  },
  priceLineNote: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  subscribeButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  subscribeButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  restoreButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  restoreButtonText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    textDecorationLine: "underline" as const,
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
