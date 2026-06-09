# Megha Smart - Device Management System

A professional web-based device management system for managing smart devices in community and retail environments.

## Features

✅ **Secure Authentication** - Login with admin credentials
✅ **Dashboard** - Real-time statistics and system overview
✅ **Client Management** - 1000 clients with pagination (up to 5000 capacity)
✅ **Community Device Mapping** - Map devices to 1000 community flats
✅ **Retail Devices** - Monitor active retail devices
✅ **Alert Management** - Track and resolve system alerts
✅ **Professional UI** - Modern, responsive design
✅ **Pagination** - Efficient data browsing with pagination

## Login Credentials

```
Email: admin@gmail.com
Password: P@ssword1
```

## Installation

1. Install Node.js (if not already installed)

2. Navigate to the project directory:
```bash
cd "e:\Megha Smart"
```

3. Install dependencies:
```bash
npm install
```

## Running the Application

```bash
npm start
```

The application will run on `http://localhost:3000`

For development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
Megha Smart/
├── public/
│   └── css/
│       └── style.css
├── views/
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── clients.ejs
│   ├── community-devices.ejs
│   ├── retail-devices.ejs
│   └── alerts.ejs
├── server.js
├── package.json
└── README.md
```

## Data Specifications

### Clients Section
- **Total Clients**: 1000 (expandable to 5000)
- **Columns**: S.No, Flat No., Device ID, Customer Name, Email, Phone, Registration Date
- **Pagination**: 20 clients per page

### Community Device Mapping
- **Total Devices**: 1000 (corresponding to 1000 flats)
- **Columns**: S.No, Flat No., Device ID, Status, Last Active, Location
- **Capacity**: Up to 5000 devices
- **Structure**: 1 flat = 1 device = 1 customer

### Retail Devices
- **Display**: Grid view of active retail devices
- **Information**: Device ID, Status, Location, Flat No., Firmware Version, Last Active

### Alerts
- **Alert Types**: Gas Leak, Low Battery, Connection Lost, High Temperature, Maintenance Required
- **Severity Levels**: High, Medium, Low
- **Status**: Active or Resolved
- **Pagination**: 20 alerts per page

## Features Overview

### Dashboard
- Quick statistics for all key metrics
- Active alerts count
- System health status
- Quick action buttons

### Sidebar Navigation
The sidebar provides quick access to:
1. Dashboard
2. Clients
3. Community Device Mapping
4. Retail Devices
5. Alert

### Session Management
- Secure session-based authentication
- 24-hour session timeout
- Logout functionality

### Community Login Access
Six predefined community accounts are available. Each community can log in separately and view its own
community data pulled from the database. Data is displayed in a table (similar to an Excel sheet) and may
be downloaded as an Excel file.

Credentials are printed to the console on server start and also shown on the community login page; example
list:

```
customer1@meghasmart.com / pass1
customer2@meghasmart.com / pass2
customer3@meghasmart.com / pass3
customer4@meghasmart.com / pass4
customer5@meghasmart.com / pass5
customer6@meghasmart.com / pass6
```

Visit `http://localhost:3000/community-login` to access the portal.

## Customization

### Change Login Credentials
Edit the credentials in `server.js`:
```javascript
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'P@ssword1';
```

### Adjust Client Limit
Modify the `generateMockClients()` function parameter in `server.js` to change the number of mock clients.

### Database Integration
Replace the mock data generators with actual database queries for production use.

## Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: EJS Templates
- **Styling**: Custom CSS
- **Session Management**: express-session
- **Body Parser**: For form data parsing

## Browser Compatibility

- Chrome/Chromium
- Firefox
- Safari
- Edge

## Performance

- Lightweight and fast loading
- Efficient pagination (20 records per page)
- Responsive design for all devices
- CSS animations and transitions

## Support

For issues or feature requests, please contact the development team.

---

**Megha Smart Device Management System**
Version 1.0.0
