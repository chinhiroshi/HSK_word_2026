import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useI18n } from "@/contexts/LanguageContext";
import { Switch } from "react-native";

interface ForgettingReminderCardProps {
  testIdPrefix: string;
  getEnabled: () => Promise<boolean>;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<boolean>;
}

export function ForgettingReminderCard({
  testIdPrefix,
  getEnabled,
  enable,
  disable,
  sendTest,
}: ForgettingReminderCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const accent = theme.primary;

  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const on = await getEnabled();
      setEnabled(on);
    } catch {
    } finally {
      setLoaded(true);
    }
  }, [getEnabled]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (value: boolean) => {
    if (!loaded) return;
    if (Platform.OS === "web") {
      Alert.alert(t("forgetting_reminder_title"), t("notif_web_msg"));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const ok = await enable();
      if (ok) {
        setEnabled(true);
        Alert.alert(t("forgetting_reminder_title"), t("forgetting_reminder_36h_sent"));
      } else {
        Alert.alert(t("notif_error_title"), t("notif_web_msg"));
      }
    } else {
      await disable();
      setEnabled(false);
    }
  };

  const handleSendTest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await sendTest();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 6000);
    } else {
      Alert.alert(t("notif_error_title"), t("notif_web_msg"));
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: enabled ? accent + "15" : theme.textSecondary + "12" },
          ]}
        >
          <Feather
            name={enabled ? "refresh-cw" : "bell-off"}
            size={20}
            color={enabled ? accent : theme.textSecondary}
          />
        </View>
        <View style={styles.textWrap}>
          <ThemedText style={styles.title}>{t("forgetting_reminder_title")}</ThemedText>
          <ThemedText style={[styles.desc, { color: theme.textSecondary }]}>
            {t("forgetting_reminder_desc")}
          </ThemedText>
        </View>
        <Switch
          testID={`switch-${testIdPrefix}`}
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: theme.border, true: accent + "80" }}
          thumbColor={enabled ? accent : theme.textSecondary}
        />
      </View>

      <View
        style={[
          styles.infoBox,
          { backgroundColor: theme.border + "30", borderColor: theme.border },
        ]}
      >
        <Feather name="info" size={13} color={theme.textSecondary} />
        <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
          {t("forgetting_reminder_info")}
        </ThemedText>
      </View>

      {enabled ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.scheduleRow}>
            <Feather name="clock" size={14} color={accent} />
            <ThemedText style={[styles.scheduleText, { color: theme.textSecondary }]}>
              {t("forgetting_reminder_36h_sent")}
            </ThemedText>
          </View>

          <View style={styles.scheduleRow}>
            <Feather name="repeat" size={14} color={accent} />
            <ThemedText style={[styles.scheduleText, { color: theme.textSecondary }]}>
              {t("forgetting_reminder_2w_sent")}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            testID={`button-${testIdPrefix}-test`}
            onPress={handleSendTest}
            style={styles.testRow}
          >
            <Feather
              name="send"
              size={16}
              color={testSent ? Colors.light.success : accent}
            />
            <ThemedText style={[styles.testLabel, { color: theme.text, flex: 1 }]}>
              {t("send_test_notif")}
            </ThemedText>
            <ThemedText
              style={[
                styles.testValue,
                { color: testSent ? Colors.light.success : theme.textSecondary, fontSize: 12 },
              ]}
            >
              {testSent ? t("test_notif_sent") : t("test_notif_hint")}
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  infoText: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  scheduleText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  testLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  testValue: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
});
