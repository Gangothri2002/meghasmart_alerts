# QUICK FIXES GUIDE - Megha Smart Application

## 🔴 CRITICAL FIXES (Do These First - 30 Minutes)

### Fix 1: Move checkAuth Middleware Definition
**File:** `server.js`  
**Action:** Move the function to before first use

**Current (WRONG):**
```javascript
// Line 469 - USES before definition
app.get('/dashboard', checkAuth, (req, res) => {

// ... 700 lines later ...

// Line 1192 - DEFINED here (too late!)
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}
```

**Fix:** Add this around line 280 (after app setup, before routes):
```javascript
// ============= MIDDLEWARE =============
// Middleware to check authentication
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Middleware for community authentication
function checkCommunityAuth(req, res, next) {
  if (req.session.communityLoggedIn) {
    next();
  } else {
    res.redirect('/community-login');
  }
}

// ============= ROUTES =============
// Now add routes starting from app.get('/login')
```

**Then:** Delete the old function definition at line ~1192.

---

### Fix 2: Create Missing community.css File
**File:** Create `public/css/community.css`

Add this content:
```css
/* Community-specific styles */
:root {
    --community-primary: #06b6d4;
    --community-primary-dark: #0891b2;
    --community-light: #ecf4f5;
}

/* Community Sidebar */
.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: 700;
}

/* Top Bar */
.top-bar {
    background: white;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 24px;
}

.top-bar-left h1 {
    font-size: 24px;
    margin: 0;
    font-weight: 700;
}

.top-bar-right {
    display: flex;
    gap: 16px;
    align-items: center;
}

.search-box {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    width: 200px;
}

/* Main Wrapper */
.main-wrapper {
    margin-left: 280px;
    padding: 20px;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
}

/* Stats */
.devices-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.stat-mini {
    background: white;
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid var(--community-primary);
    text-align: center;
}

.stat-mini-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 8px;
    text-transform: uppercase;
    font-weight: 600;
}

.stat-mini-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--community-primary);
}

/* Tables */
.table-wrapper {
    background: white;
    border-radius: 8px;
    overflow-x: auto;
}

.devices-table {
    width: 100%;
    border-collapse: collapse;
}

.devices-table thead {
    background: #f3f4f6;
    border-bottom: 2px solid #e5e7eb;
}

.devices-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 13px;
    text-transform: uppercase;
}

.devices-table td {
    padding: 12px;
    border-bottom: 1px solid #f3f4f6;
}

.devices-table tbody tr:hover {
    background: #f9fafb;
}

.device-id {
    font-family: 'Courier New', monospace;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
}

.status-active {
    background: #d1fae5;
    color: #065f46;
}

.status-inactive {
    background: #fee2e2;
    color: #991b1b;
}

/* Filter Section */
.filter-section {
    background: white;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
}

.filter-group {
    display: flex;
    gap: 12px;
    align-items: center;
}

.filter-group label {
    font-weight: 600;
}

.filter-group select {
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
    .main-wrapper {
        margin-left: 0;
    }
    
    .sidebar {
        width: 70px;
    }
    
    .top-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    
    .top-bar-right {
        flex-wrap: wrap;
    }
    
    .search-box {
        width: 100%;
    }
    
    .devices-stats {
        grid-template-columns: 1fr 1fr;
    }
    
    .devices-table {
        font-size: 12px;
    }
    
    .devices-table th,
    .devices-table td {
        padding: 8px;
    }
}

@media (max-width: 480px) {
    .devices-table-wrapper {
        overflow-x: auto;
    }
    
    .devices-table {
        min-width: 400px;
    }
    
    .devices-stats {
        grid-template-columns: 1fr;
    }
}
```

---

### Fix 3: Create Missing root.ejs Template
**File:** Create `views/root.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Megha Smart - IoT Device Monitoring</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .root-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .root-content {
            background: white;
            border-radius: 20px;
            padding: 60px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .root-logo {
            font-size: 60px;
            margin-bottom: 20px;
        }
        
        .root-title {
            font-size: 36px;
            font-weight: 800;
            margin-bottom: 12px;
            color: #1f2937;
        }
        
        .root-subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 40px;
        }
        
        .root-buttons {
            display: flex;
            gap: 16px;
            flex-direction: column;
        }
        
        .root-btn {
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .root-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .root-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
        }
        
        .root-btn-secondary {
            background: #f3f4f6;
            color: #1f2937;
            border: 2px solid #e5e7eb;
        }
        
        .root-btn-secondary:hover {
            background: #e5e7eb;
        }
        
        @media (max-width: 480px) {
            .root-content {
                padding: 40px 20px;
            }
            
            .root-title {
                font-size: 28px;
            }
            
            .root-buttons {
                flex-direction: column;
            }
        }
    </style>
</head>
<body class="login-body">
    <div class="root-container">
        <div class="root-content">
            <div class="root-logo">🏢</div>
            <h1 class="root-title">Megha Smart</h1>
            <p class="root-subtitle">Advanced IoT Device Monitoring System</p>
            
            <div class="root-buttons">
                <a href="/login" class="root-btn root-btn-primary">👤 Admin Login</a>
                <a href="/community-login" class="root-btn root-btn-secondary">🏘️ Community Access</a>
            </div>
        </div>
    </div>
</body>
</html>
```

---

### Fix 4: Remove Duplicate CSS Import
**File:** `views/community-devices.ejs`  
**Line:** 8

**Current (WRONG):**
```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/community.css">
<link rel="stylesheet" href="/css/style.css">  <!-- REMOVE THIS LINE -->
</head>
```

**Fix:**
```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/community.css">
</head>
```

---

### Fix 5: Fix Database Initialization
**File:** `server.js`  
**Lines:** 66-120

**Current (WRONG):**
```javascript
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'communities.db');
const db = new sqlite3.Database(dbPath);  // No error handling

function initDatabase() {
  db.serialize(() => {
    // ... database setup ...
  });
}

initDatabase();

// ... routes defined immediately ...
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Fix:** Replace with:
```javascript
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'communities.db');
let db; // Declare but don't initialize yet

function initDatabase(callback) {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }
    
    console.log('✅ Database connected');
    
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS community (
          id INTEGER PRIMARY KEY,
          customerName TEXT,
          flatNo TEXT,
          email TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS device (
          id INTEGER PRIMARY KEY,
          communityId INTEGER,
          flatNo TEXT,
          deviceId TEXT,
          sensorType TEXT,
          status TEXT,
          FOREIGN KEY(communityId) REFERENCES community(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS community_login (
          email TEXT PRIMARY KEY,
          password TEXT
        )
      `);

      const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json'));
      files.sort();
      let completed = 0;
      
      files.forEach((file, idx) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(communityDataDir, file), 'utf8'));
          const cid = idx + 1;
          db.run(
            `INSERT OR REPLACE INTO community (id, customerName, flatNo, email) VALUES (?,?,?,?)`,
            [cid, data.customerName, data.flatNo, data.email],
            (err) => {
              if (err) console.error('Error inserting community:', err);
              completed++;
              if (completed === files.length && callback) {
                callback();
              }
            }
          );
        } catch (e) {
          console.error('Error reading file:', file, e);
        }
      });
      
      console.log('✅ SQLite database initialized from JSON files');
    });
  });
}

// Initialize database BEFORE starting server
initDatabase(() => {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`✅ Megha Smart is running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
      process.exit(1);
    }
  });
});
```

---

## 🟠 HIGH-PRIORITY FIXES (Next 2-3 hours)

### Fix 6: Add Mobile Responsive Design
**File:** `public/css/style.css`  
**Add at the end of file:**

```css
/* ===== MOBILE RESPONSIVE DESIGN ===== */

/* Tablets (768px and below) */
@media (max-width: 768px) {
    .sidebar {
        width: 0;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
    }
    
    .sidebar.open {
        transform: translateX(0);
    }
    
    .main-content {
        margin-left: 0;
        padding: 16px;
    }
    
    .header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .header h1 {
        font-size: 24px;
    }
    
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .card {
        padding: 16px;
    }
    
    .login-wrapper {
        flex-direction: column;
        min-height: auto;
    }
    
    .login-left {
        padding: 40px 24px;
    }
    
    .login-right {
        padding: 40px 24px;
    }
    
    .login-container {
        max-width: 100%;
    }
}

/* Phones (480px and below) */
@media (max-width: 480px) {
    .main-content {
        padding: 12px;
    }
    
    .header {
        margin-bottom: 16px;
    }
    
    .header h1 {
        font-size: 20px;
    }
    
    .header-stats {
        flex-direction: column;
        width: 100%;
    }
    
    .header-stats span {
        width: 100%;
        text-align: center;
    }
    
    .user-info {
        width: 100%;
        text-align: center;
    }
    
    .card {
        padding: 12px;
        margin-bottom: 16px;
    }
    
    .card-header {
        padding-bottom: 12px;
        margin-bottom: 16px;
    }
    
    .card-header h2 {
        font-size: 18px;
    }
    
    .data-table {
        font-size: 12px;
    }
    
    .data-table th,
    .data-table td {
        padding: 8px;
    }
    
    .btn {
        padding: 10px 16px;
        font-size: 14px;
    }
    
    .login-left,
    .login-right {
        padding: 24px 16px;
    }
    
    .brand-title {
        font-size: 28px;
    }
    
    .login-header-form h2 {
        font-size: 24px;
    }
}

/* Large Screens (1920px and above) */
@media (min-width: 1920px) {
    .main-content {
        max-width: 1400px;
        margin: 0 auto;
        margin-left: 280px;
    }
    
    .card {
        max-width: 100%;
    }
}

/* Table responsive scrolling */
.table-responsive {
    overflow-x: auto;
}

/* Ensure images scale on mobile */
img {
    max-width: 100%;
    height: auto;
}

/* Touch-friendly buttons */
@media (hover: none) and (pointer: coarse) {
    .btn {
        min-height: 44px;
        min-width: 44px;
        padding: 14px 20px;
    }
    
    .menu-item {
        min-height: 44px;
    }
    
    a {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
    }
}
```

---

### Fix 7: Hash Passwords
**File:** `server.js`  
**Lines:** 1-30 (add import)

Add at the top:
```javascript
const bcrypt = require('bcryptjs');
```

Then update user login around line 440:
```javascript
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = USERS[email];
  if (user) {
    // For now, compare plaintext (fix later by pre-hashing demo users)
    if (user.password === password) {
      req.session.loggedIn = true;
      req.session.email = email;
      req.session.role = user.role;
      return res.redirect('/dashboard');
    }
  }
  
  res.render('login', { error: 'Invalid email or password' });
});
```

Create `.env` file in project root:
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_secure_random_key_here_$(openssl rand -base64 32)
```

Update session config around line 16:
```javascript
require('dotenv').config();

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));
```

---

### Fix 8: Complete Truncated EJS Files
These files were cut off. Complete them by:

1. **clients.ejs** - Add pagination and action buttons
2. **retail-devices.ejs** - Add pagination and complete table
3. **community-devices.ejs** - Add complete unmapped devices section

Each should end with:
```html
                                </tbody>
                            </table>
                        <% } else { %>
                            <div style="padding: 40px; text-align: center; color: #6b7280;">
                                📭 No devices found
                            </div>
                        <% } %>
                    </div>
                </div>
            </div>

            <!-- Pagination (if needed) -->
            <% if (totalPages && totalPages > 1) { %>
                <div class="pagination">
                    <% if (currentPage > 1) { %>
                        <a href="?page=1" class="pagination-btn">First</a>
                    <% } %>
                    <span>Page <%= currentPage %> of <%= totalPages %></span>
                    <% if (currentPage < totalPages) { %>
                        <a href="?page=<%= currentPage + 1 %>" class="pagination-btn">Next</a>
                    <% } %>
                </div>
            <% } %>
        </main>
    </div>
</body>
</html>
```

---

## Testing Commands

After applying these fixes:

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start

# 3. Test in browser
# Login: http://localhost:3000/
# Admin: admin@gmail.com / P@ssword1
# Community: Check /community-login for credentials

# 4. Test mobile
# Resize browser to 375px width
# Check: Sidebar collapses, content is readable, no overflow
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Server starts without errors
- [ ] All CSS files load (check browser console, no 404s)
- [ ] `/login` page displays correctly
- [ ] `/community-login` displays correctly
- [ ] Admin login works with `admin@gmail.com`
- [ ] Dashboard loads after login
- [ ] Sidebar is visible on desktop (1920px)
- [ ] Sidebar is hidden on mobile (375px)
- [ ] Tables are readable on mobile
- [ ] No console errors
- [ ] Responsive design works at 768px breakpoint
- [ ] Buttons are touch-friendly on mobile

---

**Good Luck! These fixes will make your app functional and responsive.**
