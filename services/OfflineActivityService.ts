import { OfflineActivity } from "../types/offline-activity";
import AuthService from "./AuthService";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.surakshit.world";

export interface GetOfflineActivitiesParams {
  limit?: number;
  offset?: number;
  search?: string;
  state?: string;
  difficulty_level?: "easy" | "moderate" | "difficult";
  min_duration?: number;
  max_duration?: number;
  min_altitude?: number;
  max_altitude?: number;
  guide_required?: boolean;
}

class OfflineActivityService {
  private static instance: OfflineActivityService;
  private authService = AuthService.getInstance();

  private constructor() {}

  static getInstance(): OfflineActivityService {
    if (!OfflineActivityService.instance) {
      OfflineActivityService.instance = new OfflineActivityService();
    }
    return OfflineActivityService.instance;
  }

  async getOfflineActivities(
    params: GetOfflineActivitiesParams = {}
  ): Promise<OfflineActivity[]> {
    try {
      const searchParams = new URLSearchParams();

      // Add all parameters to search params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const url = `${API_BASE_URL}/offline-activities/?${searchParams.toString()}`;

      const response = await this.authService.authenticatedFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch offline activities: ${response.status}`
        );
      }

      const data = await response.json();
      return data; // The API returns an array directly based on your example
    } catch (error) {
      console.error("Error fetching offline activities:", error);
      throw error;
    }
  }

  async getOfflineActivityById(id: number): Promise<OfflineActivity> {
    try {
      const url = `${API_BASE_URL}/offline-activities/${id}`;

      const response = await this.authService.authenticatedFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch offline activity: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching offline activity:", error);
      throw error;
    }
  }
}

export default OfflineActivityService;
