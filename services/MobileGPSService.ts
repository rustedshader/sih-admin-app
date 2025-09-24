import * as Location from "expo-location";
import { GPSCoordinate } from "../types/gps";

export class MobileGPSService {
  private static instance: MobileGPSService;
  private subscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private onLocationUpdate: ((coordinate: GPSCoordinate) => void) | null = null;

  private constructor() {}

  static getInstance(): MobileGPSService {
    if (!MobileGPSService.instance) {
      MobileGPSService.instance = new MobileGPSService();
    }
    return MobileGPSService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Check if we already have foreground permissions
      const { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus === "granted") {
        console.log("Location permissions already granted");
        return true;
      }

      // Request foreground permissions
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        console.error(
          "Foreground location permission denied:",
          foregroundStatus
        );
        return false;
      }

      console.log("Foreground location permission granted");

      // Try to request background permission but don't fail if denied
      try {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== "granted") {
          console.warn(
            "Background location permission not granted, but continuing with foreground only"
          );
        } else {
          console.log("Background location permission granted");
        }
      } catch (bgError) {
        console.warn(
          "Background permission request failed, continuing with foreground only:",
          bgError
        );
      }

      return true;
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  async startTracking(
    onLocationUpdate: (coordinate: GPSCoordinate) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      console.warn("Mobile GPS tracking already started");
      return true;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error("Location permissions required");
      }

      this.onLocationUpdate = onLocationUpdate;
      this.isTracking = true;

      // Start location tracking with 1-second intervals
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // 1 second
          distanceInterval: 0, // Track all movements
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          const coordinate: GPSCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: new Date(location.timestamp),
          };

          this.onLocationUpdate?.(coordinate);
        }
      );

      console.log("Mobile GPS tracking started successfully");
      return true;
    } catch (error) {
      console.error("Failed to start mobile GPS tracking:", error);
      this.isTracking = false;
      this.onLocationUpdate = null;
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }

      this.isTracking = false;
      this.onLocationUpdate = null;
      console.log("Mobile GPS tracking stopped successfully");
    } catch (error) {
      console.error("Failed to stop mobile GPS tracking:", error);
      throw error;
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  async getCurrentLocation(): Promise<GPSCoordinate> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error("Location permissions required");
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        timestamp: new Date(location.timestamp),
      };
    } catch (error) {
      console.error("Failed to get current location:", error);
      throw error;
    }
  }
}
