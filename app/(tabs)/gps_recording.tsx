import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAuth } from "../../contexts/AuthContext";

export default function GPSRecordingTab() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigateToGPSRecording = () => {
    router.push("/gps-recording");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <IconSymbol name="chevron.left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>GPS Recording</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            name="rectangle.portrait.and.arrow.right"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <IconSymbol name="location.fill" size={80} color="#4caf50" />
          <Text style={styles.cardTitle}>GPS Route Recording</Text>
          <Text style={styles.cardDescription}>
            Record GPS routes for offline activities using either your mobile
            device's GPS or an external Bluetooth GPS device.
          </Text>

          <TouchableOpacity
            style={styles.recordButton}
            onPress={navigateToGPSRecording}
          >
            <IconSymbol name="play.circle.fill" size={24} color="#fff" />
            <Text style={styles.recordButtonText}>Start GPS Recording</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <View style={styles.feature}>
            <IconSymbol name="location.circle.fill" size={20} color="#4caf50" />
            <Text style={styles.featureText}>Real-time GPS tracking</Text>
          </View>
          <View style={styles.feature}>
            <IconSymbol name="map.fill" size={20} color="#4caf50" />
            <Text style={styles.featureText}>
              Interactive map visualization
            </Text>
          </View>
          <View style={styles.feature}>
            <IconSymbol name="iphone" size={20} color="#4caf50" />
            <Text style={styles.featureText}>
              Mobile GPS or Bluetooth GPS support
            </Text>
          </View>
          <View style={styles.feature}>
            <IconSymbol
              name="square.and.arrow.up.fill"
              size={20}
              color="#4caf50"
            />
            <Text style={styles.featureText}>Export routes as GeoJSON</Text>
          </View>
          <View style={styles.feature}>
            <IconSymbol
              name="list.bullet.rectangle"
              size={20}
              color="#4caf50"
            />
            <Text style={styles.featureText}>
              Link routes to offline activities
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 65,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 5,
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 65,
    zIndex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1e1e1e",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#4caf50",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  cardDescription: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: "#4caf50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  featuresContainer: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 15,
  },
  featuresTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    color: "#888",
    fontSize: 16,
    flex: 1,
  },
});
