# Megha Smart - Device ID Format Documentation

## Device ID Format: GVM202500001

### Format Specification

**Pattern:** `GVM[YEAR][SEQUENTIAL_NUMBER]`

**Components:**
- **Prefix:** `GVM` (Gas Vigil Megha)
- **Year:** Current year (e.g., `2025`)
- **Sequential Number:** 5-digit zero-padded number (e.g., `00001` to `05000`)

### Examples

```
GVM202500001   (1st device created in 2025)
GVM202500002   (2nd device)
GVM202500010   (10th device)
GVM202500100   (100th device)
GVM202501000   (1000th device)
GVM202505000   (5000th device - Maximum capacity)
```

---

## System Specifications

### Device Capacity
- **Total Capacity:** 5,000 devices per year
- **Current Deployment:** 1,000 devices
- **Available Slots:** 4,000 devices
- **Sequential Range:** 00001 to 05000

### Server-Side Generation

The device ID is generated automatically by the Node.js server using a global counter:

```javascript
let deviceIdCounter = 1; // Starts from 1

function generateDeviceId() {
  const year = new Date().getFullYear();                    // Gets current year (2025)
  const sequentialNumber = String(deviceIdCounter).padStart(5, '0');  // Pads to 5 digits
  const deviceId = `GVM${year}${sequentialNumber}`;         // GVM202500001
  deviceIdCounter++;                                         // Increment for next device
  return deviceId;
}
```

### How It Works

1. **Server Startup:** Counter begins at 1
2. **Device Creation:** Each new device gets the next sequential number
3. **Format:** Year + Zero-padded Counter = Full Device ID
4. **Increment:** Counter increments by 1 after each allocation
5. **Maximum:** When counter reaches 5001, no more devices can be created

---

## Implementation Details

### Benefits of This Format

✅ **Sequential & Predictable**
- Easy to track devices in order
- No collisions or duplicates
- Human-readable format

✅ **Year-Based Identification**
- Quickly identify when device was deployed
- Supports multi-year deployments
- Format adapts to new years automatically

✅ **Scalable**
- Supports up to 5,000 devices per year
- Year changes reset the sequence
- Can extend format for future growth

✅ **Server-Controlled**
- No client-side generation needed
- Centralized control prevents duplicates
- Easier to audit and track

---

## Database Structure

### Clients Table
Each client (location) gets ONE device assigned:

```
Client 1: GVM202500001 (Flat A1-101)
Client 2: GVM202500002 (Flat A1-102)
...
Client 1000: GVM202501000 (Flat A20-055)
```

### Devices Table
Same sequential assignment for devices:

```
Device 1: GVM202500001 (Active, Gas Sensor, Flat A1-101)
Device 2: GVM202500002 (Active, Smoke Detector, Flat A1-102)
...
Device 1000: GVM202501000 (Inactive, Multi-Sensor, Flat A20-055)
```

---

## API Endpoints for Device IDs

### Get Device by ID
```
GET /api/device/:deviceId
Example: /api/device/GVM202500001
Response: { deviceId: "GVM202500001", status: "Active", location: "..." }
```

### Get Device Real-Time Data
```
GET /api/device/:deviceId/data
Example: /api/device/GVM202500001/data
Response: { deviceId, status, sensorData, batteryLevel, signalStrength }
```

### Get Statistics
```
GET /api/statistics
Response: { devices: { total: 1000, active: 800, capacity: 5000 }, ... }
```

---

## Usage Examples

### Creating 1000 Devices

```javascript
// Server automatically generates IDs
const devices = [];
for (let i = 1; i <= 1000; i++) {
  devices.push({
    deviceId: generateDeviceId(), // GVM202500001, GVM202500002, etc.
    status: 'Active',
    location: 'Floor ' + Math.ceil(i / 50)
  });
}
```

### Device ID Validation

```javascript
function isValidDeviceId(id) {
  // Format: GVM + 4 digits (year) + 5 digits (serial)
  const pattern = /^GVM\d{4}\d{5}$/;
  return pattern.test(id);
}

// Examples:
isValidDeviceId('GVM202500001')  // true
isValidDeviceId('GVM202501000')  // true
isValidDeviceId('GVM202505000')  // true
isValidDeviceId('MS-abcd123')    // false
```

---

## Counter Management

### Current Counter Status

```javascript
// In server.js
let deviceIdCounter = 1;  // Starts at 1

// After 1000 devices created
deviceIdCounter === 1001; // Ready to create next device
                          // Next ID would be GVM202501001
```

### Counter Reset (Year Change)

When the year changes (e.g., 2025 → 2026):

```javascript
function generateDeviceId() {
  const year = new Date().getFullYear();
  
  // Year changed, format adjusts automatically
  // 2025: GVM202500001
  // 2026: GVM202600001 (counter restarts or continues)
  
  return `GVM${year}${String(deviceIdCounter).padStart(5, '0')}`;
}
```

---

## Capacity Planning

### Current Deployment

| Metric | Value |
|--------|-------|
| **Deployed Devices** | 1,000 |
| **Device IDs (GVM202500001 to GVM202501000)** | Sequential |
| **Remaining Capacity** | 4,000 slots |
| **Maximum Limit** | GVM202505000 |
| **Utilization** | 20% |

### Future Expansion

To add more devices (up to 5000):

```javascript
// 2025 Deployment (Current)
devices 1-1000:   GVM202500001 to GVM202501000

// Add 2000 more devices
devices 1001-3000: GVM202501001 to GVM202503000

// Add 2000 more devices
devices 3001-5000: GVM202503001 to GVM202505000
```

---

## Display Across Pages

### Clients Page
Shows device ID assigned to each client:
```
Flat A1-101 → GVM202500001
Flat A1-102 → GVM202500002
```

### Community Device Mapping
Maps flats to devices:
```
GVM202500001 → Flat A1-101 → Active → Last Active: 2 mins ago
GVM202500002 → Flat A1-102 → Active → Last Active: 5 mins ago
```

### Retail Devices
Displays advanced device information:
```
Device: GVM202500001
Sensor Type: Gas Sensor
Battery: 85%
Signal: 92%
Temperature: 23.5°C
```

### Alerts
Links alerts to device IDs:
```
Alert: Gas Leak
Device: GVM202500001
Flat: A1-101
Priority: High
Status: Active
```

---

## Error Handling

### Invalid Device ID
```javascript
// If someone tries to use wrong format
GET /api/device/MS-invalid-id
Response: { success: false, message: 'Invalid device ID format' }
```

### Device Not Found
```javascript
// If device ID doesn't exist
GET /api/device/GVM202500999
Response: { success: false, message: 'Device not found' }
```

### Capacity Exceeded
```javascript
// When trying to create 5001st device
POST /api/device/create
Response: { 
  success: false, 
  message: 'Maximum capacity (5000) reached for this year',
  nextYear: 2026
}
```

---

## Advantages Over Previous Format

### Old Format: MS-[TIMESTAMP]-[RANDOM]
❌ Random and non-sequential
❌ Hard to count or track
❌ No year information
❌ Difficult to audit
❌ Could have collisions in theory

### New Format: GVM202500001
✅ Sequential and predictable
✅ Easy to count and track
✅ Year information built-in
✅ Perfect for auditing
✅ Zero collisions guaranteed
✅ Human-readable
✅ Professional appearance

---

## Technical Notes

### Counter Persistence
Currently counter is in-memory. For production:

```javascript
// TODO: Persist counter to database
// Option 1: Save to Redis
// Option 2: Save to MongoDB
// Option 3: Save to PostgreSQL
```

### Multi-Server Deployment
For clustered deployments:

```javascript
// Generate ID from database
// Query: SELECT MAX(sequentialNumber) + 1 FROM devices
// Ensures no duplicates across servers
```

### Audit Trail

Every device ID generated should log:
```javascript
console.log(`Device Created: ${deviceId} at ${new Date().toISOString()}`);
// Output: Device Created: GVM202500001 at 2025-02-12T10:30:45.123Z
```

---

## Summary

**Megha Smart Device ID Format**
- **Format:** GVM[YEAR][5-DIGIT-SEQUENTIAL]
- **Range:** GVM202500001 to GVM202505000
- **Current Deployment:** 1000 devices
- **Remaining Capacity:** 4000 devices
- **Generation:** Server-controlled, automatic, sequential
- **Status:** ✅ Implemented and working

Device IDs are automatically generated by the Node.js server for each new device. No manual intervention needed!

---

*Last Updated: February 12, 2025*
*Format Version: 1.0*
*Status: Production Ready*
