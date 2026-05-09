import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { AnalyticsConsentDialog } from "@/components/AnalyticsConsentDialog";
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
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PostHogProvider } from "posthog-react-native";
import {
  initAnalytics,
  setAnalyticsConsent,
  captureScreen,
  getPostHogClient,
  getAnalyticsConsent,
  isExplicitConsentRegion,
} from "@/lib/analytics";
import { loadStampSnapshot, migrateStampSnapshotsIfNeeded } from "@/data/pandaStamps";

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
  // EU/EEA/UK users (GDPR + UK PECR) must explicitly opt in before any
  // non-essential analytics are sent. `pendingConsent` defers showing the
  // dialog until onboarding has finished so the modal does not overlap the
  // onboarding flow. Outside those regions analytics stays opt-out and the
  // dialog never appears.
  const [showConsent, setShowConsent] = useState(false);
  const [pendingConsent, setPendingConsent] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const previousRouteNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      await initAnalytics();
      if (!isExplicitConsentRegion()) return;
      const c = await getAnalyticsConsent();
      if (c === "unknown") setPendingConsent(true);
    })();
  }, []);

  useEffect(() => {
    if (pendingConsent && showOnboarding === false) {
      setShowConsent(true);
      setPendingConsent(false);
    }
  }, [pendingConsent, showOnboarding]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // パンダスタンプの絵柄スナップショットをロード＆既存ユーザー向け移行を実行。
  // 既に獲得済みのスタンプは旧マッピングで固定され、以後HSK級ごとに違う絵柄が表示される。
  useEffect(() => {
    (async () => {
      try {
        await loadStampSnapshot();
        await migrateStampSnapshotsIfNeeded();
      } catch {}
    })();
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
    // Analytics consent: outside EU/EEA/UK we use the opt-out model (default
    // granted via initAnalytics; users can opt out from ProfileScreen). For
    // GDPR/PECR regions the dialog is shown via the pendingConsent effect
    // above once onboarding closes.
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
