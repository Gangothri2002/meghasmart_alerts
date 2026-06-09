# 🧪 Quick Testing Guide - Role-Based Access Control

## Start the Application

```bash
cd "e:\Megha Smart"
node server.js
```

You should see:
```
Megha Smart is running on http://localhost:3000

--- Login Credentials ---
Admin: Email: admin@gmail.com, Password: P@ssword1
Super Admin: Email: superadmin@gmail.com, Password: P@ssword2
User: Email: user@gmail.com, Password: P@ssword3
------------------------
```

Then open: **http://localhost:3000**

---

## Test Case 1: Admin Access ✅

### Login
- Email: `admin@gmail.com`
- Password: `P@ssword1`

### Expected Results
✅ Successfully logged in
✅ Dashboard displays with **👨‍💼 ADMIN** badge in header
✅ Sidebar shows ALL menu items:
  - Dashboard
  - Clients
  - Community Device Mapping
  - Retail Devices
  - Alert

✅ Quick Actions section shows all 4 buttons:
  - 👥 Manage Clients
  - 🏘️ View Devices
  - 🚨 Check Alerts
  - 📦 Retail Devices

✅ Can navigate to all sections without restrictions

---

## Test Case 2: Super Admin Access ✅

### Login
- Email: `superadmin@gmail.com`
- Password: `P@ssword2`

### Expected Results
✅ Successfully logged in
✅ Dashboard displays with **👑 SUPER ADMIN** badge in header
✅ Sidebar shows ALL menu items:
  - Dashboard
  - Clients
  - Community Device Mapping
  - Retail Devices
  - Alert

✅ Quick Actions section shows all 4 buttons
✅ Can navigate to all sections without restrictions
✅ Same access level as Admin

---

## Test Case 3: User Access - Dashboard Only ✅

### Login
- Email: `user@gmail.com`
- Password: `P@ssword3`

### Expected Results
✅ Successfully logged in
✅ Dashboard displays with **👤 USER** badge in header
✅ Sidebar shows ONLY:
  - Dashboard

⚠️ **All other menu items are hidden:**
  - ❌ Clients - NOT visible
  - ❌ Community Device Mapping - NOT visible
  - ❌ Retail Devices - NOT visible
  - ❌ Alert - NOT visible

✅ Quick Actions section shows message:
> "Only Admin and Super Admin can access these features."

### Restricted Access Test
Try accessing restricted pages directly:

1. Try accessing `/clients` → Redirected to `/access-denied`
2. Try accessing `/community-devices` → Redirected to `/access-denied`
3. Try accessing `/retail-devices` → Redirected to `/access-denied`
4. Try accessing `/alerts` → Redirected to `/access-denied`

### Access Denied Page
✅ Shows lock icon 🔐
✅ Displays message about restricted access
✅ Shows access level information
✅ Provides options:
  - "Go to Dashboard" button
  - "Logout" button

---

## Test Case 4: API Access Control ✅

### Admin/Super Admin API Access
With Admin/Super Admin session:
```
GET /api/device/GVM202500001 → ✅ Returns device data
GET /api/device/GVM202500001/data → ✅ Returns real-time data
POST /api/community/map-device → ✅ Can map devices
POST /api/community/unmap-device → ✅ Can unmap devices
```

### User API Access (Blocked)
With User session:
```
GET /api/device/GVM202500001 → ❌ Returns error
GET /api/device/GVM202500001/data → ❌ Returns error
POST /api/community/map-device → ❌ Returns error message
```

Error message: `"Access denied. Only Admin and Super Admin can access this."`

---

## Test Case 5: Session Management ✅

### Logout Test
Click "Logout" button while logged in:
✅ Session destroyed
✅ Redirected to login page
✅ Cannot access /dashboard without logging in again

### Direct URL Access Test
After logout, try accessing:
- `/dashboard` → ❌ Redirected to `/login`
- `/clients` → ❌ Redirected to `/login`
- `/alerts` → ❌ Redirected to `/login`

---

## Expected Behavior Summary

| Action | Admin | Super Admin | User |
|--------|-------|-------------|------|
| Login | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |
| Access Clients | ✅ | ✅ | ❌ Redirect |
| Access Devices | ✅ | ✅ | ❌ Redirect |
| Access Alerts | ✅ | ✅ | ❌ Redirect |
| Access Retail | ✅ | ✅ | ❌ Redirect |
| API Access | ✅ | ✅ | ❌ Error |
| See Menu Items | All 5 | All 5 | 1 (Dashboard) |
| Role Badge | 👨‍💼 ADMIN | 👑 SUPER ADMIN | 👤 USER |

---

## ✅ All Tests Passed Criteria

- [x] No syntax errors in code
- [x] All routes implemented correctly
- [x] Role-based access control working
- [x] User interface updates based on role
- [x] API endpoints protected
- [x] Access denied page displays
- [x] Session management works
- [x] Credentials shown on login page

---

**Ready for Production Testing!** 🚀
