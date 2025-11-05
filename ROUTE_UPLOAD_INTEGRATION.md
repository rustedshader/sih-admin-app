# Backend Route Upload Integration

## Overview
The admin app now automatically uploads recorded GPS routes to the backend server when recording stops. This ensures all route data is synchronized with the central database for the SURAKSHIT platform.

## How It Works

### 1. **Route Recording**
- Admin selects an offline activity from the dropdown
- Chooses GPS source (Mobile GPS or Bluetooth GPS)
- Starts recording the route
- GPS coordinates are collected in real-time

### 2. **Automatic Upload on Stop**
When the admin stops recording:
1. Route is saved locally to device storage (AsyncStorage)
2. Route is automatically uploaded to the backend API
3. Success/failure feedback is shown to the user

### 3. **API Endpoint**
```
POST https://api.surakshit.world/offline-activities/route-data
```

**Headers:**
- `Authorization: Bearer {access_token}` (from logged-in admin)
- `Content-Type: application/json`
- `Accept: application/json`

**Payload Format:**
```json
{
  "offline_activity_id": 123,
  "route_data": [
    [latitude1, longitude1],
    [latitude2, longitude2],
    [latitude3, longitude3]
    // ... more coordinate pairs
  ]
}
```

**Example:**
```json
{
  "offline_activity_id": 5,
  "route_data": [
    [30.0668, 79.0193],
    [30.0669, 79.0195],
    [30.0670, 79.0197]
  ]
}
```

## Features

### ✅ Automatic Sync
- Routes are automatically uploaded when recording stops
- No manual export/upload step required
- Admin is notified of success or failure

### 🔒 Authentication
- Uses the admin's JWT access token
- Automatically refreshes token if expired
- Secure Bearer token authentication

### 📱 Offline Resilience
- If upload fails (no network, server error), route is still saved locally
- Admin can view locally saved routes in "Saved Routes" screen
- Clear error messages explain what happened

### 📊 Upload Feedback
- **Success:** Shows confirmation with route stats (points, distance, sync status)
- **Failure:** Shows error message, route remains saved locally
- **Loading:** Visual indicator during upload process

## User Experience

### Success Flow
1. Admin stops recording
2. Loading spinner shows "Uploading to Server..."
3. Success alert appears:
   ```
   Success! 🎉
   Route for "Kedarnath Trek" has been saved and uploaded to the server.
   
   📍 245 points recorded
   📏 12.34 km total distance
   ✅ Synced with backend
   ```

### Error Flow
1. Admin stops recording
2. Upload fails (network/auth/server error)
3. Error alert appears:
   ```
   Route Saved Locally ⚠️
   Route saved on device but could not sync with server:
   
   [Error message]
   
   The route is safely stored locally and you can view it in Saved Routes.
   ```
   - Options: "OK" or "View Saved Routes"

## Technical Implementation

### New Service: `RouteService.ts`
Located at: `services/RouteService.ts`

**Key Methods:**
- `uploadRoute(activityId, coordinates)` - Upload a single route
- `uploadMultipleRoutes(routes[])` - Batch upload (future use)

**Error Handling:**
- Validates access token before upload
- Handles 401 errors (re-authentication needed)
- Provides detailed error messages
- Fails gracefully without losing data

### Updated Component: `gps-recording.tsx`
**Changes:**
- Added `RouteService` integration
- Modified `saveRecordedRoute()` to include upload
- Added `isUploadingRoute` state for loading indicators
- Enhanced error alerts with retry/navigation options

### Authentication Flow
1. RouteService gets access token from AuthService
2. If 401 response, prompts admin to re-login
3. Token is automatically included in all API requests
4. Refresh token handled by AuthService if needed

## Testing

### Test Successful Upload
1. Login as admin
2. Select an offline activity
3. Record a route (even just a few points)
4. Stop recording
5. Verify success alert shows "✅ Synced with backend"

### Test Failed Upload (No Network)
1. Turn off device WiFi/data
2. Record and stop a route
3. Verify warning alert shows "Route Saved Locally ⚠️"
4. Check "Saved Routes" screen - route should be there

### Test Backend Verification
Check backend database for the uploaded route data:
```sql
SELECT * FROM route_data WHERE offline_activity_id = [your_activity_id] ORDER BY created_at DESC LIMIT 1;
```

## API Response Codes

| Code | Meaning | App Behavior |
|------|---------|--------------|
| 200 | Success | Show success alert |
| 401 | Unauthorized | Prompt re-login |
| 400 | Bad Request | Show error with details |
| 500 | Server Error | Show error, data saved locally |

## Future Enhancements

### Planned Features
- [ ] Retry failed uploads automatically
- [ ] Upload queue for offline scenarios
- [ ] Batch upload multiple saved routes
- [ ] Progress bar for large route uploads
- [ ] Route thumbnail preview before upload
- [ ] Edit route metadata before upload

### Sync Status Indicator
Add status badge in Saved Routes screen:
- ✅ Synced
- ⏳ Pending Upload
- ⚠️ Upload Failed

## Environment Configuration

API base URL is configured via environment variable:
```env
EXPO_PUBLIC_API_URL=https://api.surakshit.world
```

Located in: `.env` file at project root

## Troubleshooting

### "No access token available"
**Cause:** Admin not logged in or token expired
**Fix:** Login again through the app

### "Route upload failed with status 400"
**Cause:** Invalid data format or missing activity ID
**Fix:** Ensure offline activity is selected before recording

### "Network request failed"
**Cause:** No internet connection
**Fix:** Route is saved locally; upload will need manual retry (future feature)

### "Authentication failed. Please login again"
**Cause:** Token expired or invalid
**Fix:** Logout and login again

## Support

For backend API issues, contact the backend team or check API documentation at:
`https://api.surakshit.world/docs`

For app integration issues, see:
- `services/RouteService.ts` - Upload logic
- `app/gps-recording.tsx` - UI integration
- `services/AuthService.ts` - Authentication
