import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Link } from "expo-router";
import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomePage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.content}>
        {/* App Title */}
        <Text style={[styles.appTitle, { color: colors.text }]}>SURAKSHIT</Text>

        <Text style={[styles.subtitle, { color: colors.text }]}>
          Your Safety Companion
        </Text>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Link href="/(tabs)/blue_test" asChild>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
            >
              <IconSymbol
                name="bolt.horizontal.fill"
                size={32}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Connect Bluetooth</Text>
              <Text style={styles.buttonSubtext}>Pair with safety devices</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(tabs)/gps_recording" asChild>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
            >
              <IconSymbol
                name="location.fill"
                size={32}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Record Route</Text>
              <Text style={styles.buttonSubtext}>
                Create safe paths for users
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 80,
    opacity: 0.7,
    fontStyle: "italic",
  },
  buttonContainer: {
    width: "100%",
    gap: 24,
  },
  button: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIcon: {
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonSubtext: {
    color: "white",
    fontSize: 14,
    opacity: 0.8,
  },
});
