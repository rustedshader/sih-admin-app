import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
import { OfflineActivityDropdown } from "../components/OfflineActivityDropdown";
import { IconSymbol } from "../components/ui/icon-symbol";
import { useAuth } from "../contexts/AuthContext";
import { GPSTrackingService } from "../services/GPSTrackingService";
import {
  hybridGPSService,
  HybridGPSService,
} from "../services/HybridGPSService";
import { MobileGPSService } from "../services/MobileGPSService";
import RouteService from "../services/RouteService";
import { GPSCoordinate, GPSTrackingState } from "../types/gps";
import { OfflineActivity } from "../types/offline-activity";

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

export default function GPSRecordingScreen() {
  const [gpsTracker] = useState(() => GPSTrackingService.getInstance());
  const [mobileGPS] = useState(() => MobileGPSService.getInstance());
  const [routeService] = useState(() => RouteService.getInstance());
  const [trackingState, setTrackingState] = useState<GPSTrackingState>(
    gpsTracker.getTrackingState()
  );
  const [selectedActivity, setSelectedActivity] =
    useState<OfflineActivity | null>(null);
  const [useMobileGPS, setUseMobileGPS] = useState(false);
  const [mobileGPSCoordinates, setMobileGPSCoordinates] = useState<
    GPSCoordinate[]
  >([]);
  const [currentMobileCoordinate, setCurrentMobileCoordinate] =
    useState<GPSCoordinate | null>(null);
  const [hybridCoordinates, setHybridCoordinates] = useState<GPSCoordinate[]>(
    []
  );
  const [sensorsAvailable, setSensorsAvailable] = useState<{
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  }>({ accelerometer: false, gyroscope: false, magnetometer: false });
  const [isUploadingRoute, setIsUploadingRoute] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const unsubscribe = gpsTracker.subscribe((state) => {
      setTrackingState(state);
    });

    return unsubscribe;
  }, [gpsTracker]);

  // Get initial location when mobile GPS is selected
  useEffect(() => {
    if (useMobileGPS && !currentMobileCoordinate) {
      const getInitialLocation = async () => {
        try {
          const location = await mobileGPS.getCurrentLocation();
          setCurrentMobileCoordinate(location);
        } catch (error) {
          console.error("Failed to get initial mobile GPS location:", error);

          // Show user-friendly error message
          if (error instanceof Error && error.message.includes("permissions")) {
            Alert.alert(
              "Location Permission Required",
              "To use Mobile GPS, please grant location permissions in your device settings.\n\nYou can:\n1. Switch to Bluetooth GPS instead, or\n2. Enable location permissions and try again",
              [
                {
                  text: "Switch to Bluetooth GPS",
                  onPress: () => setUseMobileGPS(false),
                },
                { text: "OK" },
              ]
            );
          } else {
            Alert.alert(
              "Mobile GPS Error",
              "Failed to get location from Mobile GPS. Please check if location services are enabled.",
              [
                {
                  text: "Switch to Bluetooth GPS",
                  onPress: () => setUseMobileGPS(false),
                },
                { text: "Retry", onPress: getInitialLocation },
                { text: "Cancel" },
              ]
            );
          }
        }
      };

      getInitialLocation();
    }
  }, [useMobileGPS, mobileGPS, currentMobileCoordinate]);

  // Check sensor availability on component mount
  useEffect(() => {
    const checkSensors = async () => {
      const availability = await HybridGPSService.checkSensorAvailability();
      setSensorsAvailable(availability);
      console.log("Sensor availability:", availability);
    };
    checkSensors();
  }, []);

  // Save recorded route to AsyncStorage and upload to backend
  const saveRecordedRoute = async () => {
    try {
      let coordinates: GPSCoordinate[];
      let sourceName: string;
      let sourceIcon: string;

      if (useMobileGPS) {
        coordinates =
          hybridCoordinates.length > 0
            ? hybridCoordinates
            : mobileGPSCoordinates;
        sourceName = "Mobile GPS + Sensors";
        sourceIcon = "📱";
      } else {
        coordinates =
          hybridCoordinates.length > 0
            ? hybridCoordinates
            : trackingState.coordinates;
        sourceName = "Bluetooth GPS + Sensors";
        sourceIcon = "🔗";
      }

      if (coordinates.length === 0 || !selectedActivity) {
        Alert.alert(
          "No Data to Save",
          "No GPS coordinates were recorded. Please ensure GPS is working and try again."
        );
        return;
      }

      const routeData = {
        id: Date.now().toString(),
        activityName: selectedActivity.name,
        activityCity: selectedActivity.city,
        activityState: selectedActivity.state,
        sourceName,
        sourceIcon,
        coordinates,
        pointsRecorded: coordinates.length,
        totalDistance: calculateTotalDistance(coordinates),
        recordedAt: new Date().toISOString(),
      };

      // Get existing routes
      const existingRoutesJson = await AsyncStorage.getItem("recorded_routes");
      const existingRoutes = existingRoutesJson
        ? JSON.parse(existingRoutesJson)
        : [];

      // Add new route
      existingRoutes.unshift(routeData);

      // Keep only last 50 routes to avoid storage issues
      const limitedRoutes = existingRoutes.slice(0, 50);

      // Save back to storage
      await AsyncStorage.setItem(
        "recorded_routes",
        JSON.stringify(limitedRoutes)
      );

      console.log("Route saved locally:", routeData.id);

      // Upload route to backend
      setIsUploadingRoute(true);
      try {
        const uploadResult = await routeService.uploadRoute(
          selectedActivity.id,
          coordinates
        );

        if (uploadResult.success) {
          console.log("Route uploaded to backend successfully");
          Alert.alert(
            "Success! 🎉",
            `Route for "${selectedActivity.name}" has been saved and uploaded to the server.\n\n` +
              `📍 ${coordinates.length} points recorded\n` +
              `📏 ${calculateTotalDistance(coordinates).toFixed(2)} km total distance\n` +
              `✅ Synced with backend`,
            [{ text: "Great!" }]
          );
        } else {
          throw new Error(uploadResult.message || "Upload failed");
        }
      } catch (uploadError) {
        console.error("Failed to upload route to backend:", uploadError);
        // Still saved locally, so inform user
        Alert.alert(
          "Route Saved Locally ⚠️",
          `Route saved on device but could not sync with server:\n\n` +
            `${
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown error"
            }\n\n` +
            `The route is safely stored locally and you can view it in Saved Routes.`,
          [
            { text: "OK" },
            {
              text: "View Saved Routes",
              onPress: () => router.push("/saved-routes"),
            },
          ]
        );
      } finally {
        setIsUploadingRoute(false);
      }
    } catch (error) {
      console.error("Failed to save route:", error);
      Alert.alert(
        "Save Failed",
        `Could not save route: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

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

  const handleStartRecording = async () => {
    if (!selectedActivity) {
      Alert.alert(
        "Select Activity",
        "Please select an offline activity before starting the recording.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Clear previous coordinates
      setHybridCoordinates([]);
      setMobileGPSCoordinates([]);

      if (useMobileGPS) {
        // Start mobile GPS with hybrid enhancement
        await mobileGPS.startTracking((coordinate) => {
          setCurrentMobileCoordinate(coordinate);
          setMobileGPSCoordinates((prev) => [...prev, coordinate]);

          // Feed GPS fix to hybrid service for interpolation
          hybridGPSService.updateGPSFix(coordinate);
        });

        // Start hybrid GPS service for sensor interpolation
        hybridGPSService.startTracking({
          onCoordinateUpdate: (coordinate) => {
            setHybridCoordinates((prev) => [...prev, coordinate]);
          },
          interpolationRate: 500, // 0.5 second interpolation for more points
        });

        Alert.alert(
          "Recording Started",
          `Mobile GPS + Sensors recording started for "${selectedActivity.name}".\n\nHold device steady for 2-3 seconds for sensor calibration.`
        );
      } else {
        // Start Bluetooth GPS tracking with hybrid enhancement
        gpsTracker.startTracking(`Recording for: ${selectedActivity.name}`);

        // Set up hybrid service to receive Bluetooth GPS fixes
        hybridGPSService.startTracking({
          onCoordinateUpdate: (coordinate) => {
            setHybridCoordinates((prev) => [...prev, coordinate]);
          },
          interpolationRate: 500, // 0.5 second interpolation for more points
        });

        // Subscribe to Bluetooth GPS fixes and feed them to hybrid service
        const unsubscribe = gpsTracker.subscribe((state) => {
          if (state.currentCoordinate) {
            hybridGPSService.updateGPSFix(state.currentCoordinate);
          }
        });

        Alert.alert(
          "Recording Started",
          `Bluetooth GPS + Sensors recording started for "${selectedActivity.name}".\n\nHold device steady for 2-3 seconds for sensor calibration.`
        );
      }
    } catch (error) {
      console.error("Recording start failed:", error);

      if (error instanceof Error && error.message.includes("permissions")) {
        Alert.alert(
          "Location Permission Required",
          "Location permissions are required to record GPS data.\n\nPlease:\n1. Grant location permissions in your device settings, or\n2. Switch to Bluetooth GPS if you have an external device",
          [
            {
              text: "Switch to Bluetooth GPS",
              onPress: () => {
                setUseMobileGPS(false);
              },
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert(
          "Recording Failed",
          `Failed to start recording: ${
            error instanceof Error ? error.message : "Unknown error"
          }\n\nTry switching GPS sources or checking your device settings.`,
          [
            {
              text: "Switch GPS Source",
              onPress: () => {
                setUseMobileGPS(!useMobileGPS);
              },
            },
            { text: "OK" },
          ]
        );
      }
    }
  };

  const handleStopRecording = async () => {
    try {
      // Stop mobile GPS tracking if active
      if (useMobileGPS) {
        await mobileGPS.stopTracking();
        // Save and upload the recorded route
        await saveRecordedRoute();
      } else {
        // Stop Bluetooth GPS tracking
        gpsTracker.stopTracking();
        // Save and upload the recorded route
        await saveRecordedRoute();
      }

      // Always stop hybrid GPS service
      hybridGPSService.stopTracking();

      // Reset coordinate arrays to allow new recording
      setHybridCoordinates([]);
      setMobileGPSCoordinates([]);
    } catch (error) {
      Alert.alert(
        "Stop Recording Failed",
        `Failed to stop recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
            if (useMobileGPS) {
              setMobileGPSCoordinates([]);
              setCurrentMobileCoordinate(null);
            } else {
              gpsTracker.clearCoordinates();
            }
            // Clear hybrid coordinates
            setHybridCoordinates([]);

            Alert.alert("Data Cleared", "All GPS data has been cleared.");
          },
        },
      ]
    );
  };

  const renderCurrentLocation = () => {
    // Determine which coordinate to display
    const currentCoord = useMobileGPS
      ? currentMobileCoordinate
      : trackingState.currentCoordinate;
    const isRecording = useMobileGPS
      ? mobileGPS.isCurrentlyTracking()
      : trackingState.isRecording;
    const gpsSource = useMobileGPS ? "Mobile GPS" : "Bluetooth GPS";

    if (!currentCoord) {
      return (
        <View style={styles.locationContainer}>
          <Text style={styles.locationTitle}>Waiting for GPS Data...</Text>
          <Text style={styles.locationSubtitle}>
            {useMobileGPS
              ? "Requesting location permission and GPS data from device"
              : "Connect to a Bluetooth GPS device first"}
          </Text>
          <Text style={styles.gpsSourceText}>Source: {gpsSource}</Text>
        </View>
      );
    }

    return (
      <View style={styles.locationContainer}>
        <Text style={styles.locationTitle}>
          {isRecording ? "🔴 Recording Route" : "📍 Current Location"}
        </Text>
        <Text style={styles.gpsSourceText}>📡 Source: {gpsSource}</Text>
        <Text style={styles.coordinate}>
          Lat: {currentCoord.latitude.toFixed(6)}
        </Text>
        <Text style={styles.coordinate}>
          Lng: {currentCoord.longitude.toFixed(6)}
        </Text>
        <Text style={styles.timestamp}>
          {currentCoord.timestamp.toLocaleTimeString()}
        </Text>
        {currentCoord.accuracy && (
          <Text style={styles.accuracy}>
            Accuracy: ±{currentCoord.accuracy.toFixed(1)}m
          </Text>
        )}
      </View>
    );
  };

  const renderMap = () => {
    let coordinates: GPSCoordinate[];
    let currentCoord: GPSCoordinate | null;
    let sourceIcon: string;
    let sourceName: string;

    if (useMobileGPS) {
      coordinates = hybridCoordinates;
      currentCoord = currentMobileCoordinate;
      sourceIcon = "📱";
      sourceName = "Mobile GPS + Sensors";
    } else {
      coordinates = hybridCoordinates;
      currentCoord = trackingState.currentCoordinate || null;
      sourceIcon = "🔗";
      sourceName = "Bluetooth GPS + Sensors";
    }

    if (!currentCoord) {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            Route visualization will appear when GPS location is available
          </Text>
          <IconSymbol name="map" size={60} color="#666" />
        </View>
      );
    }

    return (
      <View style={styles.routeVisualization}>
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>Route Visualization</Text>
          <Text style={styles.routeSubtitle}>
            {sourceIcon} {sourceName}
          </Text>
        </View>

        <View style={styles.routeStats}>
          <View style={styles.routeStatItem}>
            <Text style={styles.routeStatLabel}>Current Position</Text>
            <Text style={styles.routeStatValue}>
              {currentCoord.latitude.toFixed(6)},{" "}
              {currentCoord.longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.routeStatItem}>
            <Text style={styles.routeStatLabel}>Points Recorded</Text>
            <Text style={styles.routeStatValue}>{coordinates.length}</Text>
          </View>

          <View style={styles.routeStatItem}>
            <Text style={styles.routeStatLabel}>Distance</Text>
            <Text style={styles.routeStatValue}>
              {calculateTotalDistance(coordinates).toFixed(3)} km
            </Text>
          </View>
        </View>

        {displayCoordinates.length > 1 && (
          <View style={styles.routePathContainer}>
            <Text style={styles.routePathTitle}>Route Path</Text>
            <Text style={styles.routePathDescription}>
              🟢 Start → 🔴 Current ({displayCoordinates.length} points)
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Determine which coordinates to use for display
  const displayCoordinates = useMobileGPS
    ? hybridCoordinates
    : hybridCoordinates;

  const isCurrentlyRecording = useMobileGPS
    ? mobileGPS.isCurrentlyTracking()
    : trackingState.isRecording;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            name="rectangle.portrait.and.arrow.right"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {renderCurrentLocation()}

      {/* Map View */}
      <View style={styles.mapContainer}>{renderMap()}</View>

      {/* Offline Activity Selection */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Offline Activity</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the activity you&apos;re recording the route for
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

        {/* GPS Source Selection */}
        <View style={styles.gpsSourceContainer}>
          <Text style={styles.sectionTitle}>GPS Source</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your GPS data source for recording
          </Text>

          <View style={styles.gpsSourceList}>
            {/* Bluetooth GPS Option */}
            <TouchableOpacity
              style={[
                styles.gpsSourceOption,
                !useMobileGPS && styles.gpsSourceSelected,
              ]}
              onPress={() => {
                if (
                  trackingState.isRecording ||
                  mobileGPS.isCurrentlyTracking()
                ) {
                  Alert.alert(
                    "Cannot Switch",
                    "Stop recording before switching GPS sources."
                  );
                  return;
                }
                setUseMobileGPS(false);
                setCurrentMobileCoordinate(null);
                setMobileGPSCoordinates([]);
                setHybridCoordinates([]);
              }}
            >
              <Text style={styles.gpsSourceIcon}>🔗</Text>
              <View style={styles.gpsSourceInfo}>
                <Text style={styles.gpsSourceLabel}>
                  Bluetooth GPS + Sensors
                </Text>
                <Text style={styles.gpsSourceDescription}>
                  External GPS device with sensor interpolation
                </Text>
              </View>
              {!useMobileGPS && <Text style={styles.gpsSourceCheck}>✓</Text>}
            </TouchableOpacity>

            {/* Mobile GPS Option */}
            <TouchableOpacity
              style={[
                styles.gpsSourceOption,
                useMobileGPS && styles.gpsSourceSelected,
              ]}
              onPress={() => {
                if (
                  trackingState.isRecording ||
                  mobileGPS.isCurrentlyTracking()
                ) {
                  Alert.alert(
                    "Cannot Switch",
                    "Stop recording before switching GPS sources."
                  );
                  return;
                }
                setUseMobileGPS(true);
                setCurrentMobileCoordinate(null);
                setMobileGPSCoordinates([]);
                setHybridCoordinates([]);
              }}
            >
              <Text style={styles.gpsSourceIcon}>📱</Text>
              <View style={styles.gpsSourceInfo}>
                <Text style={styles.gpsSourceLabel}>Mobile GPS + Sensors</Text>
                <Text style={styles.gpsSourceDescription}>
                  Phone&apos;s GPS with sensor interpolation (1 second)
                </Text>
              </View>
              {useMobileGPS && <Text style={styles.gpsSourceCheck}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recording Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Recording Statistics</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Points Recorded:</Text>
          <Text style={styles.statsValue}>{displayCoordinates.length}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Distance:</Text>
          <Text style={styles.statsValue}>
            {calculateTotalDistance(displayCoordinates).toFixed(3)} km
          </Text>
        </View>
        {trackingState.startTime && !useMobileGPS && (
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Started:</Text>
            <Text style={styles.statsValue}>
              {trackingState.startTime.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isCurrentlyRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStartRecording}
            disabled={isUploadingRoute}
          >
            <Text style={styles.buttonText}>
              Start Recording (
              {useMobileGPS
                ? "Mobile GPS + Sensors"
                : "Bluetooth GPS + Sensors"}
              )
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStopRecording}
            disabled={isUploadingRoute}
          >
            {isUploadingRoute ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Uploading to Server...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                Stop Recording (
                {useMobileGPS
                  ? "Mobile GPS + Sensors"
                  : "Bluetooth GPS + Sensors"}
                )
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearData}
          disabled={displayCoordinates.length === 0 || isUploadingRoute}
        >
          <Text style={styles.buttonText}>Clear Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>GPS Recording Information</Text>
        <Text style={styles.infoText}>
          • Select an offline activity before recording
        </Text>
        <Text style={styles.infoText}>
          • Choose between Bluetooth GPS (external), Mobile GPS (built-in), or
          Inertial Navigation (sensors)
        </Text>
        <Text style={styles.infoText}>
          • Mobile GPS samples location every 1 second
        </Text>
        <Text style={styles.infoText}>
          • Inertial Navigation uses motion sensors for precise movement
          tracking
        </Text>
        <Text style={styles.infoText}>
          • Inertial Navigation requires an initial GPS position to start
        </Text>
        <Text style={styles.infoText}>
          • Grant location permissions when prompted for Mobile GPS
        </Text>
        <Text style={styles.infoText}>
          • Hold device steady for 2-3 seconds when starting inertial recording
          for calibration
        </Text>
        <Text style={styles.infoText}>
          • Export creates GeoJSON format for route data
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 65,
    zIndex: 1,
  },
  headerButtons: {
    position: "absolute",
    right: 20,
    top: 65,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    zIndex: 1,
  },
  locationContainer: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4caf50",
  },
  locationTitle: {
    color: "#4caf50",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  locationSubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  coordinate: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 2,
    fontFamily: "monospace",
  },
  timestamp: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },
  accuracy: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 3,
  },
  gpsSourceText: {
    color: "#4caf50",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    textAlign: "center",
  },
  mapContainer: {
    margin: 20,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    color: "#999",
    fontSize: 15,
    marginBottom: 18,
    lineHeight: 22,
  },
  activityDropdown: {
    marginBottom: 18,
  },
  selectedActivityInfo: {
    backgroundColor: "#1a1a1a",
    padding: 18,
    borderRadius: 14,
    borderLeftWidth: 5,
    borderLeftColor: "#4caf50",
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedActivityTitle: {
    color: "#4caf50",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  selectedActivityName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  selectedActivityLocation: {
    color: "#999",
    fontSize: 15,
    marginBottom: 5,
    fontWeight: "500",
  },
  selectedActivityDifficulty: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  gpsSourceContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  gpsSourceList: {
    gap: 16,
  },
  gpsSourceOption: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gpsSourceSelected: {
    borderColor: "#4caf50",
    backgroundColor: "#1a2e1a",
    shadowColor: "#4caf50",
    shadowOpacity: 0.3,
    elevation: 6,
  },
  gpsSourceDisabled: {
    opacity: 0.5,
    borderColor: "#555",
  },
  gpsSourceIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  gpsSourceInfo: {
    flex: 1,
  },
  gpsSourceCheck: {
    color: "#4caf50",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 12,
  },
  gpsSourceExtra: {
    color: "#4caf50",
    fontSize: 12,
    marginTop: 6,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  gpsSourceLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  gpsSourceDescription: {
    color: "#999",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  gpsSwitch: {
    marginHorizontal: 20,
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  statsContainer: {
    backgroundColor: "#1a1a1a",
    margin: 20,
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  statsTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statsLabel: {
    color: "#999",
    fontSize: 16,
    fontWeight: "600",
  },
  statsValue: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  buttonContainer: {
    padding: 20,
    gap: 16,
  },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  startButton: {
    backgroundColor: "#4caf50",
  },
  stopButton: {
    backgroundColor: "#ff6347",
  },
  clearButton: {
    backgroundColor: "#ff9800",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
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
  routeVisualization: {
    backgroundColor: "#1a1a1a",
    margin: 20,
    padding: 22,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#4caf50",
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  routeHeader: {
    alignItems: "center",
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  routeTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  routeSubtitle: {
    color: "#4caf50",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  routeStats: {
    gap: 16,
  },
  routeStatItem: {
    backgroundColor: "#252525",
    padding: 18,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  routeStatLabel: {
    color: "#999",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  routeStatValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  routePathContainer: {
    marginTop: 22,
    padding: 18,
    backgroundColor: "#252525",
    borderRadius: 12,
    alignItems: "center",
  },
  routePathTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  routePathDescription: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
