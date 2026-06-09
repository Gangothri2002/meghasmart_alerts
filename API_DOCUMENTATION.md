# Megha Smart API Routes

## Authentication Routes

### GET /login
- **Description**: Display login page
- **Access**: Public
- **Returns**: Login form HTML

### POST /login
- **Description**: Authenticate user
- **Access**: Public
- **Parameters**:
  - `email` (string): User email
  - `password` (string): User password
- **Returns**: Redirects to `/dashboard` on success, or `/login` with error

### GET /logout
- **Description**: Logout user and destroy session
- **Access**: Protected
- **Returns**: Redirects to `/login`

---

## Dashboard Routes

### GET /dashboard
- **Description**: Display main dashboard with statistics
- **Access**: Protected (requires login)
- **Data Returned**:
  - `email`: Logged-in user email
  - `clientCount`: Total number of clients
  - `deviceCount`: Total number of devices
  - `alertCount`: Active alerts count

---

## Clients Routes

### GET /clients
- **Description**: Get all clients with pagination
- **Access**: Protected
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
- **Data Returned**:
  - `clients`: Array of client objects
  - `currentPage`: Current page number
  - `totalPages`: Total number of pages
  - `totalClients`: Total clients count (1000)
- **Data Structure**:
  ```json
  {
    "sno": 1,
    "flatNo": "1-1",
    "deviceId": "DEV00001",
    "customerName": "Customer 1",
    "email": "customer1@meghasmart.com",
    "phone": "9800000001",
    "registrationDate": "2024-01-15"
  }
  ```

---

## Community Device Mapping Routes

### GET /community-devices
- **Description**: Get all community devices with pagination
- **Access**: Protected
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
- **Data Returned**:
  - `devices`: Array of device objects
  - `currentPage`: Current page number
  - `totalPages`: Total number of pages
  - `totalDevices`: Total devices count (1000)
- **Data Structure**:
  ```json
  {
    "sno": 1,
    "flatNo": "1-1",
    "deviceId": "DEV00001",
    "status": "Active",
    "lastActive": "2024-02-12T15:30:00Z",
    "firmwareVersion": "2.1.0",
    "location": "Floor 1"
  }
  ```

---

## Retail Devices Routes

### GET /retail-devices
- **Description**: Get all active retail devices
- **Access**: Protected
- **Data Returned**:
  - `devices`: Array of retail device objects
  - `totalRetailDevices`: Count of active retail devices
- **Data Structure**: Same as community devices

---

## Alerts Routes

### GET /alerts
- **Description**: Get all system alerts with pagination
- **Access**: Protected
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
- **Data Returned**:
  - `alerts`: Array of alert objects
  - `currentPage`: Current page number
  - `totalPages`: Total number of pages
  - `totalAlerts`: Total alerts count
  - `activeAlerts`: Count of active alerts
- **Data Structure**:
  ```json
  {
    "id": 1,
    "deviceId": "DEV00001",
    "flatNo": "1-1",
    "alertType": "Gas Leak",
    "severity": "High",
    "timestamp": "2024-02-12T10:00:00Z",
    "status": "Active"
  }
  ```

---

## Root Route

### GET /
- **Description**: Redirect to appropriate page
- **Logic**:
  - If logged in → Redirect to `/dashboard`
  - If not logged in → Redirect to `/login`

---

## Session Configuration

- **Secret**: `megha_smart_secret_key`
- **Max Age**: 24 hours (86400000 milliseconds)
- **Secure**: False (for development; set to true in production with HTTPS)

---

## Authentication Middleware

```javascript
function checkAuth(req, res, next)
```

- **Purpose**: Verify user is authenticated
- **Usage**: Applied to all protected routes
- **Behavior**: 
  - If authenticated → Call `next()` to continue
  - If not authenticated → Redirect to `/login`

---

## Data Specifications

### Mock Data Generation

**Clients**: 1000 records
- S.No: Auto-increment (1-1000)
- Flat No.: Pattern "X-Y" (X: 1-100, Y: 1-10)
- Device ID: Pattern "DEVXXXXX" (5-digit number)
- Name: "Customer N"
- Email: "customerN@meghasmart.com"
- Phone: "98XXXXXXXX"

**Devices**: 1000 records
- Corresponding 1:1 with clients
- Status: 80% Active, 20% Inactive (random)
- Last Active: Random within last 24 hours
- Location: "Floor X" (X: 1-100)

**Alerts**: 50 records
- Types: Gas Leak, Low Battery, Connection Lost, High Temperature, Maintenance Required
- Severity: High (33%), Medium (33%), Low (34%)
- Status: 50% Active, 50% Resolved

---

## Pagination Details

- **Clients**: 20 records per page
- **Community Devices**: 20 records per page
- **Alerts**: 20 records per page
- **Retail Devices**: No pagination (grid display)

---

## Error Handling

### 401 Unauthorized
- **Trigger**: Accessing protected route without authentication
- **Response**: Redirect to `/login`

### 404 Not Found
- **Trigger**: Accessing non-existent route
- **Response**: Express default 404 page

### 500 Server Error
- **Trigger**: Unhandled exception
- **Response**: Express error page

---

## Response Formats

### Successful Response
- **Status**: 200 OK
- **Format**: HTML (EJS rendered) or JSON (depending on route)

### Redirect Response
- **Status**: 302 Found
- **Format**: HTTP Redirect

---

## Security Considerations

⚠️ **For Production Use**:

1. **Credentials**: Move to environment variables
   ```javascript
   const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
   const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
   ```

2. **Database**: Replace mock data with actual database
   ```javascript
   // Use MongoDB, MySQL, PostgreSQL, etc.
   ```

3. **Password Hashing**: Hash passwords using bcryptjs
   ```javascript
   const bcrypt = require('bcryptjs');
   ```

4. **Session Storage**: Use persistent session store
   ```javascript
   // Use connect-mongo, connect-pg-simple, etc.
   ```

5. **HTTPS**: Enable secure cookies
   ```javascript
   cookie: { secure: true, httpOnly: true }
   ```

---

## Testing Credentials

**Demo Account**:
- Email: `admin@gmail.com`
- Password: `P@ssword1`

---

## Rate Limiting

Currently: No rate limiting (should be added for production)

Recommended:
```javascript
const rateLimit = require('express-rate-limit');
```

---

## CORS Configuration

Currently: CORS not configured (same-origin requests only)

For API access from other domains:
```javascript
const cors = require('cors');
app.use(cors());
```

---

## Environment Variables

Recommended to set up:
```
NODE_ENV=production
PORT=3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=hashed_password
SESSION_SECRET=your_secret_key
```

---

**Last Updated**: February 2024
**Version**: 1.0.0
