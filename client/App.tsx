import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import "@/lib/notifications"; // register notification handler early
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, getApiUrl } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SprintProvider } from "@/contexts/SprintContext";
import UpdateModal from "@/components/UpdateModal";

const ONBOARDING_KEY = "@chinese_master_onboarding_complete";

SplashScreen.preventAutoHideAsync();

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface VersionInfo {
  latest: string;
  minimum: string;
  storeUrl: { ios: string; android: string };
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const [updateInfo, setUpdateInfo] = useState<{
    visible: boolean;
    required: boolean;
    latestVersion: string;
    storeUrl: { ios: string; android: string };
  } | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
    checkForUpdate();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== "true");
    } catch {
      setShowOnboarding(true);
    }
  };

  const checkForUpdate = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/version", baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data: VersionInfo = await res.json();
      const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

      const isBelow = (a: string, b: string) => compareSemver(a, b) < 0;

      if (isBelow(currentVersion, data.minimum)) {
        setUpdateInfo({
          visible: true,
          required: true,
          latestVersion: data.latest,
          storeUrl: data.storeUrl,
        });
      } else if (isBelow(currentVersion, data.latest)) {
        setUpdateInfo({
          visible: true,
          required: false,
          latestVersion: data.latest,
          storeUrl: data.storeUrl,
        });
      }
    } catch {
    }
  };

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && showOnboarding !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, showOnboarding]);

  // 通知タップ時にスプリントタブへ遷移
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === "sprint" && navigationRef.current) {
        navigationRef.current.navigate("Main", { screen: "SprintTab" });
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
              <SubscriptionProvider>
                <SprintProvider>
                  {showOnboarding ? (
                    <OnboardingScreen onComplete={handleOnboardingComplete} />
                  ) : (
                    <NavigationContainer ref={navigationRef}>
                      <RootStackNavigator />
                    </NavigationContainer>
                  )}
                </SprintProvider>
              </SubscriptionProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
      {updateInfo && (
        <UpdateModal
          visible={updateInfo.visible}
          required={updateInfo.required}
          latestVersion={updateInfo.latestVersion}
          storeUrl={updateInfo.storeUrl}
          onDismiss={() => setUpdateInfo((prev) => prev ? { ...prev, visible: false } : null)}
        />
      )}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
