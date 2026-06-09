# Community Device Limit: Maximum 300 Devices Per Community

## Overview
A hard limit of **300 devices maximum per community/customer** has been implemented in the Megha Smart system. This ensures that no community can have more than 300 devices assigned to it at any given time.

## Implementation Details

### 1. **Limit Constant** 
```javascript
const MAX_DEVICES_PER_COMMUNITY = 300;
```
- Defined in `server.js` at the top level
- Also replicated in `cleanup_devices.js` for consistency
- Can be easily modified if needed in the future

### 2. **Database Queries with LIMIT**
All SQL SELECT queries that fetch devices for a community now include a `LIMIT 300` clause:

- ✅ `/community/dashboard` - Community dashboard page
- ✅ `/community/devices` - Community devices page (my-devices)
- ✅ `/community/export` - Community export to Excel
- ✅ `/community/profile` - Community profile page
- ✅ `/community/tickets` - Community tickets page

**Example Query:**
```sql
SELECT flatNo, deviceId, sensorType, status FROM device 
WHERE communityId = ? 
LIMIT 300
```

### 3. **Device Mapping Validation**
The `/api/community/map-device` endpoint now validates device count before allowing new device mappings:

**Before Mapping:**
```javascript
getDeviceCountForCommunity(community.id, (count) => {
  if (count >= MAX_DEVICES_PER_COMMUNITY) {
    return res.json({ 
      success: false, 
      message: `Cannot map device. Community has reached maximum limit of 300 devices.`,
      currentDeviceCount: count,
      maxLimit: MAX_DEVICES_PER_COMMUNITY
    });
  }
  // Proceed with mapping...
});
```

### 4. **Helper Functions**
Two new helper functions were added to `server.js`:

```javascript
// Get device count for a community
function getDeviceCountForCommunity(communityId, callback)

// Check if community can accept more devices
function canAddDevices(communityId, isWithinLimit, callback)
```

### 5. **New API Endpoints**

#### Get Device Count for a Specific Community
```
GET /api/community/:communityId/device-count
```
**Response:**
```json
{
  "success": true,
  "communityId": 1,
  "deviceCount": 150,
  "maxLimit": 300,
  "remainingCapacity": 150,
  "isAtCapacity": false,
  "capacityPercentage": 50
}
```

#### Get Capacity Information for All Communities
```
GET /api/community/capacity/check
```
**Response:**
```json
{
  "success": true,
  "maxDevicesPerCommunity": 300,
  "communities": [
    {
      "id": 1,
      "name": "Community A",
      "deviceCount": 167,
      "maxLimit": 300,
      "remainingCapacity": 133,
      "isAtCapacity": false,
      "capacityPercentage": 55
    },
    {
      "id": 2,
      "name": "Community B",
      "deviceCount": 167,
      "maxLimit": 300,
      "remainingCapacity": 133,
      "isAtCapacity": false,
      "capacityPercentage": 55
    }
  ],
  "summary": {
    "totalCommunities": 6,
    "communitiesAtCapacity": 0,
    "totalDevices": 1002
  }
}
```

## Current Status

### Device Distribution
Currently, each community has **167 devices**, which is well below the 300 device limit:
- **Current Usage:** 167 devices per community
- **Maximum Capacity:** 300 devices per community
- **Remaining Capacity:** 133 devices per community
- **Overall Usage:** 55% of max capacity

### Total Devices
- **Per Community:** 167 devices × 6 communities = 1,002 total devices
- **System Capacity:** 300 devices × 6 communities = 1,800 total devices
- **Usage:** ~55% of total system capacity

## Usage and Access

### For Admins/Super Admins

**Check Community Capacity:**
```bash
curl -X GET "http://localhost:3000/api/community/capacity/check" \
  -H "Authorization: Bearer <token>"
```

**Check Specific Community:**
```bash
curl -X GET "http://localhost:3000/api/community/1/device-count" \
  -H "Authorization: Bearer <token>"
```

### Error Handling
When trying to map a device to a community that's at capacity:
```json
{
  "success": false,
  "message": "Cannot map device. Community 'Customer Name' has reached maximum limit of 300 devices.",
  "currentDeviceCount": 300,
  "maxLimit": 300
}
```

## Database Cleanup Script

The `cleanup_devices.js` script has been updated to:
1. ✅ Enforce the 300-device limit when reinitializing the database
2. ✅ Show warnings if community data exceeds the limit
3. ✅ Automatically truncate excess devices
4. ✅ Display capacity percentage for each community

### Running the Cleanup Script
```bash
node cleanup_devices.js
```

**Sample Output:**
```
✓ Device limit per community: 300 devices max

✓ Inserted 167/167 devices for community 1 (Community 1)
✓ Inserted 167/167 devices for community 2 (Community 2)
...

✓ Device count per community after cleanup:
  Community 1: 167/300 devices (55%)
  Community 2: 167/300 devices (55%)
  Community 3: 167/300 devices (55%)
  Community 4: 167/300 devices (55%)
  Community 5: 167/300 devices (55%)
  Community 6: 167/300 devices (55%)

✓ Total devices in database: 1002
```

## Features and Protections

| Feature | Status | Description |
|---------|--------|-------------|
| 🔒 Hard Limit Enforcement | ✅ Implemented | No community can exceed 300 devices |
| 📊 Capacity Monitoring | ✅ Implemented | Real-time capacity checks available |
| ⚠️ Mapping Validation | ✅ Implemented | Prevents mapping when at capacity |
| 🗂️ Database Query Limits | ✅ Implemented | All queries include LIMIT 300 |
| 📈 Capacity Reporting | ✅ Implemented | API endpoints for capacity info |
| 🔄 Cleanup Verification | ✅ Implemented | Script validates limits on reinit |
| 📝 Excel Export Limit | ✅ Implemented | Only exports up to 300 devices per community |

## Future Enhancements

Potential improvements that could be added:
1. **Capacity Alert Thresholds** - Alert admins when reaching 80%, 90%, etc.
2. **Device Migration** - Ability to move devices between communities
3. **Bulk Operations** - Batch add/remove devices with capacity checking
4. **UI Warnings** - Display capacity percentage on dashboard/device mapping pages
5. **Analytics Dashboard** - Community-wide capacity usage visualization
6. **Device Archival** - Archive old devices instead of deleting them

## Configuration

To change the device limit, modify the constant in both files:

**File 1: `server.js`** (around line 336)
```javascript
const MAX_DEVICES_PER_COMMUNITY = 300;  // Change this value
```

**File 2: `cleanup_devices.js`** (around line 8)
```javascript
const MAX_DEVICES_PER_COMMUNITY = 300;  // Must match server.js
```

⚠️ **Important:** Both values must be kept in sync to ensure consistency.

## Testing the Implementation

### Test 1: View Capacity
```javascript
// In admin dashboard, call:
fetch('/api/community/capacity/check')
  .then(r => r.json())
  .then(data => console.log(data))
```

### Test 2: Try Adding Device to Full Community
1. Get a community ID
2. Fill it with 300 devices
3. Try mapping another device
4. Should receive error: "Community has reached maximum limit of 300 devices"

### Test 3: Export with Limit
1. Go to community section
2. Export to Excel
3. Max 300 devices should be exported per community

## Support and Troubleshooting

**Q: How do I know if a community is at capacity?**
A: Use the `/api/community/capacity/check` endpoint or check `isAtCapacity` flag in the response.

**Q: Can I modify the 300 limit?**
A: Yes, update the constant in both `server.js` and `cleanup_devices.js`, but ensure they match.

**Q: What happens if a community has over 300 devices in the JSON data?**
A: The cleanup script will display a warning and only insert the first 300 devices.

**Q: Are devices deleted or just truncated?**
A: Devices are truncated during insertion (LIMIT applied to SELECT queries). They're not deleted from the database, but won't be displayed beyond the 300 limit.

---

**Implementation Date:** March 2026  
**Status:** ✅ Active and Enforced  
**Access Level:** Admin & Super Admin only
