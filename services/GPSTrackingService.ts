import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  GPSCoordinate,
  GPSTrackingState,
  createGeoJSONRoute,
} from "../types/gps";

export class GPSTrackingService {
  private static instance: GPSTrackingService;
  private trackingState: GPSTrackingState;
  private listeners: Array<(state: GPSTrackingState) => void> = [];

  private constructor() {
    this.trackingState = {
      isRecording: false,
      coordinates: [],
      totalPoints: 0,
    };
  }

  static getInstance(): GPSTrackingService {
    if (!GPSTrackingService.instance) {
      GPSTrackingService.instance = new GPSTrackingService();
    }
    return GPSTrackingService.instance;
  }

  // Subscribe to tracking state changes
  subscribe(listener: (state: GPSTrackingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.trackingState));
  }

  // Start GPS tracking
  startTracking(deviceName?: string): void {
    this.trackingState = {
      ...this.trackingState,
      isRecording: true,
      startTime: new Date(),
      coordinates: [],
      totalPoints: 0,
      endTime: undefined,
    };
    this.notifyListeners();
    console.log(
      "GPS tracking started",
      deviceName ? `for device: ${deviceName}` : ""
    );
  }

  // Stop GPS tracking
  stopTracking(): void {
    this.trackingState = {
      ...this.trackingState,
      isRecording: false,
      endTime: new Date(),
    };
    this.notifyListeners();
    console.log(
      "GPS tracking stopped. Total points:",
      this.trackingState.totalPoints
    );
  }

  // Add a new GPS coordinate
  addCoordinate(coordinate: GPSCoordinate): void {
    if (!this.trackingState.isRecording) {
      return;
    }

    const updatedCoordinates = [...this.trackingState.coordinates, coordinate];
    this.trackingState = {
      ...this.trackingState,
      coordinates: updatedCoordinates,
      totalPoints: updatedCoordinates.length,
      currentCoordinate: coordinate,
    };

    this.notifyListeners();
    console.log(
      `Added GPS point ${this.trackingState.totalPoints}:`,
      `${coordinate.latitude}, ${coordinate.longitude}`
    );
  }

  // Get current tracking state
  getTrackingState(): GPSTrackingState {
    return { ...this.trackingState };
  }

  // Clear all recorded coordinates
  clearCoordinates(): void {
    this.trackingState = {
      ...this.trackingState,
      coordinates: [],
      totalPoints: 0,
      currentCoordinate: undefined,
      startTime: undefined,
      endTime: undefined,
    };
    this.notifyListeners();
  }

  // Generate filename for GeoJSON export
  private generateFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    return `gps-track-${dateStr}-${timeStr}.geojson`;
  }

  // Save coordinates as GeoJSON file
  async saveAsGeoJSON(deviceName?: string): Promise<string | null> {
    try {
      if (this.trackingState.coordinates.length === 0) {
        throw new Error("No GPS coordinates to save");
      }

      // Create route GeoJSON instead of just points
      const geoJSON = createGeoJSONRoute(
        this.trackingState.coordinates,
        `GPS Route - ${new Date().toLocaleDateString()}`,
        deviceName
      );

      const fileName = this.generateFileName();
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(geoJSON, null, 2)
      );

      console.log("GeoJSON file saved:", filePath);
      return filePath;
    } catch (error) {
      console.error("Error saving GeoJSON file:", error);
      throw error;
    }
  }

  // Export and share GeoJSON file
  async exportAndShare(deviceName?: string): Promise<void> {
    try {
      const filePath = await this.saveAsGeoJSON(deviceName);
      if (filePath && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/geo+json",
          dialogTitle: "Share GPS Track",
        });
      } else {
        throw new Error("Sharing not available on this platform");
      }
    } catch (error) {
      console.error("Error exporting and sharing GeoJSON:", error);
      throw error;
    }
  }

  // Get saved GeoJSON files
  async getSavedFiles(): Promise<
    Array<{ name: string; path: string; size: number; modifiedTime: number }>
  > {
    try {
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) return [];

      const files = await FileSystem.readDirectoryAsync(documentsDir);
      const geoJsonFiles = files.filter((file) => file.endsWith(".geojson"));

      const fileDetails = await Promise.all(
        geoJsonFiles.map(async (fileName) => {
          const filePath = `${documentsDir}${fileName}`;
          const info = await FileSystem.getInfoAsync(filePath);
          return {
            name: fileName,
            path: filePath,
            size: (info as any).size || 0,
            modifiedTime: (info as any).modificationTime || 0,
          };
        })
      );

      return fileDetails.sort((a, b) => b.modifiedTime - a.modifiedTime);
    } catch (error) {
      console.error("Error getting saved files:", error);
      return [];
    }
  }

  // Delete a saved file
  async deleteSavedFile(filePath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(filePath);
      console.log("File deleted:", filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  // Get statistics about current tracking session
  getTrackingStats(): {
    totalPoints: number;
    duration: number; // in milliseconds
    isRecording: boolean;
    lastCoordinate?: GPSCoordinate;
  } {
    const duration = this.trackingState.startTime
      ? (this.trackingState.endTime || new Date()).getTime() -
        this.trackingState.startTime.getTime()
      : 0;

    return {
      totalPoints: this.trackingState.totalPoints,
      duration,
      isRecording: this.trackingState.isRecording,
      lastCoordinate: this.trackingState.currentCoordinate,
    };
  }
}
