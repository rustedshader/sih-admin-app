import { Tabs } from "expo-router";
import React from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarStyle: { display: "none" }, // Hide the tab bar
      }}
    >
      <Tabs.Screen
        name="blue_test"
        options={{
          title: "Bluetooth",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bolt.horizontal.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gps_recording"
        options={{
          title: "GPS Recording",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="location.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
