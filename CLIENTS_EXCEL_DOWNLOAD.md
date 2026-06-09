# 📥 6 Clients Excel Download Feature

## ✅ Feature Implemented

You can now download **each of the 6 clients' data as separate Excel sheets** directly from the browser.

---

## 🎯 How It Works

### Each Client Gets Their Own Excel File With:
1. **Client Information Section**
   - Full Name
   - Flat Number
   - Email
   - Phone
   - Address
   - Status
   - Subscription Plan
   - Access Level
   - Registration Date
   - Location (Latitude & Longitude)

2. **Assigned Devices Section** (All devices for that client)
   - Device ID
   - Sensor Type
   - Status
   - Battery Level %
   - Signal Strength %
   - Location
   - Last Active Date

3. **Sensor Data Summary** (Latest readings)
   - Gas Level (ppm)
   - Temperature (°C)
   - Humidity (%)
   - Smoke Level (ppm)

---

## 🌐 Where to Download in Browser

### On the Clients Page (`/clients`)

1. Go to **Dashboard** → Click **Clients**
2. You'll see a table with all 6 clients
3. Each client row has an **Actions** column
4. Click the **📥 Download Excel** button (green download icon)
5. An Excel file will be downloaded with that client's name

### File Name Format
```
{ClientName}_YYYY-MM-DD.xlsx
```

**Examples:**
- `Rajesh_Kumar_2024-02-27.xlsx`
- `Priya_Singh_2024-02-27.xlsx`
- `Arjun_Patel_2024-02-27.xlsx`
- `Sneha_Sharma_2024-02-27.xlsx`
- `Vikram_Gupta_2024-02-27.xlsx`
- `Anjali_Khan_2024-02-27.xlsx`

---

## 🔌 Direct API Access

You can also access downloads via direct URLs:

```
http://localhost:3000/api/clients/0/download-excel  → Client 1 (Rajesh Kumar)
http://localhost:3000/api/clients/1/download-excel  → Client 2 (Priya Singh)
http://localhost:3000/api/clients/2/download-excel  → Client 3 (Arjun Patel)
http://localhost:3000/api/clients/3/download-excel  → Client 4 (Sneha Sharma)
http://localhost:3000/api/clients/4/download-excel  → Client 5 (Vikram Gupta)
http://localhost:3000/api/clients/5/download-excel  → Client 6 (Anjali Khan)
```

---

## 📊 Excel Sheet Example

Each Excel file contains:

```
┌─────────────────────────────────────────┐
│ Rajesh Kumar - Client Profile & Devices │
├─────────────────────────────────────────┤
│ Client Information                      │
├─────────────────────────────────────────┤
│ Full Name:        Rajesh Kumar          │
│ Flat No:          A1-1001               │
│ Email:            customer1@...com      │
│ Phone:            98...                 │
│ Address:          ...                   │
│ Status:           Active                │
│ Subscription:     Basic/Pro/Premium     │
│ Access Level:     Full/Read-only        │
│ Registration:     DD/MM/YYYY            │
│ Location:         Lat: ..., Lng: ...    │
├─────────────────────────────────────────┤
│ Assigned IoT Devices (Total: ~167)     │
├─────────────────────────────────────────┤
│ Device ID | Type | Status | Battery ... │
│ GVM2024... | Gas  | Active | 85% ...    │
│ GVM2024... | Temp | Active | 92% ...    │
│ ... (all devices for this client)       │
├─────────────────────────────────────────┤
│ Sensor Data Summary                     │
├─────────────────────────────────────────┤
│ Device ID | Gas | Temp | Humidity | ... │
│ GVM2024... | 25  | 22   | 55% ...      │
│ ... (sensor readings for each device)   │
└─────────────────────────────────────────┘
```

---

## 🎨 Professional Formatting

✅ Color-coded headers (Blue)
✅ Bold section titles
✅ Organized data layout
✅ Optimized column widths
✅ Professional appearance
✅ Ready to share with stakeholders

---

## 🔐 Security

- ✅ Only Admin and SuperAdmin can download
- ✅ Authentication required (must be logged in)
- ✅ Authorization checked on each download
- ✅ Error handling implemented

---

## 📋 6 Clients Available

| Index | Client Name | Email | Flat No |
|-------|------------|-------|---------|
| 0 | Rajesh Kumar | customer1@meghasmart.com | A1-1001 |
| 1 | Priya Singh | customer2@meghasmart.com | A1-1002 |
| 2 | Arjun Patel | customer3@meghasmart.com | A1-1003 |
| 3 | Sneha Sharma | customer4@meghasmart.com | A1-1004 |
| 4 | Vikram Gupta | customer5@meghasmart.com | A1-1005 |
| 5 | Anjali Khan | customer6@meghasmart.com | A1-1006 |

---

## ✨ Key Features

✅ **6 Separate Excel Files** - Each client downloads independently
✅ **Complete Data** - All devices (165-167 per client)
✅ **Device Details** - ID, Type, Status, Battery, Signal, Location
✅ **Sensor Readings** - Gas, Temperature, Humidity, Smoke levels
✅ **Professional Format** - Color-coded, well-organized sections
✅ **Easy Access** - Simple download button in browser
✅ **Date-Stamped** - File names include download date
✅ **Client-Specific** - Each file contains only that client's data

---

## 🚀 Testing

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Login with admin account:**
   - Email: `admin@gmail.com`
   - Password: `P@ssword1`

3. **Go to Clients page:**
   - Click "Clients" in sidebar

4. **Download a client's Excel:**
   - Find the client row
   - Click the **📥 Download Excel** button
   - Excel file will download automatically

5. **Open the file:**
   - It will open in Excel/LibreOffice/Google Sheets
   - Contains that client's information and all their devices

---

## 📝 Files Modified

1. **package.json** - Added exceljs dependency
2. **server.js** - Added:
   - ExcelJS import
   - New route for downloading client Excel files
3. **views/clients.ejs** - Added:
   - Download button in Actions column

---

## 💾 Implementation Details

### Backend Route (`server.js` - Line 597)
```javascript
app.get('/api/clients/:clientIndex/download-excel', checkAuth, (req, res) => {
  // Validates client index (0-5)
  // Creates Excel workbook with:
  //   - Client Information Section
  //   - All assigned devices (165-167 per client)
  //   - Sensor data summary
  // Sends file to browser with proper headers
});
```

### Frontend Button (`views/clients.ejs`)
```html
<a href="/api/clients/<%= idx %>/download-excel" 
   title="Download Excel">
  📥
</a>
```

---

## 🎯 Summary

- ✅ 6 separate Excel download options
- ✅ Each client has their own Excel file
- ✅ Complete device and sensor data included
- ✅ Professional formatting applied
- ✅ Easy to use from browser
- ✅ Secure with authentication
- ✅ Ready to use immediately

**Status**: ✅ COMPLETE & WORKING

---

## 📞 How to Use

1. Navigate to the **Clients** page in your browser
2. Find the client you want to download
3. Click the **📥 Download Excel** button in the Actions column
4. The Excel file will automatically download to your computer
5. Open it to see that client's information and all their devices

**That's it! Each client's data is now easily accessible as a separate Excel file.** 🎉
