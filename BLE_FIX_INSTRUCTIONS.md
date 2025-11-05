# BLE (Bluetooth) Fix Instructions

## Problem
The error `Cannot read property 'createClient' of null` occurs because the `react-native-ble-plx` native module is not properly linked in your Expo development build.

## Solution

### 1. Clean the project
```powershell
cd C:\Users\Taraksh Goyal\Desktop\coding\sih_tele\admin-app
npx expo prebuild --clean
```

### 2. Rebuild the native Android app
Since you're using `expo-dev-client`, you need to rebuild the native code:

```powershell
npx expo run:android
```

**Important:** This will build a new development client with the BLE native modules properly linked.

### 3. Alternative: Build for development
If the above doesn't work, try:

```powershell
# Clear cache
npx expo start -c

# Or rebuild with EAS (if you have EAS configured)
eas build --profile development --platform android
```

## Changes Made

1. **app.json**: Added proper configuration for `react-native-ble-plx` plugin with:
   - Background mode support
   - Bluetooth permissions descriptions
   - iOS Info.plist entries

2. **blue_test.tsx**: Added try-catch error handling around BLE Manager initialization

## Why This Happens

- `react-native-ble-plx` requires native modules that need to be compiled into your app
- Using `expo start` or Metro bundler alone doesn't include native code changes
- You need to rebuild the native app when adding/modifying native modules

## Verify the Fix

After rebuilding, you should see the app load without the BLE error. If you still have issues:

1. Check Android permissions are granted in device settings
2. Ensure Bluetooth is enabled on your device
3. Check logcat for any additional native errors: `npx react-native log-android`

## Additional Notes

- The app now has proper Bluetooth configuration for both iOS and Android
- Background BLE is enabled for continuous scanning
- All required permissions are declared in the manifest
