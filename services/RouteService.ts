import AuthService from "./AuthService";
import { GPSCoordinate } from "../types/gps";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.surakshit.world";

export interface RouteUploadPayload {
  offline_activity_id: number;
  route_data: [number, number][]; // [latitude, longitude] pairs
}

export interface RouteUploadResponse {
  success: boolean;
  message?: string;
  route_id?: number;
}

class RouteService {
  private static instance: RouteService;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  static getInstance(): RouteService {
    if (!RouteService.instance) {
      RouteService.instance = new RouteService();
    }
    return RouteService.instance;
  }

  /**
   * Upload recorded route data to the backend
   * @param activityId - The offline activity ID from the selected activity
   * @param coordinates - Array of GPS coordinates with latitude/longitude
   * @returns Response from the server
   */
  async uploadRoute(
    activityId: number,
    coordinates: GPSCoordinate[]
  ): Promise<RouteUploadResponse> {
    try {
      const accessToken = this.authService.getAccessToken();
      if (!accessToken) {
        throw new Error("No access token available. Please login again.");
      }

      // Convert coordinates to the required format: [[lat, lon], [lat, lon], ...]
      const routeData: [number, number][] = coordinates.map((coord) => [
        coord.latitude,
        coord.longitude,
      ]);

      const payload: RouteUploadPayload = {
        offline_activity_id: activityId,
        route_data: routeData,
      };

      console.log(
        `Uploading route for activity ${activityId} with ${routeData.length} points...`
      );

      const response = await fetch(
        `${API_BASE_URL}/offline-activities/route-data`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Route upload failed:", errorData);

        // Handle 401 - token might be expired
        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please login again to upload routes."
          );
        }

        throw new Error(
          errorData.detail ||
            errorData.message ||
            `Route upload failed with status ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Route uploaded successfully:", result);

      return {
        success: true,
        message: "Route uploaded successfully",
        ...result,
      };
    } catch (error) {
      console.error("Route upload error:", error);
      throw error;
    }
  }

  /**
   * Batch upload multiple routes
   * @param routes - Array of route upload requests
   * @returns Array of upload results
   */
  async uploadMultipleRoutes(
    routes: Array<{ activityId: number; coordinates: GPSCoordinate[] }>
  ): Promise<RouteUploadResponse[]> {
    const results: RouteUploadResponse[] = [];

    for (const route of routes) {
      try {
        const result = await this.uploadRoute(
          route.activityId,
          route.coordinates
        );
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to upload route for activity ${route.activityId}:`,
          error
        );
        results.push({
          success: false,
          message:
            error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return results;
  }
}

export default RouteService;
