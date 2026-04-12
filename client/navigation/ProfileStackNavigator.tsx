import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/contexts/LanguageContext";

export type ProfileStackParamList = {
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: t("profile_header"),
        }}
      />
    </Stack.Navigator>
  );
}
