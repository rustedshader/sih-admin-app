import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Link, router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
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

        {/* Brand row: Left = Trek logo, Right = Uttarakhand emblem */}
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/trek.jpg")}
            style={styles.brandLogoLeft}
            resizeMode="contain"
          />
          <Image
            source={require("@/assets/images/uttarakhand-emblem.webp")}
            style={styles.brandLogoRight}
            resizeMode="contain"
          />
        </View>

        {/* App Title */}
        <Text style={[styles.appTitle, { color: colors.text }]}>SURAKSHIT</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Admin App</Text>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: colors.text + "CC" }]}>Quick actions</Text>

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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16 },

  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "stretch",
    paddingHorizontal: 24,
    paddingTop: 96,
  },

  header: {
    position: "absolute",
    top: 20,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  welcomeText: { fontSize: 13, opacity: 0.6, letterSpacing: 0.5 },
  userNameText: { fontSize: 20, fontWeight: "800", marginTop: 2, letterSpacing: 0.3 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  logoutText: { marginLeft: 6, fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },

  brandRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  brandLogoLeft: { 
    width: 64, 
    height: 64,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  brandLogoRight: { 
    width: 64, 
    height: 64,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  appTitle: {
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 4,
    alignSelf: "center",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.65,
    fontStyle: "italic",
    letterSpacing: 1,
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    opacity: 0.8,
  },

  buttonContainer: { width: "100%", gap: 16 },
  button: {
    padding: 20,
    borderRadius: 20,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonIcon: { marginBottom: 12, opacity: 0.95 },
  buttonText: { 
    color: "white", 
    fontSize: 22, 
    fontWeight: "800", 
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  buttonSubtext: { 
    color: "white", 
    fontSize: 14, 
    opacity: 0.75,
    lineHeight: 20,
  },
});
