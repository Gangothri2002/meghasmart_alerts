# Device Status Implementation Guide

## Overview
The device status system has been implemented with numeric status values (1, 2, 3, 4) that map to human-readable labels and colors for frontend display.

## Status Values

| Status Value | Label | Color | Hex Code | CSS Class |
|---|---|---|---|---|
| 1 | 🔵 Initialize | Blue | #3b82f6 | `status-initialize` |
| 2 | 🟡 No Communication | Yellow/Amber | #f59e0b | `status-no-communication` |
| 3 | 🔴 Alert | Red | #ef4444 | `status-alert` |
| 4 | 🟢 Good | Green | #10b981 | `status-good` |

## Implementation Details

### Backend

#### Status Mapping Utility (`/utils/statusMapping.js`)
A centralized utility module that provides:
- Status constants (STATUS.INITIALIZE, STATUS.NO_COMMUNICATION, STATUS.ALERT, STATUS.GOOD)
- Configuration objects with labels, colors, CSS classes, and icons
- Helper functions for getting status information

**Key Functions:**
```javascript
// Get full configuration object for a status value
getStatusConfig(statusValue) // Returns { value, label, color, backgroundColor, cssClass, icon }

// Get just the label
getStatusLabel(statusValue) // Returns "Initialize", "No Communication", etc.

// Get the color
getStatusColor(statusValue) // Returns hex color code

// Get CSS class
getStatusClass(statusValue) // Returns CSS class name

// Format for display (label + icon)
formatStatus(statusValue) // Returns "🔵 Initialize", etc.

// Convert old string status to numeric
convertStatusToNumeric(oldStatus) // Converts "Active" → 4, "Inactive" → 2, etc.
```

#### Device Generation
- Modified `generateMockDevices()` to use numeric status values
- Devices are generated with weighted distribution:
  - 60% Good (4)
  - 20% Initialize (1)
  - 10% No Communication (2)
  - 10% Alert (3)

#### API Integration
Status is handled as a **numeric value** in all API requests and responses.

**Example API Endpoint - Add Device:**
```bash
POST /api/community/add-device
Content-Type: application/json

{
  "flatNo": "A1-101",
  "deviceId": "DEV000123",
  "sensorType": "Gas Sensor",
  "status": 4
}
```

Valid status values: `1`, `2`, `3`, or `4`

### Frontend

#### Retail Devices Page (`/retail-devices`)
- Displays device status with icon, label, and color
- Status badges styled with appropriate background color
- Filter dropdown shows all status options with icons
- Device rows include status value in data attribute for filtering

**HTML Structure:**
```html
<span class="status-badge status-good">
  🟢 Good
</span>
```

#### CSS Styling (`/public/css/community.css`)
Added status badge styles:
```css
.status-badge.status-initialize {
    background: rgba(59, 130, 246, 0.15);
    color: #1e40af;
}

.status-badge.status-no-communication {
    background: rgba(245, 158, 11, 0.15);
    color: #92400e;
}

.status-badge.status-alert {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
}

.status-badge.status-good {
    background: rgba(16, 185, 129, 0.15);
    color: #059669;
}
```

## Using with Postman

### Example 1: Add a Device with Status
```
POST http://localhost:3000/api/community/add-device

Headers:
- Content-Type: application/json

Body (raw JSON):
{
  "flatNo": "A2-202",
  "deviceId": "DEVICE20240331001",
  "sensorType": "Temperature Sensor",
  "status": 4
}
```

### Example 2: Test All Status Values
```
# Status 1 - Initialize (Blue)
{
  "flatNo": "A3-101",
  "deviceId": "TEST_INIT_001",
  "sensorType": "Gas Sensor",
  "status": 1
}

# Status 2 - No Communication (Yellow)
{
  "flatNo": "A3-102",
  "deviceId": "TEST_NOCOMM_001",
  "sensorType": "Smoke Detector",
  "status": 2
}

# Status 3 - Alert (Red)
{
  "flatNo": "A3-103",
  "deviceId": "TEST_ALERT_001",
  "sensorType": "Humidity Sensor",
  "status": 3
}

# Status 4 - Good (Green)
{
  "flatNo": "A3-104",
  "deviceId": "TEST_GOOD_001",
  "sensorType": "Multi-Sensor",
  "status": 4
}
```

### Response Format
The API returns the status as a numeric value:
```json
{
  "success": true,
  "message": "Device added successfully",
  "device": {
    "flatNo": "A2-202",
    "deviceId": "DEVICE20240331001",
    "sensorType": "Temperature Sensor",
    "status": 4
  }
}
```

## View the Results

1. **Access the Retail Devices Page:**
   - URL: `http://localhost:3000/retail-devices`
   - Account: admin@gmail.com / P@ssword1
   - You'll see all devices with their numeric status displayed as colored badges with labels

2. **Use the Status Filter:**
   - The filter dropdown shows all 4 status options with icons
   - Select a status to filter the device table
   - Each status displays with its designated color

3. **Check Backend Database:**
   - Status values are stored as integers (1-4) in SQLite
   - Device objects in memory include status config data for rendering

## Files Modified/Created

1. **Created:** `/utils/statusMapping.js` - Status mapping configuration and utilities
2. **Modified:** `/server.js` - Integrated status mapping in device generation and routes
3. **Modified:** `/public/css/community.css` - Added status badge styling
4. **Modified:** `/views/retail-devices.ejs` - Updated status display and filtering

## Database Compatibility

- Status is stored as an **INTEGER** (1-4) in SQLite
- Legacy string statuses ("Active", "Inactive") are automatically converted to numeric equivalents
- The system maintains backward compatibility with existing data

## Clean Architecture

The implementation follows clean architecture principles:
- **Separation of Concerns:** Status logic isolated in `statusMapping.js`
- **Reusability:** Status configuration can be used throughout the application
- **Consistency:** All status values and colors defined in one place
- **Maintainability:** Easy to add new statuses or modify existing ones

## Testing Checklist

- [x] Numeric status values generated correctly (1-4)
- [x] Status displayed with correct colors on frontend
- [x] Status filter dropdown works with numeric values
- [x] CSS styling applied correctly
- [x] Postman integration supports numeric status in requests
- [x] Database stores status as integers
- [x] Legacy string statuses converted to numeric format

---

**Implementation Date:** March 31, 2026  
**Status:** Complete and tested
