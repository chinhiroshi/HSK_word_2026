import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Switch, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useI18n } from "@/contexts/LanguageContext";
import { DEFAULT_NOTIF_HOUR, DEFAULT_NOTIF_MINUTE } from "@/lib/notifications";

interface NotificationReminderCardProps {
  title: string;
  description: string;
  infoText: string;
  iconName: keyof typeof Feather.glyphMap;
  accentColor?: string;
  testIdPrefix: string;
  getEnabled: () => Promise<boolean>;
  getTime: () => Promise<{ hour: number; minute: number }>;
  enable: (hour: number, minute: number) => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<boolean>;
}

export function NotificationReminderCard({
  title,
  description,
  infoText,
  iconName,
  accentColor,
  testIdPrefix,
  getEnabled,
  getTime,
  enable,
  disable,
  sendTest,
}: NotificationReminderCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const accent = accentColor ?? theme.primary;

  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(DEFAULT_NOTIF_HOUR);
  const [minute, setMinute] = useState(DEFAULT_NOTIF_MINUTE);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const on = await getEnabled();
      setEnabled(on);
      const time = await getTime();
      setHour(time.hour);
      setMinute(time.minute);
    } catch {
      // Ignore
    } finally {
      setLoaded(true);
    }
  }, [getEnabled, getTime]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (value: boolean) => {
    if (!loaded) return;
    if (Platform.OS === "web") {
      Alert.alert(title, t("notif_web_msg"));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const ok = await enable(hour, minute);
      if (ok) {
        setEnabled(true);
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        Alert.alert(t("notif_set_title"), `${timeStr}`);
      } else {
        Alert.alert(t("notif_error_title"), t("notif_web_msg"));
      }
    } else {
      await disable();
      setEnabled(false);
    }
  };

  const handleTimeChange = async (_: any, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS === "android") setShowTimePicker(false);
      return;
    }
    const newHour = selectedDate.getHours();
    const newMinute = selectedDate.getMinutes();
    setHour(newHour);
    setMinute(newMinute);
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (enabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await enable(newHour, newMinute);
      }
    }
  };

  const handleIOSPickerDone = async () => {
    setShowTimePicker(false);
    if (enabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await enable(hour, minute);
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
            name={enabled ? iconName : "bell-off"}
            size={20}
            color={enabled ? accent : theme.textSecondary}
          />
        </View>
        <View style={styles.textWrap}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={[styles.desc, { color: theme.textSecondary }]}>
            {description}
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
          {infoText}
        </ThemedText>
      </View>

      {enabled ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            testID={`button-${testIdPrefix}-time`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTimePicker(true);
            }}
            style={styles.timeRow}
          >
            <Feather name="clock" size={16} color={accent} />
            <ThemedText style={[styles.timeLabel, { color: theme.text }]}>
              {t("notif_time")}
            </ThemedText>
            <ThemedText style={[styles.timeValue, { color: accent }]}>
              {`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
            </ThemedText>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </Pressable>

          {showTimePicker && Platform.OS === "ios" ? (
            <View style={styles.iOSPickerWrapper}>
              <DateTimePicker
                value={(() => {
                  const d = new Date();
                  d.setHours(hour, minute, 0, 0);
                  return d;
                })()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                locale="ja-JP"
              />
              <Pressable
                onPress={handleIOSPickerDone}
                style={[styles.iOSPickerDone, { backgroundColor: accent }]}
              >
                <ThemedText style={styles.iOSPickerDoneText}>{t("done")}</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {showTimePicker && Platform.OS === "android" ? (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                d.setHours(hour, minute, 0, 0);
                return d;
              })()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          ) : null}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            testID={`button-${testIdPrefix}-test`}
            onPress={handleSendTest}
            style={styles.timeRow}
          >
            <Feather
              name="send"
              size={16}
              color={testSent ? Colors.light.success : accent}
            />
            <ThemedText style={[styles.timeLabel, { color: theme.text, flex: 1 }]}>
              {t("send_test_notif")}
            </ThemedText>
            <ThemedText
              style={[
                styles.timeValue,
                {
                  color: testSent ? Colors.light.success : theme.textSecondary,
                  fontSize: 12,
                },
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
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timeLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    flex: 1,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  iOSPickerWrapper: {
    alignItems: "center",
  },
  iOSPickerDone: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  iOSPickerDoneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
});
