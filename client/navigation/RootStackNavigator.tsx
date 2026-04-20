import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import WordDetailScreen from "@/screens/WordDetailScreen";
import WordListScreen from "@/screens/WordListScreen";
import AudioWordListScreen from "@/screens/AudioWordListScreen";
import UnmemorizedListScreen from "@/screens/UnmemorizedListScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  WordDetail: { wordId: string };
  WordList: { startIndex: number; endIndex: number };
  AudioWordList: { startIndex: number; endIndex: number };
  UnmemorizedList: { type: "text" | "audio" };
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WordDetail"
        component={WordDetailScreen}
        options={{
          presentation: "card",
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="WordList"
        component={WordListScreen}
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="AudioWordList"
        component={AudioWordListScreen}
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="UnmemorizedList"
        component={UnmemorizedListScreen}
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: "modal",
          headerTitle: "",
        }}
      />
    </Stack.Navigator>
  );
}
