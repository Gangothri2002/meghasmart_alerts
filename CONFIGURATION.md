# Megha Smart Configuration Guide

## Overview
This guide explains how to configure Megha Smart for your environment.

## Default Configuration

### Server Settings
```javascript
// server.js
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = 'megha_smart_secret_key';
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
```

### Authentication
```javascript
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'P@ssword1';
```

### Data Limits
```javascript
// Maximum capacity for community devices
const MAX_DEVICES = 5000;

// Current number of mock devices
const CURRENT_DEVICES = 1000;

// Pagination limit per page
const ITEMS_PER_PAGE = 20;
```

---

## Environment Variables Setup

### Create .env File
Create a `.env` file in the project root:

```
NODE_ENV=development
PORT=3000
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=P@ssword1
SESSION_SECRET=megha_smart_secret_key
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=password
DB_NAME=megha_smart
```

### Load Environment Variables
Update server.js:
```javascript
require('dotenv').config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'P@ssword1';
const PORT = process.env.PORT || 3000;
```

---

## Database Configuration

### Option 1: MongoDB

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const clientSchema = new mongoose.Schema({
  sno: Number,
  flatNo: String,
  deviceId: String,
  customerName: String,
  email: String,
  phone: String,
  registrationDate: Date
});

const Client = mongoose.model('Client', clientSchema);
```

### Option 2: MySQL/MariaDB

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Usage
const connection = await pool.getConnection();
const [rows] = await connection.query('SELECT * FROM clients');
connection.release();
```

### Option 3: PostgreSQL

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Usage
const client = await pool.connect();
const result = await client.query('SELECT * FROM clients');
client.release();
```

---

## Session Storage Configuration

### Option 1: MongoDB Session Store

```bash
npm install connect-mongo
```

```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
```

### Option 2: PostgreSQL Session Store

```bash
npm install connect-pg-simple pg
```

```javascript
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
```

---

## Password Security

### Hash Passwords with bcryptjs

```bash
npm install bcryptjs
```

```javascript
const bcrypt = require('bcryptjs');

// Hash password on user creation
const hashedPassword = await bcrypt.hash(password, 10);

// Compare password on login
const isPasswordValid = await bcrypt.compare(enteredPassword, storedHashedPassword);

if (isPasswordValid) {
  // Login successful
}
```

---

## Logging Configuration

### Winston Logger Setup

```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('User logged in');
logger.error('Database connection failed');
```

---

## Email Configuration

### Nodemailer Setup

```bash
npm install nodemailer
```

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email
await transporter.sendMail({
  from: 'noreply@meghasmart.com',
  to: 'user@example.com',
  subject: 'Alert Notification',
  html: '<h1>Device Alert</h1><p>Your device requires attention.</p>'
});
```

---

## CORS Configuration

### Enable CORS for API

```bash
npm install cors
```

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

---

## Rate Limiting

### Implement Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.post('/login', limiter, (req, res) => {
  // Login handler
});
```

---

## Production Deployment

### Environment: Production

```bash
NODE_ENV=production
```

### Security Headers

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### HTTPS Configuration

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(process.env.PORT || 443);
```

### Compression

```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

---

## Monitoring & Analytics

### PM2 Process Manager

```bash
npm install -g pm2
```

```bash
pm2 start server.js --name "megha-smart"
pm2 save
pm2 startup
```

### Application Insights

```bash
npm install applicationinsights
```

```javascript
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_KEY).start();
```

---

## Backup & Recovery

### Database Backup Schedule

```bash
# Weekly backup
0 0 * * 0 /backup/backup.sh
```

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d)
mongodump --uri=$MONGODB_URI --archive=backup-$DATE.archive
```

---

## Performance Tuning

### Cache Configuration

```javascript
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});
```

### Database Connection Pooling

```javascript
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

---

## Testing Configuration

### Jest Setup

```bash
npm install --save-dev jest supertest
```

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['server.js', 'routes/**/*.js']
};
```

---

## Configuration Checklist

Development:
- [ ] .env file created
- [ ] Dependencies installed
- [ ] Server running on localhost:3000
- [ ] Login working with test credentials

Production:
- [ ] All environment variables set
- [ ] Database configured and migrated
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Session store persistent
- [ ] Passwords hashed

---

**For more help**: See README.md and API_DOCUMENTATION.md

**Last Updated**: February 2024
