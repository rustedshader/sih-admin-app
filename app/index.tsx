import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Link, router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
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
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If not authenticated, return null (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.content}>
        {/* Header with user info and logout */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userNameText, { color: colors.tint }]}>
              {user?.first_name} {user?.last_name}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: colors.text + "30" }]}
            onPress={handleLogout}
          >
            <IconSymbol
              name="rectangle.portrait.and.arrow.right"
              size={20}
              color={colors.text}
            />
            <Text style={[styles.logoutText, { color: colors.text }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Title */}
        <Text style={[styles.appTitle, { color: colors.text }]}>SURAKSHIT</Text>

        <Text style={[styles.subtitle, { color: colors.text }]}>Admin App</Text>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Link href="/saved-routes" asChild>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
            >
              <IconSymbol
                name="folder.fill"
                size={32}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Saved Routes</Text>
              <Text style={styles.buttonSubtext}>
                View and share recorded routes
              </Text>
            </TouchableOpacity>
          </Link>

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
              <Text style={styles.buttonSubtext}>
                Pair with recording devices
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/gps-recording" asChild>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 14,
    opacity: 0.7,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 4,
    fontSize: 14,
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
