"use client";

import base64 from "base-64"; // Import the base-64 library
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { GPSTrackingService } from "../../services/GPSTrackingService";
import { GPSCoordinate, parseGPSData } from "../../types/gps";

let manager: BleManager | null = null;

// These UUIDs must match the ones on your ESP32
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

interface BluetoothDevice extends Device {
  name: string | null;
}

export default function BluetoothScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [espData, setEspData] = useState<string | null>(null); // State to hold received data
  const [currentGPS, setCurrentGPS] = useState<GPSCoordinate | null>(null);
  const [gpsTracker] = useState(() => GPSTrackingService.getInstance());
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPoints, setRecordedPoints] = useState(0);

  useEffect(() => {
    // Initialize BLE Manager and handle permissions
    manager = new BleManager();
    const subscription = manager.onStateChange((state) => {
      setBleState(state);
      if (state === State.PoweredOn && Platform.OS === "android") {
        requestBluetoothPermissions();
      }
    }, true);

    // Subscribe to GPS tracking state
    const gpsUnsubscribe = gpsTracker.subscribe((state) => {
      setIsRecording(state.isRecording);
      setRecordedPoints(state.totalPoints);
    });

    return () => {
      subscription.remove();
      gpsUnsubscribe();
      if (manager) {
        manager.destroy();
        manager = null;
      }
    };
  }, [gpsTracker]);

  const requestBluetoothPermissions = async () => {
    // Permission request logic (unchanged)
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    if (
      !granted["android.permission.BLUETOOTH_SCAN"] ||
      !granted["android.permission.BLUETOOTH_CONNECT"]
    ) {
      setError("Bluetooth permissions denied");
    }
  };

  const startScan = () => {
    // Scan logic (unchanged)
    if (!manager || bleState !== State.PoweredOn) {
      setError("Bluetooth is not enabled or manager not initialized.");
      return;
    }
    setDevices([]);
    setError(null);
    setIsScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        setError(error.message);
        setIsScanning(false);
        return;
      }
      if (device?.name) {
        setDevices((prev) => {
          if (!prev.find((d) => d.id === device.id)) {
            return [...prev, device as BluetoothDevice];
          }
          return prev;
        });
      }
    });
    setTimeout(() => manager?.stopDeviceScan(), 10000);
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    if (!manager) return;

    setError(null);
    try {
      await manager.stopDeviceScan();
      const connected = await manager.connectToDevice(device.id);
      setConnectedDevice(connected as BluetoothDevice);

      await connected.discoverAllServicesAndCharacteristics();

      // Start monitoring the characteristic for notifications
      const subscription = manager.monitorCharacteristicForDevice(
        device.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error("Bluetooth monitoring error:", error);
            setError(`Monitoring error: ${error.message}`);
            return;
          }
          try {
            // Decode the received value (it's Base64)
            const decodedData = base64.decode(characteristic?.value || "");
            console.log("Received data:", decodedData);
            setEspData(decodedData);

            // Parse GPS data and update current coordinates
            const gpsCoord = parseGPSData(decodedData);
            if (gpsCoord) {
              setCurrentGPS(gpsCoord);
              // Add to GPS tracker if recording
              gpsTracker.addCoordinate(gpsCoord);
            }
          } catch (decodeError) {
            console.error("Error processing GPS data:", decodeError);
          }
        }
      );

      // Store subscription for cleanup
      (connected as any)._gpsSubscription = subscription;
    } catch (err: any) {
      setError(err.message || "Failed to connect and subscribe");
    }
  };

  const disconnectDevice = async () => {
    if (!manager || !connectedDevice) return;
    try {
      // Clean up GPS subscription first
      if ((connectedDevice as any)._gpsSubscription) {
        (connectedDevice as any)._gpsSubscription.remove();
      }

      await manager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setEspData(null); // Clear data on disconnect
      setCurrentGPS(null); // Clear GPS data on disconnect
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error("Disconnect error:", err);
      setError("Failed to disconnect: " + err.message);
    }
  };

  const navigateToRecording = () => {
    if (!connectedDevice) {
      Alert.alert(
        "No Device Connected",
        "Please connect to a Bluetooth device first."
      );
      return;
    }
    router.push("/(tabs)/gps_recording");
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <View style={styles.deviceContainer}>
      <Text style={styles.deviceText}>{item.name || "Unknown Device"}</Text>
      <Text style={styles.deviceText}>ID: {item.id}</Text>

      {/* Show Disconnect button if this device is connected */}
      {connectedDevice?.id === item.id ? (
        <>
          <Button
            title="Disconnect"
            onPress={disconnectDevice}
            color="#ff6347"
          />
          {/* Display the received data here */}
          {espData && <Text style={styles.dataText}>Received: {espData}</Text>}
        </>
      ) : (
        // Otherwise, show the Connect button
        <Button
          title="Connect"
          onPress={() => connectToDevice(item)}
          disabled={!!connectedDevice} // Disable if another device is already connected
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <IconSymbol name="chevron.left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bluetooth Connection</Text>
      </View>

      <View style={styles.content}>
        <Button
          title={isScanning ? "Scanning..." : "Scan for Devices"}
          onPress={startScan}
          disabled={isScanning}
        />
        {error && <Text style={styles.errorText}>Error: {error}</Text>}

        {/* GPS Display Section */}
        {currentGPS && (
          <View style={styles.gpsContainer}>
            <Text style={styles.gpsTitle}>Current GPS Location</Text>
            <Text style={styles.gpsCoordinate}>
              Latitude: {currentGPS.latitude.toFixed(6)}
            </Text>
            <Text style={styles.gpsCoordinate}>
              Longitude: {currentGPS.longitude.toFixed(6)}
            </Text>
            <Text style={styles.gpsTimestamp}>
              {currentGPS.timestamp.toLocaleTimeString()}
            </Text>
            {currentGPS.accuracy && (
              <Text style={styles.gpsAccuracy}>
                Accuracy: ±{currentGPS.accuracy}m
              </Text>
            )}
            {isRecording && (
              <Text style={styles.recordingStatus}>
                🔴 Recording Route • {recordedPoints} points collected
              </Text>
            )}
          </View>
        )}

        {/* Recording Button */}
        {connectedDevice && (
          <TouchableOpacity
            style={styles.recordingButton}
            onPress={navigateToRecording}
          >
            <Text style={styles.recordingButtonText}>
              {isRecording ? "📍 View Recording" : "🔴 Start GPS Recording"}
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          style={{ marginTop: 10 }}
        />
      </View>
    </View>
  );
}

// Basic styling
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 65,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 5,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  deviceContainer: { padding: 10, borderBottomWidth: 1, borderColor: "#444" },
  deviceText: { color: "#fff", marginBottom: 5 },
  dataText: {
    color: "#4caf50",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: { color: "#ff6347", marginVertical: 10 },
  gpsContainer: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 12,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: "#4caf50",
  },
  gpsTitle: {
    color: "#4caf50",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  gpsCoordinate: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  gpsTimestamp: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  gpsAccuracy: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
  recordingButton: {
    backgroundColor: "#2196f3",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  recordingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  recordingStatus: {
    color: "#ff6347",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "bold",
  },
});
