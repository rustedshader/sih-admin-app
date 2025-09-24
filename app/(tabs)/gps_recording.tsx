import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { OfflineActivityDropdown } from "../../components/OfflineActivityDropdown";
import { RouteVisualization } from "../../components/RouteVisualization";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useAuth } from "../../contexts/AuthContext";
import { GPSTrackingService } from "../../services/GPSTrackingService";
import { GPSCoordinate, GPSTrackingState } from "../../types/gps";
import { OfflineActivity } from "../../types/offline-activity";

// Helper function to calculate distance between two GPS coordinates
const calculateDistance = (
  coord1: GPSCoordinate,
  coord2: GPSCoordinate
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Calculate total route distance
const calculateTotalDistance = (coordinates: GPSCoordinate[]): number => {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += calculateDistance(coordinates[i - 1], coordinates[i]);
  }
  return totalDistance;
};

export default function GPSRecordingTab() {
  const [gpsTracker] = useState(() => GPSTrackingService.getInstance());
  const [trackingState, setTrackingState] = useState<GPSTrackingState>(
    gpsTracker.getTrackingState()
  );
  const [isExporting, setIsExporting] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<OfflineActivity | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const unsubscribe = gpsTracker.subscribe((state) => {
      setTrackingState(state);
    });

    return unsubscribe;
  }, [gpsTracker]);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/auth/login");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const handleStartRecording = () => {
    if (!selectedActivity) {
      Alert.alert(
        "Select Activity",
        "Please select an offline activity before starting the recording.",
        [{ text: "OK" }]
      );
      return;
    }

    gpsTracker.startTracking(`Recording for: ${selectedActivity.name}`);
    Alert.alert(
      "Recording Started",
      `GPS coordinates will now be recorded for "${selectedActivity.name}".`
    );
  };

  const handleStopRecording = () => {
    gpsTracker.stopTracking();
    const activityName = selectedActivity
      ? selectedActivity.name
      : "Unknown Activity";
    Alert.alert(
      "Recording Stopped",
      `Route recording for "${activityName}" completed.\nTotal points recorded: ${trackingState.totalPoints}`
    );
  };

  const handleExport = async () => {
    if (trackingState.coordinates.length === 0) {
      Alert.alert("No Data", "No GPS coordinates to export.");
      return;
    }

    setIsExporting(true);
    try {
      const activityName = selectedActivity
        ? selectedActivity.name
        : "Unknown Activity";
      await gpsTracker.exportAndShare(activityName);
      Alert.alert(
        "Export Successful",
        `Route data for "${activityName}" has been exported and shared as GeoJSON.`
      );
    } catch (error) {
      Alert.alert(
        "Export Failed",
        "Unable to export GPS data: " + (error as Error).message
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear Data",
      "Are you sure you want to clear all recorded GPS data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            gpsTracker.clearCoordinates();
            Alert.alert(
              "Data Cleared",
              "All GPS coordinates have been cleared."
            );
          },
        },
      ]
    );
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderCurrentLocation = () => {
    if (!trackingState.currentCoordinate) {
      return (
        <View style={styles.locationContainer}>
          <Text style={styles.locationTitle}>Waiting for GPS Data...</Text>
          <Text style={styles.locationSubtitle}>
            Connect to a Bluetooth GPS device first
          </Text>
        </View>
      );
    }

    const coord = trackingState.currentCoordinate;
    return (
      <View style={styles.locationContainer}>
        <Text style={styles.locationTitle}>
          {trackingState.isRecording
            ? "🔴 Recording Route"
            : "📍 Current Location"}
        </Text>
        <Text style={styles.coordinate}>Lat: {coord.latitude.toFixed(6)}</Text>
        <Text style={styles.coordinate}>Lng: {coord.longitude.toFixed(6)}</Text>
        <Text style={styles.timestamp}>
          {coord.timestamp.toLocaleTimeString()}
        </Text>
        {coord.accuracy && (
          <Text style={styles.accuracy}>Accuracy: ±{coord.accuracy}m</Text>
        )}
        {trackingState.isRecording && trackingState.coordinates.length > 1 && (
          <Text style={styles.routeInfo}>
            📏 Route: {trackingState.coordinates.length} points •{" "}
            {calculateTotalDistance(trackingState.coordinates).toFixed(2)} km
          </Text>
        )}
      </View>
    );
  };

  const stats = gpsTracker.getTrackingStats();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <IconSymbol name="chevron.left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Record Route</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            name="rectangle.portrait.and.arrow.right"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {renderCurrentLocation()}

      {/* Offline Activity Selection */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Offline Activity</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the activity you're recording the route for
        </Text>
        <OfflineActivityDropdown
          selectedActivity={selectedActivity}
          onActivitySelect={setSelectedActivity}
          placeholder="Select an offline activity to record route for"
          style={styles.activityDropdown}
        />
        {selectedActivity && (
          <View style={styles.selectedActivityInfo}>
            <Text style={styles.selectedActivityTitle}>Selected Activity:</Text>
            <Text style={styles.selectedActivityName}>
              {selectedActivity.name}
            </Text>
            <Text style={styles.selectedActivityLocation}>
              📍 {selectedActivity.city}, {selectedActivity.state}
            </Text>
            <Text style={styles.selectedActivityDifficulty}>
              🏔️ {selectedActivity.difficulty_level.toUpperCase()} •{" "}
              {selectedActivity.duration} day(s) • {selectedActivity.altitude}m
            </Text>
          </View>
        )}
      </View>

      {/* Route Visualization */}
      {trackingState.coordinates.length > 0 && (
        <RouteVisualization
          coordinates={trackingState.coordinates}
          currentCoordinate={trackingState.currentCoordinate}
          isRecording={trackingState.isRecording}
        />
      )}

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Recording Statistics</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Status:</Text>
          <Text
            style={[
              styles.statsValue,
              { color: trackingState.isRecording ? "#4caf50" : "#ff6347" },
            ]}
          >
            {trackingState.isRecording ? "Recording" : "Stopped"}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Points Recorded:</Text>
          <Text style={styles.statsValue}>{stats.totalPoints}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Duration:</Text>
          <Text style={styles.statsValue}>
            {formatDuration(stats.duration)}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Distance:</Text>
          <Text style={styles.statsValue}>
            {calculateTotalDistance(trackingState.coordinates).toFixed(3)} km
          </Text>
        </View>
        {trackingState.startTime && (
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Started:</Text>
            <Text style={styles.statsValue}>
              {trackingState.startTime.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!trackingState.isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStartRecording}
          >
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStopRecording}
          >
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.exportButton]}
          onPress={handleExport}
          disabled={trackingState.coordinates.length === 0 || isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              Export Route ({trackingState.coordinates.length} points)
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearData}
          disabled={trackingState.coordinates.length === 0}
        >
          <Text style={styles.buttonText}>Clear Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How to Use:</Text>
        <Text style={styles.infoText}>
          1. Connect to a Bluetooth GPS device in the Bluetooth tab
        </Text>
        <Text style={styles.infoText}>
          2. Start recording to begin collecting GPS coordinates
        </Text>
        <Text style={styles.infoText}>3. Export as GeoJSON file when done</Text>
      </View>
    </ScrollView>
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
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 65,
    padding: 8,
    zIndex: 1,
  },
  locationContainer: {
    backgroundColor: "#1e1e1e",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4caf50",
  },
  locationTitle: {
    color: "#4caf50",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  locationSubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
  coordinate: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 5,
    fontFamily: "monospace",
  },
  timestamp: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  accuracy: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
  routeInfo: {
    color: "#2196f3",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "bold",
  },
  statsContainer: {
    backgroundColor: "#1e1e1e",
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  statsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statsLabel: {
    color: "#888",
    fontSize: 16,
  },
  statsValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonContainer: {
    padding: 20,
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#4caf50",
  },
  stopButton: {
    backgroundColor: "#ff6347",
  },
  exportButton: {
    backgroundColor: "#2196f3",
  },
  clearButton: {
    backgroundColor: "#ff9800",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoContainer: {
    backgroundColor: "#1e1e1e",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 5,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  sectionSubtitle: {
    color: "#888",
    fontSize: 14,
    marginBottom: 15,
  },
  activityDropdown: {
    marginBottom: 15,
  },
  selectedActivityInfo: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  selectedActivityTitle: {
    color: "#4caf50",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  selectedActivityName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  selectedActivityLocation: {
    color: "#888",
    fontSize: 14,
    marginBottom: 3,
  },
  selectedActivityDifficulty: {
    color: "#888",
    fontSize: 14,
  },
});
