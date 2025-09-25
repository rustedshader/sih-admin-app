import { Accelerometer, Gyroscope, Magnetometer } from "expo-sensors";
import { GPSCoordinate } from "../types/gps";

export interface InertialData {
  acceleration: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  magneticField: { x: number; y: number; z: number };
  timestamp: number;
}

export interface InertialPosition {
  relativeX: number; // meters from start point
  relativeY: number; // meters from start point
  heading: number; // degrees from north
  speed: number; // m/s
  confidence: number; // 0-1 accuracy estimate
}

export class InertialNavigationService {
  private isTracking = false;
  private startPosition: GPSCoordinate | null = null;
  private currentPosition: InertialPosition = {
    relativeX: 0,
    relativeY: 0,
    heading: 0,
    speed: 0,
    confidence: 1.0,
  };

  // Sensor data
  private acceleration = { x: 0, y: 0, z: 0 };
  private rotation = { x: 0, y: 0, z: 0 };
  private magneticField = { x: 0, y: 0, z: 0 };

  // Calibration and filtering
  private accelerationBias = { x: 0, y: 0, z: 0 };
  private isCalibrated = false;
  private calibrationSamples: Array<{ x: number; y: number; z: number }> = [];
  private readonly CALIBRATION_SAMPLES = 50;

  // Dead reckoning state
  private velocity = { x: 0, y: 0 };
  private lastTimestamp = 0;
  private readonly GRAVITY = 9.81;
  private readonly ALPHA = 0.8; // Low-pass filter coefficient

  // Listeners
  private listeners: Array<
    (position: InertialPosition, coordinate: GPSCoordinate) => void
  > = [];

  async startTracking(initialPosition: GPSCoordinate): Promise<void> {
    if (this.isTracking) return;

    this.startPosition = initialPosition;
    this.currentPosition = {
      relativeX: 0,
      relativeY: 0,
      heading: 0,
      speed: 0,
      confidence: 1.0,
    };

    this.velocity = { x: 0, y: 0 };
    this.lastTimestamp = Date.now();
    this.isCalibrated = false;
    this.calibrationSamples = [];

    // Start sensor listeners
    this.startSensorListeners();
    this.isTracking = true;

    console.log("Inertial navigation started from:", initialPosition);
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    Accelerometer.removeAllListeners();
    Gyroscope.removeAllListeners();
    Magnetometer.removeAllListeners();

    this.isTracking = false;
    console.log("Inertial navigation stopped");
  }

  private startSensorListeners(): void {
    // Set update intervals (higher frequency for better accuracy)
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
    const timestamp = Date.now();
    const dt = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds

    if (dt <= 0) return;

    // Calibration phase - collect samples when device is stationary
    if (!this.isCalibrated) {
      this.calibrationSamples.push(data);

      if (this.calibrationSamples.length >= this.CALIBRATION_SAMPLES) {
        this.calibrateAccelerometer();
      }
      return;
    }

    // Remove bias (gravity and device orientation offset)
    const correctedAccel = {
      x: data.x - this.accelerationBias.x,
      y: data.y - this.accelerationBias.y,
      z: data.z - this.accelerationBias.z,
    };

    // Apply low-pass filter to reduce noise
    const filteredAccel = {
      x: this.ALPHA * correctedAccel.x,
      y: this.ALPHA * correctedAccel.y,
      z: this.ALPHA * correctedAccel.z,
    };

    // Only consider significant movements (above noise threshold)
    const magnitude = Math.sqrt(
      filteredAccel.x ** 2 + filteredAccel.y ** 2 + filteredAccel.z ** 2
    );

    if (magnitude < 0.1) {
      // Device is mostly stationary, gradually reduce velocity
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
    } else {
      // Integrate acceleration to get velocity (in device coordinates)
      this.velocity.x += filteredAccel.x * dt;
      this.velocity.y += filteredAccel.y * dt;
    }

    // Convert device coordinates to world coordinates using heading
    const headingRad = (this.currentPosition.heading * Math.PI) / 180;
    const worldVelX =
      this.velocity.x * Math.cos(headingRad) -
      this.velocity.y * Math.sin(headingRad);
    const worldVelY =
      this.velocity.x * Math.sin(headingRad) +
      this.velocity.y * Math.cos(headingRad);

    // Integrate velocity to get position
    this.currentPosition.relativeX += worldVelX * dt;
    this.currentPosition.relativeY += worldVelY * dt;
    this.currentPosition.speed = Math.sqrt(worldVelX ** 2 + worldVelY ** 2);

    // Reduce confidence over time (dead reckoning drift)
    this.currentPosition.confidence = Math.max(
      0.1,
      this.currentPosition.confidence * 0.9995
    );

    this.lastTimestamp = timestamp;
    this.notifyListeners();
  }

  private processGyroscopeData(data: {
    x: number;
    y: number;
    z: number;
  }): void {
    const timestamp = Date.now();
    const dt = (timestamp - this.lastTimestamp) / 1000;

    if (dt <= 0) return;

    // Integrate Z-axis rotation (yaw) to update heading
    // Assuming phone is held upright
    const rotationRate = data.z; // radians per second
    const headingChange = (rotationRate * dt * 180) / Math.PI; // Convert to degrees

    // Apply rotation if significant
    if (Math.abs(rotationRate) > 0.05) {
      this.currentPosition.heading += headingChange;
      // Normalize heading to 0-360 degrees
      this.currentPosition.heading =
        ((this.currentPosition.heading % 360) + 360) % 360;
    }
  }

  private processMagnetometerData(data: {
    x: number;
    y: number;
    z: number;
  }): void {
    // Use magnetometer to calibrate heading periodically
    // Calculate magnetic heading
    const magneticHeading = Math.atan2(data.y, data.x) * (180 / Math.PI);
    const normalizedHeading = ((magneticHeading % 360) + 360) % 360;

    // Gradually correct gyroscope drift with magnetometer
    const headingDiff = normalizedHeading - this.currentPosition.heading;
    let correctionFactor = 0.01; // Small correction to avoid jumps

    // Handle wraparound
    if (Math.abs(headingDiff) > 180) {
      const correction =
        headingDiff > 0 ? headingDiff - 360 : headingDiff + 360;
      this.currentPosition.heading += correction * correctionFactor;
    } else {
      this.currentPosition.heading += headingDiff * correctionFactor;
    }

    // Normalize heading
    this.currentPosition.heading =
      ((this.currentPosition.heading % 360) + 360) % 360;
  }

  private calibrateAccelerometer(): void {
    // Calculate bias by averaging samples (assuming device was stationary)
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
    console.log("Accelerometer calibrated with bias:", this.accelerationBias);
  }

  // Convert relative position to GPS coordinates
  getCurrentGPSCoordinate(): GPSCoordinate | null {
    if (!this.startPosition) return null;

    // Convert meters to degrees (approximate)
    const metersPerDegreeLat = 111000; // meters per degree latitude
    const metersPerDegreeLon =
      111000 * Math.cos((this.startPosition.latitude * Math.PI) / 180);

    const latOffset = this.currentPosition.relativeY / metersPerDegreeLat;
    const lonOffset = this.currentPosition.relativeX / metersPerDegreeLon;

    return {
      latitude: this.startPosition.latitude + latOffset,
      longitude: this.startPosition.longitude + lonOffset,
      accuracy: Math.max(1, (1 - this.currentPosition.confidence) * 50), // Convert confidence to accuracy estimate
      timestamp: new Date(),
    };
  }

  getCurrentPosition(): InertialPosition {
    return { ...this.currentPosition };
  }

  // Reset position (useful for recalibration)
  resetPosition(newStartPosition: GPSCoordinate): void {
    this.startPosition = newStartPosition;
    this.currentPosition.relativeX = 0;
    this.currentPosition.relativeY = 0;
    this.velocity = { x: 0, y: 0 };
    this.currentPosition.confidence = 1.0;
    console.log("Position reset to:", newStartPosition);
  }

  // Add listener for position updates
  addListener(
    callback: (position: InertialPosition, coordinate: GPSCoordinate) => void
  ): void {
    this.listeners.push(callback);
  }

  removeListener(
    callback: (position: InertialPosition, coordinate: GPSCoordinate) => void
  ): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    const coordinate = this.getCurrentGPSCoordinate();
    if (coordinate) {
      this.listeners.forEach((callback) =>
        callback(this.currentPosition, coordinate)
      );
    }
  }

  // Check if sensors are available
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

export const inertialNavigationService = new InertialNavigationService();
