import { Accelerometer, Gyroscope, Magnetometer } from "expo-sensors";
import { GPSCoordinate } from "../types/gps";

export interface HybridGPSOptions {
  onCoordinateUpdate: (coordinate: GPSCoordinate) => void;
  interpolationRate: number; // milliseconds between interpolated points (e.g., 1000 for 1 second)
}

export class HybridGPSService {
  private isTracking = false;
  private lastGPSFix: GPSCoordinate | null = null;
  private lastFixTimestamp = 0;

  // Sensor state
  private acceleration = { x: 0, y: 0, z: 0 };
  private rotation = { x: 0, y: 0, z: 0 };
  private magneticField = { x: 0, y: 0, z: 0 };

  // Interpolation state
  private velocity = { x: 0, y: 0 }; // m/s in world coordinates
  private heading = 0; // degrees from north
  private relativeX = 0; // meters from last GPS fix
  private relativeY = 0; // meters from last GPS fix

  // Calibration
  private accelerationBias = { x: 0, y: 0, z: 0 };
  private isCalibrated = false;
  private calibrationSamples: Array<{ x: number; y: number; z: number }> = [];

  // Configuration
  private readonly GRAVITY = 9.81;
  private readonly ALPHA = 0.8; // Low-pass filter
  private readonly CALIBRATION_SAMPLES = 30;
  private readonly MIN_MOVEMENT_THRESHOLD = 0.15; // m/s² threshold for detecting movement

  // Callback and intervals
  private onCoordinateUpdate: ((coordinate: GPSCoordinate) => void) | null =
    null;
  private interpolationInterval: any = null;
  private interpolationRate = 1000; // 1 second by default

  constructor() {
    this.setupSensorListeners();
  }

  private setupSensorListeners(): void {
    // Set update intervals for sensors
    Accelerometer.setUpdateInterval(50); // 20Hz
    Gyroscope.setUpdateInterval(50); // 20Hz
    Magnetometer.setUpdateInterval(100); // 10Hz

    // Accelerometer for movement detection
    Accelerometer.addListener((data) => {
      this.acceleration = data;
      this.processAccelerometerData(data);
    });

    // Gyroscope for rotation
    Gyroscope.addListener((data) => {
      this.rotation = data;
      this.processGyroscopeData(data);
    });

    // Magnetometer for heading
    Magnetometer.addListener((data) => {
      this.magneticField = data;
      this.processMagnetometerData(data);
    });
  }

  private processAccelerometerData(data: {
    x: number;
    y: number;
    z: number;
  }): void {
    if (!this.isTracking) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastFixTimestamp) / 1000, 0.1); // Max 0.1s timestep

    if (dt <= 0) return;

    // Calibration phase
    if (!this.isCalibrated) {
      this.calibrationSamples.push(data);

      if (this.calibrationSamples.length >= this.CALIBRATION_SAMPLES) {
        this.calibrateAccelerometer();
      }
      return;
    }

    // Remove bias and gravity
    const correctedAccel = {
      x: data.x - this.accelerationBias.x,
      y: data.y - this.accelerationBias.y,
      z: data.z - this.accelerationBias.z,
    };

    // Apply low-pass filter
    const filteredAccel = {
      x: this.ALPHA * correctedAccel.x,
      y: this.ALPHA * correctedAccel.y,
      z: this.ALPHA * correctedAccel.z,
    };

    // Check if there's significant movement
    const magnitude = Math.sqrt(
      filteredAccel.x ** 2 + filteredAccel.y ** 2 + filteredAccel.z ** 2
    );

    if (magnitude < this.MIN_MOVEMENT_THRESHOLD) {
      // Device is mostly stationary, gradually reduce velocity
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
    } else {
      // Integrate acceleration to get velocity change
      const headingRad = (this.heading * Math.PI) / 180;

      // Convert device coordinates to world coordinates
      const worldAccelX =
        filteredAccel.x * Math.cos(headingRad) -
        filteredAccel.y * Math.sin(headingRad);
      const worldAccelY =
        filteredAccel.x * Math.sin(headingRad) +
        filteredAccel.y * Math.cos(headingRad);

      // Update velocity
      this.velocity.x += worldAccelX * dt;
      this.velocity.y += worldAccelY * dt;
    }

    // Integrate velocity to get position change
    this.relativeX += this.velocity.x * dt;
    this.relativeY += this.velocity.y * dt;

    this.lastFixTimestamp = now;
  }

  private processGyroscopeData(data: {
    x: number;
    y: number;
    z: number;
  }): void {
    if (!this.isTracking) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastFixTimestamp) / 1000, 0.1);

    if (dt <= 0) return;

    // Integrate Z-axis rotation (yaw) to update heading
    const rotationRate = data.z; // radians per second
    if (Math.abs(rotationRate) > 0.05) {
      // Only for significant rotation
      const headingChange = (rotationRate * dt * 180) / Math.PI;
      this.heading += headingChange;
      this.heading = ((this.heading % 360) + 360) % 360; // Normalize 0-360
    }
  }

  private processMagnetometerData(data: {
    x: number;
    y: number;
    z: number;
  }): void {
    if (!this.isTracking) return;

    // Use magnetometer to correct heading drift periodically
    const magneticHeading = Math.atan2(data.y, data.x) * (180 / Math.PI);
    const normalizedHeading = ((magneticHeading % 360) + 360) % 360;

    // Small correction to prevent jumps
    const headingDiff = normalizedHeading - this.heading;
    let correction = 0.01; // Very small correction factor

    if (Math.abs(headingDiff) > 180) {
      const wrappedDiff =
        headingDiff > 0 ? headingDiff - 360 : headingDiff + 360;
      this.heading += wrappedDiff * correction;
    } else {
      this.heading += headingDiff * correction;
    }

    this.heading = ((this.heading % 360) + 360) % 360;
  }

  private calibrateAccelerometer(): void {
    let sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (const sample of this.calibrationSamples) {
      sumX += sample.x;
      sumY += sample.y;
      sumZ += sample.z;
    }

    this.accelerationBias.x = sumX / this.calibrationSamples.length;
    this.accelerationBias.y = sumY / this.calibrationSamples.length;
    this.accelerationBias.z =
      sumZ / this.calibrationSamples.length - this.GRAVITY;

    this.isCalibrated = true;
    console.log("Hybrid GPS: Sensors calibrated", this.accelerationBias);
  }

  startTracking(options: HybridGPSOptions): void {
    if (this.isTracking) return;

    this.onCoordinateUpdate = options.onCoordinateUpdate;
    this.interpolationRate = options.interpolationRate;
    this.isTracking = true;

    // Reset state
    this.lastGPSFix = null;
    this.velocity = { x: 0, y: 0 };
    this.relativeX = 0;
    this.relativeY = 0;
    this.isCalibrated = false;
    this.calibrationSamples = [];
    this.lastFixTimestamp = Date.now();

    // Start interpolation timer
    this.interpolationInterval = setInterval(() => {
      this.generateInterpolatedPosition();
    }, this.interpolationRate);

    console.log("Hybrid GPS tracking started");
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    this.onCoordinateUpdate = null;

    if (this.interpolationInterval) {
      clearInterval(this.interpolationInterval);
      this.interpolationInterval = null;
    }

    console.log("Hybrid GPS tracking stopped");
  }

  // Call this when you receive a new GPS fix
  updateGPSFix(gpsCoordinate: GPSCoordinate): void {
    if (!this.isTracking) return;

    this.lastGPSFix = gpsCoordinate;
    this.lastFixTimestamp = Date.now();

    // Reset relative position since we have a new absolute fix
    this.relativeX = 0;
    this.relativeY = 0;

    // Reset velocity to prevent drift accumulation
    this.velocity.x *= 0.5;
    this.velocity.y *= 0.5;

    // Immediately send the GPS fix
    if (this.onCoordinateUpdate) {
      this.onCoordinateUpdate(gpsCoordinate);
    }

    console.log(
      "Hybrid GPS: New GPS fix received",
      gpsCoordinate.latitude,
      gpsCoordinate.longitude
    );
  }

  private generateInterpolatedPosition(): void {
    if (!this.isTracking || !this.lastGPSFix || !this.onCoordinateUpdate)
      return;

    // Only interpolate if we haven't received a GPS fix recently
    const timeSinceLastFix = Date.now() - this.lastFixTimestamp;
    if (timeSinceLastFix < this.interpolationRate * 0.8) return; // Wait at least 80% of interval

    // Convert relative position to GPS coordinates
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLon =
      111000 * Math.cos((this.lastGPSFix.latitude * Math.PI) / 180);

    const latOffset = this.relativeY / metersPerDegreeLat;
    const lonOffset = this.relativeX / metersPerDegreeLon;

    const interpolatedCoordinate: GPSCoordinate = {
      latitude: this.lastGPSFix.latitude + latOffset,
      longitude: this.lastGPSFix.longitude + lonOffset,
      timestamp: new Date(),
      accuracy: Math.max(5, Math.min(50, timeSinceLastFix / 100)), // Accuracy degrades over time
    };

    this.onCoordinateUpdate(interpolatedCoordinate);
  }

  // Get current interpolated position without waiting for timer
  getCurrentInterpolatedPosition(): GPSCoordinate | null {
    if (!this.lastGPSFix) return null;

    const metersPerDegreeLat = 111000;
    const metersPerDegreeLon =
      111000 * Math.cos((this.lastGPSFix.latitude * Math.PI) / 180);

    const latOffset = this.relativeY / metersPerDegreeLat;
    const lonOffset = this.relativeX / metersPerDegreeLon;

    return {
      latitude: this.lastGPSFix.latitude + latOffset,
      longitude: this.lastGPSFix.longitude + lonOffset,
      timestamp: new Date(),
      accuracy: Math.max(
        5,
        Math.min(50, (Date.now() - this.lastFixTimestamp) / 100)
      ),
    };
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // Cleanup method
  cleanup(): void {
    this.stopTracking();

    // Remove sensor listeners
    Accelerometer.removeAllListeners();
    Gyroscope.removeAllListeners();
    Magnetometer.removeAllListeners();
  }

  // Get sensor availability
  static async checkSensorAvailability(): Promise<{
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  }> {
    try {
      const [accelAvailable, gyroAvailable, magnetAvailable] =
        await Promise.all([
          Accelerometer.isAvailableAsync(),
          Gyroscope.isAvailableAsync(),
          Magnetometer.isAvailableAsync(),
        ]);

      return {
        accelerometer: accelAvailable,
        gyroscope: gyroAvailable,
        magnetometer: magnetAvailable,
      };
    } catch (error) {
      console.error("Error checking sensor availability:", error);
      return {
        accelerometer: false,
        gyroscope: false,
        magnetometer: false,
      };
    }
  }
}

// Singleton instance
export const hybridGPSService = new HybridGPSService();
