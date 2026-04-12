import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudyScreen from "@/screens/StudyScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/contexts/LanguageContext";

export type StudyStackParamList = {
  Study: undefined;
};

const Stack = createNativeStackNavigator<StudyStackParamList>();

export default function StudyStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Study"
        component={StudyScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("study_header")} />,
        }}
      />
    </Stack.Navigator>
  );
}
