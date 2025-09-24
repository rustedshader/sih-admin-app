import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";
import OfflineActivityService from "../services/OfflineActivityService";
import { OfflineActivity } from "../types/offline-activity";
import { IconSymbol } from "./ui/icon-symbol";

interface OfflineActivityDropdownProps {
  selectedActivity: OfflineActivity | null;
  onActivitySelect: (activity: OfflineActivity | null) => void;
  placeholder?: string;
  style?: any;
}

export const OfflineActivityDropdown: React.FC<
  OfflineActivityDropdownProps
> = ({
  selectedActivity,
  onActivitySelect,
  placeholder = "Select an offline activity",
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activities, setActivities] = useState<OfflineActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const offlineActivityService = OfflineActivityService.getInstance();

  useEffect(() => {
    if (isVisible && activities.length === 0) {
      loadActivities();
    }
  }, [isVisible]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedActivities =
        await offlineActivityService.getOfflineActivities({
          limit: 100, // Load all activities for the dropdown
        });
      setActivities(fetchedActivities);
    } catch (err) {
      console.error("Failed to load offline activities:", err);
      setError("Failed to load activities. Please try again.");
      Alert.alert(
        "Error",
        "Failed to load offline activities. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivitySelect = (activity: OfflineActivity) => {
    onActivitySelect(activity);
    setIsVisible(false);
  };

  const handleClear = () => {
    onActivitySelect(null);
    setIsVisible(false);
  };

  const renderActivityItem = ({ item }: { item: OfflineActivity }) => (
    <TouchableOpacity
      style={[
        styles.activityItem,
        {
          backgroundColor: colors.background,
          borderBottomColor: colorScheme === "dark" ? "#444" : "#e0e0e0",
        },
      ]}
      onPress={() => handleActivitySelect(item)}
    >
      <View style={styles.activityHeader}>
        <Text
          style={[styles.activityName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <View style={styles.difficultyBadge}>
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(item.difficulty_level) },
            ]}
          >
            {item.difficulty_level.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.activityLocation, { color: colors.text + "80" }]}>
        {item.city}, {item.state}
      </Text>
      <Text style={[styles.activityDuration, { color: colors.text + "60" }]}>
        Duration: {item.duration} day{item.duration > 1 ? "s" : ""} • Altitude:{" "}
        {item.altitude}m
      </Text>
    </TouchableOpacity>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "#4CAF50";
      case "moderate":
        return "#FF9800";
      case "difficult":
        return "#F44336";
      default:
        return colors.text;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.dropdown,
          {
            backgroundColor: colors.background,
            borderColor: colorScheme === "dark" ? "#444" : "#ddd",
          },
        ]}
        onPress={() => setIsVisible(true)}
      >
        <View style={styles.dropdownContent}>
          <Text
            style={[
              styles.dropdownText,
              {
                color: selectedActivity ? colors.text : colors.text + "60",
              },
            ]}
            numberOfLines={1}
          >
            {selectedActivity ? selectedActivity.name : placeholder}
          </Text>
          <IconSymbol
            name="chevron.down"
            size={20}
            color={colors.text + "60"}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: colorScheme === "dark" ? "#444" : "#e0e0e0",
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Offline Activity
            </Text>
            <View style={styles.headerButtons}>
              {selectedActivity && (
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: "#FF6B6B" }]}
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.tint }]}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading activities...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: "#F44336" }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.tint }]}
                onPress={loadActivities}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={activities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderActivityItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    minHeight: 50,
  },
  dropdownContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingVertical: 10,
  },
  activityItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  activityLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityDuration: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
