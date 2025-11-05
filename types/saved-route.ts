import { GPSCoordinate } from "./gps";

export interface SavedRoute {
  id: string;
  activityId?: number; // Added for backend sync
  activityName: string;
  activityCity: string;
  activityState: string;
  sourceName: string;
  sourceIcon: string;
  coordinates: GPSCoordinate[];
  pointsRecorded: number;
  totalDistance: number;
  recordedAt: string;
  uploadedToBackend?: boolean; // Track sync status
  finalConfidence?: number;
  finalHeading?: number;
  relativePosition?: {
    x: number;
    y: number;
  };
}
