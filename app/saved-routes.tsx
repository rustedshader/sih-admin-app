import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconSymbol } from "../components/ui/icon-symbol";
import { useAuth } from "../contexts/AuthContext";
import { SavedRoute } from "../types/saved-route";

export default function SavedRoutesScreen() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const savedRoutesJson = await AsyncStorage.getItem("recorded_routes");
      const savedRoutes = savedRoutesJson ? JSON.parse(savedRoutesJson) : [];
      setRoutes(savedRoutes);
    } catch (error) {
      console.error("Failed to load routes:", error);
      Alert.alert("Error", "Failed to load saved routes");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const shareRouteAsGeoJSON = async (route: SavedRoute) => {
    try {
      const geoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: route.activityName,
              city: route.activityCity,
              state: route.activityState,
              source: route.sourceName,
              points: route.pointsRecorded,
              totalDistance: route.totalDistance.toFixed(3) + " km",
              recordedAt: route.recordedAt,
              ...(route.finalConfidence && {
                finalConfidence: (route.finalConfidence * 100).toFixed(1) + "%",
              }),
              ...(route.finalHeading && {
                finalHeading: route.finalHeading.toFixed(0) + "°",
              }),
              ...(route.relativePosition && {
                relativePosition: {
                  x: route.relativePosition.x.toFixed(1) + "m",
                  y: route.relativePosition.y.toFixed(1) + "m",
                },
              }),
            },
            geometry: {
              type: "LineString",
              coordinates: route.coordinates.map((coord) => [
                coord.longitude,
                coord.latitude,
              ]),
            },
          },
        ],
      };

      const fileName = `${route.activityName.replace(/[^a-zA-Z0-9]/g, "_")}_${
        route.id
      }.geojson`;
      const file = new File(Paths.document, fileName);

      await file.write(JSON.stringify(geoJson, null, 2));

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/geo+json",
        dialogTitle: `Share Route: ${route.activityName}`,
      });

      Alert.alert(
        "Export Successful",
        `Route exported successfully as ${fileName}`
      );
    } catch (error) {
      console.error("Failed to share route:", error);
      Alert.alert("Error", "Failed to share route");
    }
  };

  const deleteRoute = async (routeId: string) => {
    Alert.alert(
      "Delete Route",
      "Are you sure you want to delete this route? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedRoutes = routes.filter(
                (route) => route.id !== routeId
              );
              setRoutes(updatedRoutes);
              await AsyncStorage.setItem(
                "recorded_routes",
                JSON.stringify(updatedRoutes)
              );
            } catch (error) {
              console.error("Failed to delete route:", error);
              Alert.alert("Error", "Failed to delete route");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const renderRoute = ({ item: route }: { item: SavedRoute }) => (
    <View style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <Text style={styles.routeIcon}>{route.sourceIcon}</Text>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.activityName}</Text>
          <Text style={styles.routeLocation}>
            {route.activityCity}, {route.activityState}
          </Text>
          <Text style={styles.routeSource}>{route.sourceName}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteRoute(route.id)}
        >
          <IconSymbol name="trash" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <View style={styles.routeStats}>
        <View style={styles.routeStatItem}>
          <Text style={styles.routeStatLabel}>Points</Text>
          <Text style={styles.routeStatValue}>{route.pointsRecorded}</Text>
        </View>
        <View style={styles.routeStatItem}>
          <Text style={styles.routeStatLabel}>Distance</Text>
          <Text style={styles.routeStatValue}>
            {route.totalDistance.toFixed(3)} km
          </Text>
        </View>
        {route.finalConfidence && (
          <View style={styles.routeStatItem}>
            <Text style={styles.routeStatLabel}>Confidence</Text>
            <Text style={styles.routeStatValue}>
              {(route.finalConfidence * 100).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.routeDate}>{formatDate(route.recordedAt)}</Text>

      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => shareRouteAsGeoJSON(route)}
      >
        <IconSymbol name="square.and.arrow.up" size={16} color="#4caf50" />
        <Text style={styles.shareButtonText}>Export & Share</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            name="rectangle.portrait.and.arrow.right"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="map" size={60} color="#666" />
          <Text style={styles.emptyTitle}>No Routes Saved</Text>
          <Text style={styles.emptyText}>
            Record some GPS routes first to see them here
          </Text>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => router.push("/gps-recording")}
          >
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderRoute}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.routesList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerButtons: {
    position: "absolute",
    right: 20,
    top: 65,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    zIndex: 1,
  },
  logoutButton: {
    position: "absolute",
    right: 20,
    top: 65,
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  routesList: {
    padding: 20,
  },
  routeCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  routeIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  routeLocation: {
    color: "#888",
    fontSize: 14,
    marginBottom: 4,
  },
  routeSource: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
  },
  routeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  routeStatItem: {
    alignItems: "center",
  },
  routeStatLabel: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  routeStatValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  routeDate: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },
  shareButton: {
    backgroundColor: "#2d5a2d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  shareButtonText: {
    color: "#4caf50",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
