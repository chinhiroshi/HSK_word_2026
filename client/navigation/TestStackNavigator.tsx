import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TestSelectScreen from "@/screens/TestSelectScreen";
import TestScreen from "@/screens/TestScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/contexts/LanguageContext";

export type TestStackParamList = {
  TestSelect: undefined;
  Test: { testType: "word" | "sentence" };
};

const Stack = createNativeStackNavigator<TestStackParamList>();

export default function TestStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TestSelect"
        component={TestSelectScreen}
        options={{
          headerTitle: t("test_select_header"),
        }}
      />
      <Stack.Screen
        name="Test"
        component={TestScreen}
      />
    </Stack.Navigator>
  );
}
