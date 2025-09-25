import { GPSCoordinate } from "./gps";

export interface SavedRoute {
  id: string;
  activityName: string;
  activityCity: string;
  activityState: string;
  sourceName: string;
  sourceIcon: string;
  coordinates: GPSCoordinate[];
  pointsRecorded: number;
  totalDistance: number;
  recordedAt: string;
  finalConfidence?: number;
  finalHeading?: number;
  relativePosition?: {
    x: number;
    y: number;
  };
}
