# 🔐 Access Control Flow Diagram

## Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOGIN PAGE                                       │
│                   http://localhost:3000/login                            │
│                                                                           │
│  📋 Available Credentials:                                               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ 👨‍💼 Admin        | superadmin@gmail.com | 👑 Super Admin                 │
│  │ P@ssword1       | P@ssword2            | P@ssword3              │
│  │ ✅ Full Access  | ✅ Full Access       | ❌ Limited Access       │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                        Enter Email & Password
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       LOGIN VALIDATION                                    │
│                    (server.js /login route)                              │
│                                                                           │
│  1. Check if user exists in USERS object                               │
│  2. Verify password matches                                             │
│  3. If valid: Assign role to session                                    │
│     req.session.role = 'admin' | 'superadmin' | 'user'                 │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                    Valid Login / Invalid Login
                      ✅            │            ❌
                      │             │             │
         ┌────────────┴─────┐       │        Show Error
         │                  │       │        Refresh Login
         ▼                  ▼       │
    ┌──────────────────────────┐   │
    │ DASHBOARD REDIRECT       │   │
    │ /dashboard (GET)         │   │
    └──────────────────────────┘   │
         │                          │
    Role Check                      │
         │                          │
    ┌────┴────┐                    │
    │          │                    │
    ▼          ▼                    │
ADMIN/SA       USER         (Loop back to login)
    │           │
    │           └──────────────────┐
    ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│    SHOW DASHBOARD    │      │   SHOW DASHBOARD     │
│ Role Badge: ADMIN    │      │ Role Badge: USER     │
│                      │      │                      │
│ Sidebar Menu:        │      │ Sidebar Menu:        │
│ ✅ Dashboard         │      │ ✅ Dashboard         │
│ ✅ Clients           │      │ ❌ Clients (HIDDEN)  │
│ ✅ Dev Mapping       │      │ ❌ Dev Mapping       │
│ ✅ Retail Devices    │      │ ❌ Retail Devices    │
│ ✅ Alerts            │      │ ❌ Alerts            │
│                      │      │                      │
│ Quick Actions:       │      │ Quick Actions:       │
│ 4 Buttons            │      │ Message Only         │
└──────────────────────┘      └──────────────────────┘
         │                            │
         │                            │
    Can Access          User Tries to Access
    All Pages           Restricted Page
         │              (e.g., /clients)
         │                    │
         │                    ▼
         │            ┌───────────────────┐
         │            │ ROUTE CHECK       │
         │            │ if (role !== admin│
         │            │  && role !== sa)  │
         │            └───────────────────┘
         │                    │
         │                    ▼
         │            ┌───────────────────┐
         │            │ REDIRECT TO       │
         │            │ /access-denied    │
         │            └───────────────────┘
         │                    │
         │                    ▼
         │            ┌───────────────────┐
         │            │  ACCESS DENIED    │
         │            │     PAGE          │
         │            │                   │
         │            │ 🔐 Message        │
         │            │ "Access Denied"   │
         │            │                   │
         │            │ Buttons:          │
         │            │ [Dashboard]       │
         │            │ [Logout]          │
         │            └───────────────────┘
         │
         └─ All Routes Protected:
            • /clients ✅
            • /community-devices ✅
            • /retail-devices ✅
            • /alerts ✅
            • /api/device/* ✅
            • /api/community/* ✅
```

---

## Role-Based Access Matrix

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           PERMISSION MATRIX                               │
├────────────────────┬───────────┬────────────┬──────────┬─────────────────┤
│ Feature/Resource   │ Admin     │ Super      │ User     │ Protection      │
│                    │           │ Admin      │          │                 │
├────────────────────┼───────────┼────────────┼──────────┼─────────────────┤
│ Dashboard Page     │ ✅        │ ✅         │ ✅       │ Route Check     │
│ Clients Page       │ ✅        │ ✅         │ ❌       │ Route Check     │
│ Community Devices  │ ✅        │ ✅         │ ❌       │ Route Check     │
│ Retail Devices     │ ✅        │ ✅         │ ❌       │ Route Check     │
│ Alerts Page        │ ✅        │ ✅         │ ❌       │ Route Check     │
│                    │           │            │          │                 │
│ API: device GET    │ ✅        │ ✅         │ ❌       │ API Check       │
│ API: device data   │ ✅        │ ✅         │ ❌       │ API Check       │
│ API: map device    │ ✅        │ ✅         │ ❌       │ API Check       │
│ API: unmap device  │ ✅        │ ✅         │ ❌       │ API Check       │
│ API: community GET │ ✅        │ ✅         │ ❌       │ API Check       │
│ API: mappings GET  │ ✅        │ ✅         │ ❌       │ API Check       │
│                    │           │            │          │                 │
│ Menu Items (5)     │ 5/5       │ 5/5        │ 1/5      │ UI Conditional  │
│ Quick Actions (4)  │ 4 buttons │ 4 buttons  │ Message  │ UI Conditional  │
│ Role Badge         │👨‍💼 ADMIN │👑 SUPER  │👤 USER  │ Header Display  │
│ Logout             │ ✅        │ ✅         │ ✅       │ No Check        │
└────────────────────┴───────────┴────────────┴──────────┴─────────────────┘
```

---

## Session & Cookie Flow

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Login Request (email, password)                        │
│          │                                              │
│          ▼                                              │
├─────────────────────────────────────────────────────────┤
│ SERVER (Node.js Express)                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  POST /login                                            │
│  1. Validate credentials                               │
│  2. Create session with role                           │
│     req.session.loggedIn = true                        │
│     req.session.email = email                          │
│     req.session.role = 'admin'|'superadmin'|'user'    │
│  3. Store in memory/database                           │
│  4. Send session cookie to client                      │
│          │                                              │
│          ▼                                              │
├─────────────────────────────────────────────────────────┤
│ CLIENT (Browser)                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Receive session cookie (httpOnly, secure)             │
│  Cookie stored automatically by browser                │
│          │                                              │
│          ▼                                              │
├─────────────────────────────────────────────────────────┤
│ Each Subsequent Request                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser automatically sends cookie with request        │
│  SERVER validates cookie and extracts role             │
│          │                                              │
│          ▼                                              │
│  if (req.session.role === 'admin' || 'superadmin') {   │
│    Allow access                                        │
│  } else if (req.session.role === 'user') {             │
│    Block access / Redirect to /access-denied           │
│  }                                                     │
│          │                                              │
│          ▼                                              │
├─────────────────────────────────────────────────────────┤
│ CLIENT (Browser)                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Receive response (page or redirect)                    │
│          │                                              │
│          ▼                                              │
│  Logout: /logout (GET)                                  │
│  1. Session destroyed                                  │
│  2. Cookie cleared                                     │
│  3. Redirect to /login                                 │
│          │                                              │
│          ▼                                              │
│  Session gone, must login again                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## API Request Protection

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT MAKES API REQUEST                                    │
│ GET /api/device/GVM202500001                               │
│ (With session cookie)                                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ SERVER MIDDLEWARE: checkAuth                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ if (req.session.loggedIn) {                                │
│   next() // Continue to route                             │
│ } else {                                                   │
│   redirect('/login') // Not logged in                     │
│ }                                                          │
└──────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
     Logged In ✅          Not Logged In ❌
            │                           │
            ▼                           ▼
┌────────────────────────┐   ┌────────────────────────┐
│ Route Handler:         │   │ Redirect to /login    │
│ /api/device/:deviceId  │   │ (Exit)                │
│                        │   └────────────────────────┘
│ if (role !== 'admin' && │
│     role !== 'sa') {   │
│   return error msg     │
│ } else {               │
│   return device data   │
│ }                      │
└────────────────────────┘
     │              │
     ▼              ▼
❌ Error        ✅ Success
"Access denied" Device JSON


FLOW FOR USER ROLE:
┌────────────────────────────────────────────┐
│ User logs in as user@gmail.com             │
│ Session: role = 'user'                    │
└────────────────────────────────────────────┘
         │
         ▼ API Call: /api/device/GVM202500001
┌────────────────────────────────────────────┐
│ checkAuth middleware → session exists ✅   │
│ Route handler:                             │
│ if (role !== 'admin' &&                   │
│     role !== 'superadmin') {              │
│   return {                                │
│     success: false,                       │
│     message: "Access denied..."           │
│   }                                       │
│ }                                         │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Client Receives Error:                     │
│ {                                          │
│   success: false,                         │
│   message: "Access denied. Only Admin..." │
│ }                                         │
└────────────────────────────────────────────┘
```

---

## Admin vs User Dashboard

```
┌─────────────────────────────────┬─────────────────────────────────┐
│    ADMIN DASHBOARD              │     USER DASHBOARD              │
├─────────────────────────────────┼─────────────────────────────────┤
│                                 │                                 │
│ Header:                         │ Header:                         │
│ 🛡️ Safety Monitoring Dashboard  │ 🛡️ Safety Monitoring Dashboard  │
│ 👤 admin@gmail.com              │ 👤 user@gmail.com               │
│ 👨‍💼 ADMIN                          │ 👤 USER                         │
│                                 │                                 │
│ Sidebar:                        │ Sidebar:                        │
│ ✅ Dashboard (Active)            │ ✅ Dashboard (Active)            │
│ ✅ Clients                       │ ❌ Clients (HIDDEN)             │
│ ✅ Community Device Mapping      │ ❌ Community Device Mapping     │
│ ✅ Retail Devices                │ ❌ Retail Devices (HIDDEN)      │
│ ✅ Alert                         │ ❌ Alert (HIDDEN)               │
│ ✅ Logout                        │ ✅ Logout                       │
│                                 │                                 │
│ Main Content:                   │ Main Content:                   │
│ - Alert Status Cards (4)        │ - Alert Status Cards (4)        │
│ - Key Statistics (4)            │ - Key Statistics (4)            │
│ - Quick Actions:                │ - Quick Actions:                │
│   ✅ Manage Clients             │   ℹ️ Only Admin and Super Admin │
│   ✅ View Devices               │      can access these features  │
│   ✅ Check Alerts               │                                 │
│   ✅ Retail Devices             │                                 │
│                                 │                                 │
│ Can click on all menu items      │ Clicking other menu items will  │
│ and access all pages directly    │ redirect to /access-denied      │
│                                 │                                 │
└─────────────────────────────────┴─────────────────────────────────┘
```

---

## Summary

✅ **Three-Layer Protection:**
1. Session-based authentication (checkAuth middleware)
2. Route-level authorization (role checks on each route)
3. API-level authorization (role checks on each API endpoint)

✅ **User Experience:**
1. Login shows all available roles
2. Dashboard adapts to user role
3. Restricted pages show helpful error page
4. Clear role indication in header

✅ **Security:**
1. Unauthorized users cannot access restricted pages
2. API calls from unauthorized users return errors
3. Session management prevents cookie tampering
4. Roles cannot be escalated via frontend
