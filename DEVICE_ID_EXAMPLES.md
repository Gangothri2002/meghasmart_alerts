# Device ID Examples - GVM202500001 Format

## 📋 Live Examples from Your System

### Clients with Device IDs

```
Client #1:    Rajesh Kumar   | Flat A1-101 | GVM202500001 | Active
Client #2:    Priya Singh    | Flat A1-102 | GVM202500002 | Active
Client #3:    Arjun Patel    | Flat A1-103 | GVM202500003 | Active
Client #4:    Sneha Sharma   | Flat A1-104 | GVM202500004 | Inactive
Client #5:    Vikram Gupta   | Flat A1-105 | GVM202500005 | Active

...

Client #100:  [Name]         | Flat A5-050 | GVM202500100 | Active

...

Client #1000: Pooja Desai    | Flat A20-055| GVM202501000 | Inactive
```

---

## 📊 Device Examples with Sensor Data

### Device #1: GVM202500001
```
┌─────────────────────────────────┐
│ Device ID:      GVM202500001    │
│ Flat:           A1-101          │
│ Sensor Type:    Gas Sensor      │
│ Status:         Active ✅        │
│ Battery:        85%             │
│ Signal:         92%             │
│                                 │
│ Sensor Data:                    │
│ - Temperature:  23.5°C          │
│ - Gas Level:    45.2 ppm        │
│ - Humidity:     55%             │
│ - Smoke:        8.3 ppm         │
│                                 │
│ Last Sync:      2 mins ago      │
│ Connection:     WiFi            │
│ Firmware:       v2.1.0          │
│ Status:         Good ✓          │
└─────────────────────────────────┘
```

### Device #2: GVM202500002
```
┌─────────────────────────────────┐
│ Device ID:      GVM202500002    │
│ Flat:           A1-102          │
│ Sensor Type:    Smoke Detector  │
│ Status:         Active ✅        │
│ Battery:        72%             │
│ Signal:         88%             │
│                                 │
│ Sensor Data:                    │
│ - Temperature:  24.1°C          │
│ - Gas Level:    38.7 ppm        │
│ - Humidity:     48%             │
│ - Smoke:        2.1 ppm         │
│                                 │
│ Last Sync:      5 mins ago      │
│ Connection:     Zigbee          │
│ Firmware:       v2.1.0          │
│ Status:         Good ✓          │
└─────────────────────────────────┘
```

### Device #10: GVM202500010
```
┌─────────────────────────────────┐
│ Device ID:      GVM202500010    │
│ Flat:           A2-010          │
│ Sensor Type:    Multi-Sensor    │
│ Status:         Inactive ⚠️      │
│ Battery:        42%             │
│ Signal:         25%             │
│                                 │
│ Sensor Data:                    │
│ - Temperature:  22.8°C          │
│ - Gas Level:    15.0 ppm        │
│ - Humidity:     52%             │
│ - Smoke:        0.5 ppm         │
│                                 │
│ Last Sync:      3 hours ago     │
│ Connection:     LoRaWAN         │
│ Firmware:       v2.1.0          │
│ Status:         Needs Attention │
└─────────────────────────────────┘
```

### Device #100: GVM202500100
```
┌─────────────────────────────────┐
│ Device ID:      GVM202500100    │
│ Flat:           A5-050          │
│ Sensor Type:    Temperature Sen │
│ Status:         Active ✅        │
│ Battery:        95%             │
│ Signal:         98%             │
│                                 │
│ Sensor Data:                    │
│ - Temperature:  25.3°C          │
│ - Gas Level:    20.4 ppm        │
│ - Humidity:     60%             │
│ - Smoke:        1.2 ppm         │
│                                 │
│ Last Sync:      1 min ago       │
│ Connection:     Cellular        │
│ Firmware:       v2.1.0          │
│ Status:         Excellent ✓     │
└─────────────────────────────────┘
```

### Device #1000: GVM202501000
```
┌─────────────────────────────────┐
│ Device ID:      GVM202501000    │
│ Flat:           A20-055         │
│ Sensor Type:    Humidity Sensor │
│ Status:         Inactive ⚠️      │
│ Battery:        15%             │
│ Signal:         12%             │
│                                 │
│ Sensor Data:                    │
│ - Temperature:  19.2°C          │
│ - Gas Level:    5.1 ppm         │
│ - Humidity:     78%             │
│ - Smoke:        0.0 ppm         │
│                                 │
│ Last Sync:      1 week ago      │
│ Connection:     WiFi            │
│ Firmware:       v2.1.0          │
│ Status:         Low Battery     │
└─────────────────────────────────┘
```

---

## 🚨 Alert Examples with Device IDs

### Alert #1: GVM202500001 - Gas Leak
```
🔴 CRITICAL ALERT
┌────────────────────────────────┐
│ Alert Type:     Gas Leak       │
│ Severity:       High 🔴         │
│ Device ID:      GVM202500001   │
│ Flat:           A1-101         │
│ Detected Value: 145.8 ppm      │
│ Ticket ID:      TKT-000001     │
│ Status:         Active         │
│ Timestamp:      2 mins ago     │
│                                │
│ Actions:                       │
│ [👁️ Acknowledge] [✓ Resolve]  │
└────────────────────────────────┘
```

### Alert #5: GVM202500005 - Low Battery
```
🟠 MEDIUM ALERT
┌────────────────────────────────┐
│ Alert Type:     Low Battery    │
│ Severity:       Medium 🟠       │
│ Device ID:      GVM202500005   │
│ Flat:           A1-105         │
│ Battery:        8% (Critical)  │
│ Ticket ID:      TKT-000005     │
│ Status:         Active         │
│ Timestamp:      15 mins ago    │
│                                │
│ Actions:                       │
│ [👁️ Acknowledge] [✓ Resolve]  │
└────────────────────────────────┘
```

### Alert #23: GVM202500023 - High Temperature
```
🔴 CRITICAL ALERT
┌────────────────────────────────┐
│ Alert Type:     High Temp      │
│ Severity:       High 🔴         │
│ Device ID:      GVM202500023   │
│ Flat:           A2-043         │
│ Temperature:    38.5°C         │
│ Ticket ID:      TKT-000023     │
│ Status:         Active         │
│ Timestamp:      8 mins ago     │
│                                │
│ Actions:                       │
│ [👁️ Acknowledge] [✓ Resolve]  │
└────────────────────────────────┘
```

### Alert #50: GVM202500567 - Maintenance Required
```
🟡 LOW ALERT
┌────────────────────────────────┐
│ Alert Type:     Maintenance    │
│ Severity:       Low 🟡          │
│ Device ID:      GVM202500567   │
│ Flat:           A11-067        │
│ Maintenance:    Upcoming       │
│ Ticket ID:      TKT-000050     │
│ Status:         Resolved ✓     │
│ Timestamp:      3 days ago     │
│                                │
│ Resolved by:    Admin User     │
│ Resolution:     Service Done   │
└────────────────────────────────┘
```

---

## 📱 Device ID Sequence

### First 10 Devices
```
GVM202500001 ← Flat A1-101 → Gas Sensor
GVM202500002 ← Flat A1-102 → Smoke Detector
GVM202500003 ← Flat A1-103 → Temperature Sensor
GVM202500004 ← Flat A1-104 → Humidity Sensor
GVM202500005 ← Flat A1-105 → Multi-Sensor
GVM202500006 ← Flat A2-106 → Gas Sensor
GVM202500007 ← Flat A2-107 → Smoke Detector
GVM202500008 ← Flat A2-108 → Temperature Sensor
GVM202500009 ← Flat A2-109 → Humidity Sensor
GVM202500010 ← Flat A2-110 → Multi-Sensor
```

### By Every 100
```
GVM202500001 - 0100 ← Devices 1-100 (Flats A1-101 to A5-050)
GVM202500101 - 0200 ← Devices 101-200 (Flats A6-051 to A10-100)
GVM202500201 - 0300 ← Devices 201-300 (Flats A11-101 to A15-150)
GVM202500301 - 0400 ← Devices 301-400 (Flats A16-151 to A20-200)
...
GVM202500901 - 1000 ← Devices 901-1000 (Flats A46-451 to A50-500)
```

### Last 10 Devices (Currently Deployed)
```
GVM202500991 ← Flat A49-891 → Gas Sensor
GVM202500992 ← Flat A49-892 → Smoke Detector
GVM202500993 ← Flat A49-893 → Temperature Sensor
GVM202500994 ← Flat A49-894 → Humidity Sensor
GVM202500995 ← Flat A49-895 → Multi-Sensor
GVM202500996 ← Flat A50-496 → Gas Sensor
GVM202500997 ← Flat A50-497 → Smoke Detector
GVM202500998 ← Flat A50-498 → Temperature Sensor
GVM202500999 ← Flat A50-499 → Humidity Sensor
GVM202501000 ← Flat A50-500 → Multi-Sensor [LAST OF 1000]
```

### Next Available (Ready for Expansion)
```
GVM202501001 ← Ready for Device #1001
GVM202501002 ← Ready for Device #1002
GVM202501003 ← Ready for Device #1003
...
GVM202503000 ← Ready for Device #2000
...
GVM202505000 ← Ready for Device #5000 (Maximum)
```

---

## 🎯 Summary

**Device ID Format:** `GVM[YEAR][5-DIGIT-SEQUENTIAL]`

**Examples:**
```
✅ GVM202500001 (1st device)
✅ GVM202500002 (2nd device)
✅ GVM202500010 (10th device)
✅ GVM202500100 (100th device)
✅ GVM202501000 (1000th device - Currently deployed)
⏳ GVM202501001 (1001st device - Ready to add)
⏳ GVM202505000 (5000th device - Maximum)
❌ GVM202505001 (Exceeds capacity)
```

**Key Facts:**
- 1000 devices currently deployed
- 4000 slots available for expansion
- Maximum capacity: 5000 devices per year
- Year 2026: Format will auto-change to GVM2026XXXXX
- All IDs are sequential and guaranteed unique

---

**Your Megha Smart application is now using the GVM202500001 device ID format!** ✅
