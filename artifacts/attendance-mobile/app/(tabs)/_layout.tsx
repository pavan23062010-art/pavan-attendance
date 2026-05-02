import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import PavanFAB from "@/components/PavanFAB";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="attendance">
        <Icon sf={{ default: "checkmark.square", selected: "checkmark.square.fill" }} />
        <Label>Attendance</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="report">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Report</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="students">
        <Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
        <Label>Students</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gear", selected: "gear" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { currentUser } = useApp();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (!currentUser) router.replace("/");
  }, [currentUser]);

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
          paddingBottom: isWeb ? 34 : 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={22} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="checkmark.square" tintColor={color} size={22} /> : <Feather name="check-square" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.bar" tintColor={color} size={22} /> : <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Students",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.3" tintColor={color} size={22} /> : <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="gear" tintColor={color} size={22} /> : <Feather name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
    <PavanFAB />
    </View>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
