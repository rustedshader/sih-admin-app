import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { GPSCoordinate } from "../types/gps";

interface RouteVisualizationProps {
  coordinates: GPSCoordinate[];
  currentCoordinate?: GPSCoordinate;
  isRecording: boolean;
}

const { width: screenWidth } = Dimensions.get("window");
const MAP_WIDTH = screenWidth - 40;
const MAP_HEIGHT = 300;

export const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  coordinates,
  currentCoordinate,
  isRecording,
}) => {
  // Calculate bounds for the coordinates
  const calculateBounds = (coords: GPSCoordinate[]) => {
    if (coords.length === 0) {
      return {
        minLat: 0,
        maxLat: 0,
        minLng: 0,
        maxLng: 0,
        centerLat: 0,
        centerLng: 0,
      };
    }

    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
    };
  };

  // Convert GPS coordinates to SVG coordinates
  const coordsToSvg = (coords: GPSCoordinate[], bounds: any) => {
    if (coords.length === 0) return [];

    const padding = 20;
    const usableWidth = MAP_WIDTH - padding * 2;
    const usableHeight = MAP_HEIGHT - padding * 2;

    const latRange = bounds.maxLat - bounds.minLat || 0.001; // Prevent division by zero
    const lngRange = bounds.maxLng - bounds.minLng || 0.001;

    return coords.map((coord) => {
      const x =
        padding + ((coord.longitude - bounds.minLng) / lngRange) * usableWidth;
      const y =
        padding + ((bounds.maxLat - coord.latitude) / latRange) * usableHeight;
      return { x, y, coord };
    });
  };

  const allCoords = [...coordinates];
  if (currentCoordinate && isRecording) {
    allCoords.push(currentCoordinate);
  }

  const bounds = calculateBounds(allCoords);
  const svgPoints = coordsToSvg(allCoords, bounds);

  // Create polyline points string
  const polylinePoints = svgPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Safety check for empty coordinates
  if (allCoords.length === 0) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.svg,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: "#888", textAlign: "center" }}>
            Start recording to see your route visualization
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={styles.svg}>
        {/* Background grid */}
        <Defs>
          <Pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#333"
              strokeWidth="0.5"
            />
          </Pattern>
        </Defs>

        {/* Grid background */}
        <Rect
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          fill="url(#grid)"
          opacity={0.3}
        />

        {/* Route path */}
        {svgPoints.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="#2196f3"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Route points */}
        {svgPoints.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={index === 0 ? 6 : index === svgPoints.length - 1 ? 6 : 3}
            fill={
              index === 0
                ? "#4caf50" // Start point (green)
                : index === svgPoints.length - 1 && isRecording
                ? "#ff6347" // Current/end point (red)
                : "#2196f3" // Regular points (blue)
            }
            stroke="#fff"
            strokeWidth="1"
          />
        ))}

        {/* Start/End labels */}
        {svgPoints.length > 0 && (
          <SvgText
            x={svgPoints[0].x}
            y={svgPoints[0].y - 10}
            fontSize="12"
            fill="#4caf50"
            textAnchor="middle"
            fontWeight="bold"
          >
            START
          </SvgText>
        )}

        {svgPoints.length > 1 && !isRecording && (
          <SvgText
            x={svgPoints[svgPoints.length - 1].x}
            y={svgPoints[svgPoints.length - 1].y - 10}
            fontSize="12"
            fill="#ff6347"
            textAnchor="middle"
            fontWeight="bold"
          >
            END
          </SvgText>
        )}

        {/* Current position indicator (pulsing when recording) */}
        {isRecording && currentCoordinate && svgPoints.length > 0 && (
          <Circle
            cx={svgPoints[svgPoints.length - 1].x}
            cy={svgPoints[svgPoints.length - 1].y}
            r="10"
            fill="none"
            stroke="#ff6347"
            strokeWidth="2"
            opacity={0.6}
          />
        )}

        {/* Coordinate info */}
        {bounds.centerLat !== 0 && (
          <SvgText
            x={MAP_WIDTH / 2}
            y={MAP_HEIGHT - 10}
            fontSize="10"
            fill="#888"
            textAnchor="middle"
          >
            {`Center: ${bounds.centerLat.toFixed(
              4
            )}, ${bounds.centerLng.toFixed(4)}`}
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 10,
    margin: 20,
    borderWidth: 2,
    borderColor: "#2196f3",
  },
  svg: {
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
  },
});
