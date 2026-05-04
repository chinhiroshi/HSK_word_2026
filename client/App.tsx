import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, View, Modal, Pressable } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import "@/lib/notifications"; // register notification handler early
import { refreshDailyNotificationsIfEnabled } from "@/lib/notifications";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useOTAUpdate } from "@/hooks/useOTAUpdate";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SprintProvider } from "@/contexts/SprintContext";
import { LanguageProvider, useI18n } from "@/contexts/LanguageContext";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PostHogProvider } from "posthog-react-native";
import {
  initAnalytics,
  setAnalyticsConsent,
  captureScreen,
  getPostHogClient,
} from "@/lib/analytics";

const ONBOARDING_KEY = "@chinese_master_onboarding_complete";
const TUTORIAL_DONE_KEY = "@chinese_master_tutorial_sprint_done";

SplashScreen.preventAutoHideAsync();

export default function App() {
  useOTAUpdate();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [pendingTutorial, setPendingTutorial] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const analyticsConfigured = Boolean(getPostHogClient());
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const previousRouteNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      const isExistingUser = completed === "true";
      // Existing-user protection: never show the onboarding tutorial sprint
      // to anyone who installed before this feature shipped.
      if (isExistingUser) {
        const td = await AsyncStorage.getItem(TUTORIAL_DONE_KEY);
        if (td == null) {
          await AsyncStorage.setItem(TUTORIAL_DONE_KEY, "true");
        }
      }
      setShowOnboarding(!isExistingUser);
    } catch {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    setPendingTutorial(true);
    setShowOnboarding(false);
    // Analytics consent is now opt-out (default granted on first launch via
    // initAnalytics). The consent dialog is intentionally not shown here;
    // users can opt out from ProfileScreen at any time. The dialog component
    // is retained for potential future region-specific (e.g. EU) usage.
  }, []);

  const handleNavStateChange = useCallback(() => {
    const ref = navigationRef.current;
    if (!ref) return;
    const route = ref.getCurrentRoute();
    const currentName = route?.name;
    if (currentName && currentName !== previousRouteNameRef.current) {
      previousRouteNameRef.current = currentName;
      captureScreen(currentName);
    }
  }, []);

  // After onboarding completes, jump to Sprint setup → tutorial practice.
  useEffect(() => {
    if (!pendingTutorial || showOnboarding !== false) return;
    const timer = setTimeout(() => {
      const ref = navigationRef.current;
      if (!ref) return;
      try {
        ref.navigate("Main", {
          screen: "SprintTab",
          params: {
            screen: "SprintSetup",
            params: { fromOnboarding: true },
          },
        });
      } catch {}
      setPendingTutorial(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [pendingTutorial, showOnboarding]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && showOnboarding !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, showOnboarding]);

  // アプリ起動時に格言通知を更新（毎回ランダムな格言に差し替え）
  useEffect(() => {
    refreshDailyNotificationsIfEnabled();
  }, []);

  // 通知タップ時にスプリントタブへ遷移
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!navigationRef.current) return;
      if (data?.screen === "sprint") {
        navigationRef.current.navigate("Main", { screen: "SprintTab" });
      } else if (data?.screen === "study") {
        navigationRef.current.navigate("Main", { screen: "StudyTab" });
      }
    });
    return () => subscription.remove();
  }, []);

  if ((!fontsLoaded && !fontError) || showOnboarding === null) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <LanguageProvider>
              <AnalyticsProvider>
                <SubscriptionProvider>
                  <SprintProvider>
                    {showOnboarding ? (
                      <OnboardingScreen onComplete={handleOnboardingComplete} />
                    ) : (
                      <NavigationContainer
                        ref={navigationRef}
                        onReady={handleNavStateChange}
                        onStateChange={handleNavStateChange}
                      >
                        <RootStackNavigator />
                      </NavigationContainer>
                    )}
                    <AnalyticsConsentDialog
                      visible={showConsent}
                      onDecide={(granted) => {
                        setShowConsent(false);
                        setAnalyticsConsent(granted ? "granted" : "denied").catch(() => {});
                      }}
                    />
                  </SprintProvider>
                </SubscriptionProvider>
              </AnalyticsProvider>
              </LanguageProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const phClient = getPostHogClient();
  if (!phClient) return <>{children}</>;
  return (
    <PostHogProvider
      client={phClient}
      autocapture={{
        captureTouches: true,
        // Screens are tracked manually via NavigationContainer state changes,
        // so disable provider-level screen autocapture to avoid duplicates.
        captureScreens: false,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

function AnalyticsConsentDialog({
  visible,
  onDecide,
}: {
  visible: boolean;
  onDecide: (granted: boolean) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onDecide(false)}>
      <View style={styles.consentOverlay}>
        <View style={[styles.consentCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.consentTitle}>{t("analytics_consent_title")}</ThemedText>
          <ThemedText style={[styles.consentBody, { color: theme.textSecondary }]}>
            {t("analytics_consent_message")}
          </ThemedText>
          <View style={styles.consentRow}>
            <Pressable
              testID="button-analytics-decline"
              onPress={() => onDecide(false)}
              style={[styles.consentBtn, { borderColor: theme.border }]}
            >
              <ThemedText style={[styles.consentBtnText, { color: theme.textSecondary }]}>
                {t("analytics_consent_decline")}
              </ThemedText>
            </Pressable>
            <Pressable
              testID="button-analytics-accept"
              onPress={() => onDecide(true)}
              style={[styles.consentBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <ThemedText style={[styles.consentBtnText, { color: "#FFFFFF" }]}>
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
  root: {
    flex: 1,
  },
  consentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  consentCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  consentTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  consentBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Nunito_400Regular",
  },
  consentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  consentBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  consentBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
