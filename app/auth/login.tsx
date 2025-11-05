import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useColorScheme } from "../../hooks/use-color-scheme";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      setIsLoading(true);
      await login({ username: username.trim(), password });
      // Explicit navigation after successful login
      router.replace("/");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error instanceof Error
          ? error.message
          : "Please check your credentials and try again"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Uttarakhand Emblem */}
            <View style={styles.emblemContainer}>
              <Image
                source={require("../../assets/images/uttarakhand-emblem.webp")}
                style={styles.emblem}
                resizeMode="contain"
              />
            </View>

            {/* App Title */}
            <Text style={[styles.appTitle, { color: colors.text }]}>
              SURAKSHIT
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Admin App
            </Text>

            {/* Login Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Username/Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "30",
                      color: colors.text,
                    },
                  ]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username or email"
                  placeholderTextColor={colors.text + "60"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Password
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "30",
                      color: colors.text,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={colors.text + "60"}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: colors.tint },
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={[styles.infoText, { color: colors.text + "80" }]}>
                Admin access required
              </Text>
              <Text style={[styles.infoSubtext, { color: colors.text + "60" }]}>
                Contact system administrator for credentials
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emblemContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  emblem: {
    width: 96,
    height: 96,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 3,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    marginBottom: 64,
    opacity: 0.65,
    fontStyle: "italic",
    letterSpacing: 1,
  },
  form: {
    width: "100%",
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  infoContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  infoSubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
