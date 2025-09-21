// GPS coordinate interfaces and types

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; // Array of [longitude, latitude] points
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    timestamp: string;
    accuracy?: number;
    id: string;
  };
  geometry: GeoJSONPoint;
}

export interface GeoJSONRouteFeature {
  type: "Feature";
  properties: {
    name: string;
    description?: string;
    startTime: string;
    endTime?: string;
    totalPoints: number;
    deviceName?: string;
  };
  geometry: GeoJSONLineString;
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  metadata?: {
    createdAt: string;
    totalPoints: number;
    trackingStarted: string;
    trackingEnded?: string;
    deviceName?: string;
  };
}

export interface GeoJSONRouteCollection {
  type: "FeatureCollection";
  features: GeoJSONRouteFeature[];
}

export interface GPSTrackingState {
  isRecording: boolean;
  coordinates: GPSCoordinate[];
  startTime?: Date;
  endTime?: Date;
  totalPoints: number;
  currentCoordinate?: GPSCoordinate;
}

export interface BluetoothGPSDevice {
  id: string;
  name: string;
  isConnected: boolean;
  lastData?: string;
  lastCoordinate?: GPSCoordinate;
}

// Helper function to parse GPS data from Bluetooth
export const parseGPSData = (rawData: string): GPSCoordinate | null => {
  try {
    const trimmed = rawData.trim();
    const parts = trimmed.split(",");

    if (parts.length >= 2) {
      const latitude = parseFloat(parts[0]);
      const longitude = parseFloat(parts[1]);

      if (!isNaN(latitude) && !isNaN(longitude)) {
        return {
          latitude,
          longitude,
          timestamp: new Date(),
          accuracy: parts[2] ? parseFloat(parts[2]) : undefined,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error parsing GPS data:", error);
    return null;
  }
};

// Helper to convert coordinates to GeoJSON format
export const coordinateToGeoJSON = (coord: GPSCoordinate): GeoJSONFeature => ({
  type: "Feature",
  properties: {
    timestamp: coord.timestamp.toISOString(),
    accuracy: coord.accuracy,
    id: `${coord.timestamp.getTime()}`,
  },
  geometry: {
    type: "Point",
    coordinates: [coord.longitude, coord.latitude],
  },
});

// Helper to create a complete GeoJSON collection
export const createGeoJSONCollection = (
  coordinates: GPSCoordinate[],
  metadata?: Partial<GeoJSONCollection["metadata"]>
): GeoJSONCollection => ({
  type: "FeatureCollection",
  features: coordinates.map(coordinateToGeoJSON),
  metadata: {
    createdAt: new Date().toISOString(),
    totalPoints: coordinates.length,
    trackingStarted:
      coordinates[0]?.timestamp.toISOString() || new Date().toISOString(),
    trackingEnded: coordinates[coordinates.length - 1]?.timestamp.toISOString(),
    ...metadata,
  },
});

// Helper to create a route GeoJSON (LineString)
export const createGeoJSONRoute = (
  coordinates: GPSCoordinate[],
  routeName: string = "GPS Route",
  deviceName?: string
): GeoJSONRouteCollection => {
  if (coordinates.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const lineCoordinates: [number, number][] = coordinates.map((coord) => [
    coord.longitude,
    coord.latitude,
  ]);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: routeName,
          description: `GPS route with ${coordinates.length} points`,
          startTime: coordinates[0].timestamp.toISOString(),
          endTime: coordinates[coordinates.length - 1].timestamp.toISOString(),
          totalPoints: coordinates.length,
          deviceName,
        },
        geometry: {
          type: "LineString",
          coordinates: lineCoordinates,
        },
      },
    ],
  };
};
