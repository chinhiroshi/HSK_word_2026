import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SprintProvider } from "@/contexts/SprintContext";

const ONBOARDING_KEY = "@chinese_master_onboarding_complete";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== "true");
    } catch {
      setShowOnboarding(true);
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
                    <NavigationContainer>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
