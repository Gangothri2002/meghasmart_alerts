# Quick Start Guide - Megha Smart

## Setup Instructions (Windows)

### Step 1: Open PowerShell or Command Prompt
Navigate to the project folder:
```powershell
cd "e:\Megha Smart"
```

### Step 2: Install Dependencies
Run the following command:
```powershell
npm install
```

This will install:
- Express.js (web framework)
- EJS (template engine)
- Body Parser (form handling)
- Express Session (authentication)
- And other dependencies

### Step 3: Start the Application
Run:
```powershell
npm start
```

You should see:
```
Megha Smart is running on http://localhost:3000
Login with:
  Email: admin@gmail.com
  Password: P@ssword1
```

### Step 4: Open in Browser
Go to: **http://localhost:3000**

### Step 5: Login
- **Email**: admin@gmail.com
- **Password**: P@ssword1

---

## Application Overview

### 📊 Dashboard
- View system statistics
- See total clients, devices, and alerts
- Check system health status
- Quick action buttons

### 👥 Clients
- Browse all 1000 registered clients
- View details: S.No, Flat No., Device ID, Name, Email, Phone
- Paginated display (20 per page)
- Expandable to 5000 capacity

### 🏘️ Community Device Mapping
- View all 1000 community devices
- Device-to-flat assignment
- Status and location information
- Capacity tracking (1000/5000)

### 🏪 Retail Devices
- Grid view of active retail devices
- Device details and firmware info
- Quick action buttons

### 🚨 Alert
- Monitor system alerts
- Filter by severity (High, Medium, Low)
- View alert history
- Resolve alerts

---

## Features

✅ **1000 Mock Clients** pre-loaded with realistic data
✅ **Pagination** for efficient data browsing
✅ **Responsive Design** works on desktop, tablet, mobile
✅ **Professional UI** with modern styling
✅ **Session Management** secure login/logout
✅ **Alert System** for device monitoring
✅ **Real-time Status** indicators and updates

---

## Sidebar Navigation

The sidebar always shows:
1. **Dashboard** 📊
2. **Clients** 👥
3. **Community Device Mapping** 🏘️
4. **Retail Devices** 🏪
5. **Alert** 🚨

Plus a **Logout** button at the bottom

---

## Development Mode

For automatic reload during development:
```powershell
npm run dev
```

This uses `nodemon` to restart the server on file changes.

---

## Browser Tips

- Press **Ctrl+Shift+Delete** to clear browser cache if needed
- Use **F12** to open Developer Tools
- Check the Console tab for any error messages

---

## Stopping the Server

Press **Ctrl+C** in the PowerShell/Command Prompt window

---

## Troubleshooting

**Port Already in Use?**
Change the port in server.js:
```javascript
const PORT = process.env.PORT || 3001;  // Changed from 3000
```

**Module Not Found?**
Run `npm install` again

**Can't Access http://localhost:3000?**
- Check if server is running
- Try `http://127.0.0.1:3000` instead
- Check firewall settings

---

## Default Credentials

```
Email: admin@gmail.com
Password: P@ssword1
```

These are hardcoded in `server.js` for demo purposes. 
For production, use a database and encrypt passwords!

---

## File Locations

- **Server Logic**: `server.js`
- **Templates**: `views/` folder
- **Styles**: `public/css/style.css`
- **Configuration**: `package.json`

---

## Next Steps

1. ✅ Install and run the app
2. ✅ Login with provided credentials
3. ✅ Explore all sections
4. ✅ Check data pagination
5. ✅ Review responsive design (resize browser)

Enjoy! 🚀
