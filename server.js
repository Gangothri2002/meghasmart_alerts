// Required imports and app initialization
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const statusMapping = require('./utils/statusMapping');
const leakHistoryService = require('./backend/services/leakHistoryService');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); 
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'megha_smart_secret_key', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const VERBOSE = process.env.VERBOSE === 'true';
function log(...args) {
  if (VERBOSE) console.log(...args);
}

// Define device IDs to delete (yellow devices from Community 8)
const DELETED_DEVICE_IDS = [
  'GVM202601464', // A8-001
  'GVM202601465', // A8-002
  'GVM202601468', // A8-003
  'GVM202601469', // A8-004
  'GVM202601470', // A8-005
  'GVM202601471', // A8-006
  'GVM202601472', // A8-007
  'GVM202601473', // A8-008
  'GVM202601478',
  'GVM202601479',
  'GVM202601480',
  'GVM202601481',
  'GVM202601482'
];

// Community device details page
app.get('/community/device/:deviceId', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }
  const deviceId = req.params.deviceId;
  // Find device in this community
  let device = community.devices.find(d => d.deviceId === deviceId);

  // If we found a community device and have a separate retail device record,
  // merge the full details from devices.json so the detail page has the real fields.
  if (device) {
    const retailDevice = retailDevices.find(d => d.deviceId === deviceId);
    if (retailDevice) {
      device = { ...device, ...retailDevice };
    }
  }

  // If not found in community.devices, try global devicesDatabase
  if (!device) {
    device = devicesDatabase.find(d => d.deviceId === deviceId);
    if (!device) {
      return res.status(404).send('Device not found');
    }
  }

  // If the device still lacks detailed fields, try the retail devices file as fallback
  if (!device.macAddress || !device.hardwareVersion || !device.firmwareVersion || !device.latitude || !device.longitude || !device.location) {
    const retailDevice = retailDevices.find(d => d.deviceId === deviceId);
    if (retailDevice) {
      device = { ...retailDevice, ...device };
    }
  }

  // Remove hardcoded Community 8 status override so actual device state can be shown.
  // Community 8 devices should reflect the real status in retailDevices or community data.

  // Try to get more details from clientsDatabase if available
  let client = null;
  if (device.flatNo) {
    client = clientsDatabase.find(c => c.flatNo === device.flatNo);
  }
  // Compose details for the view
  const lat = (client && client.coordinates && client.coordinates.lat) || device.lat || device.latitude || '';
  const lng = (client && client.coordinates && client.coordinates.lng) || device.lng || device.longitude || '';
  const details = {
    ...device,
    status: normalizeDeviceStatus(device.status),
    macAddress: device.macAddress || '',
    hardwareVersion: device.hardwareVersion || (client && client.hardwareVersion) || '1.0',
    firmwareVersion: device.firmwareVersion || (client && client.firmwareVersion) || '2.1.0',
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    location: device.location || (client && client.address) || ''
  };
  res.render('device-details', { device: details, backUrl: '/community/devices' });
});

app.get('/device-details/:deviceId', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.redirect('/access-denied');
  }

  const deviceId = req.params.deviceId;
  const persistedDevices = loadRetailDevices();
  let device = persistedDevices.find(d => d.deviceId === deviceId);

  if (!device) {
    device = devicesDatabase.find(d => d.deviceId === deviceId);
  }

  if (!device) {
    const retailDevicesList = loadAllDevicesFromCSV();
    device = retailDevicesList.find(d => d.deviceId === deviceId);
  }

  if (!device) {
    return res.status(404).send('Device not found');
  }

  const persistedDevice = persistedDevices.find(d => d.deviceId === deviceId);
  if (persistedDevice && device !== persistedDevice) {
    device = {
      ...persistedDevice,
      ...device
    };
  }

  const details = {
    ...device,
    macAddress: device.macAddress || '',
    hardwareVersion: device.hardwareVersion || '',
    firmwareVersion: device.firmwareVersion || '',
    lat: device.lat || device.latitude || '',
    lng: device.lng || device.longitude || '',
    location: device.location || ''
  };

  res.render('device-details', { device: details, backUrl: '/retail-devices' });
});

// Periodic timer: Set device status to yellow (2) if no data received for 90 seconds
setInterval(() => {
  const now = Date.now();
  let retailUpdated = false;
  let communityFilesUpdated = false;

  devicesDatabase.forEach(device => {
    // If no data for 90s and status is not already yellow, set to yellow
    if (device.lastDataPush && device.status !== 2 && (now - device.lastDataPush > 90000)) {
      const oldStatus = device.status;
      device.status = 2; // No Communication (yellow)

      db.run('UPDATE device SET status = ? WHERE deviceId = ?', [2, device.deviceId], err => {
        if (err) console.error('Auto-yellow DB update error:', err);
      });

      // Track leak history if transitioning from alert to yellow (auto-recovery)
      try {
        const specialTarget = resolveSpecialCommunityDeviceForLeak(device.deviceId);
        if (specialTarget && specialTarget.communityId && (oldStatus === 3 || oldStatus === 5)) {
          leakHistoryService.recordLeakEnd(specialTarget.communityId, specialTarget.device, null);
        }
      } catch (leakErr) {
        console.warn('Error tracking auto-yellow leak history:', leakErr);
      }

      const retailDevice = retailDevices.find(r => r.deviceId === device.deviceId);
      if (retailDevice && retailDevice.status !== 2) {
        retailDevice.status = 2;
        retailUpdated = true;
      }

      Object.keys(communityMappingDatabase).forEach(mapKey => {
        const mapping = communityMappingDatabase[mapKey];
        if (mapping && mapping.deviceId === device.deviceId && mapping.status !== 2) {
          mapping.status = 2;
          communityFilesUpdated = true;
        }
      });
    }
  });

  if (communityFilesUpdated) {
    saveAllCommunityFiles();
  }

  if (retailUpdated) {
    saveRetailDevices(retailDevices);
  }
}, 10000); // Check every 10 seconds

// Hard-coded credentials with roles (in production use database)
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'P@ssword1';

// User credentials with roles
const USERS = {
  'admin@gmail.com': { password: 'P@ssword1', role: 'admin' },
  'superadmin@gmail.com': { password: 'P@ssword2', role: 'superadmin' },
  'user@gmail.com': { password: 'P@ssword3', role: 'user' }
};

// Mock database for clients and devices
// Persistent device storage file
const devicesFilePath = path.join(__dirname, 'data', 'devices.json');
// Initialize deviceIdCounter from devices.json
let deviceIdCounter = 1; // Will be set to last used device ID + 1
function getLastDeviceIdFromFile() {
  try {
    if (fs.existsSync(devicesFilePath)) {
      const devices = JSON.parse(fs.readFileSync(devicesFilePath, 'utf8'));
      let maxSeq = 0;
      const year = new Date().getFullYear();
      const gvmPrefix = `GVM${year}`;
      devices.forEach(d => {
        if (typeof d.deviceId === 'string' && d.deviceId.startsWith(gvmPrefix)) {
          const seq = parseInt(d.deviceId.slice(8), 10); // GVM + YYYY = 8 chars, then 5 digits
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
      return maxSeq;
    }
  } catch (e) {
    console.error('Error reading devices.json for last device ID:', e);
  }
  return 0;
}
deviceIdCounter = getLastDeviceIdFromFile() + 1;
const TOTAL_RETAIL_DEVICES = 1400; // Enforce 1400 retail devices for 7 communities * 200 devices each
const MAX_COMMUNITIES = 7; // Include community 7 and keep this dynamic
let clientsDatabase = []; // Will be loaded from DB
let devicesDatabase = shuffleArray(generateMockDevices(TOTAL_RETAIL_DEVICES))
  .filter(d => !DELETED_DEVICE_IDS.includes(d.deviceId)) // Filter out deleted devices
  .map(d => ({
    ...d,
    lastDataPush: Date.now()
  }));
// count unique flat numbers immediately after generation
const uniqueFlatCount = new Set(devicesDatabase.map(d => d.flatNo)).size;
log(`generated ${devicesDatabase.length} devices with ${uniqueFlatCount} distinct flat numbers`);

let alertsDatabase = generateMockAlerts(50);
let communityMappingDatabase = {}; // Database for flatNo and email mapping

// ------------------------------------------------------------------
// Persistent storage for the six communities (mimic database files for each)
// ------------------------------------------------------------------
const communityDataDir = path.join(__dirname, 'data', 'communities');

// ensure directory exists
if (!fs.existsSync(communityDataDir)) {
  fs.mkdirSync(communityDataDir, { recursive: true });
}

// ------------ SQLite database setup and import from JSON ------------
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'communities.db');
const db = new sqlite3.Database(dbPath);

function initDatabase(callback) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS community (id INTEGER PRIMARY KEY, customerName TEXT, flatNo TEXT, email TEXT)`);

    db.run(`CREATE TABLE IF NOT EXISTS device (id INTEGER PRIMARY KEY, communityId INTEGER, flatNo TEXT, deviceId TEXT, sensorType TEXT, status INTEGER, lastDataPush INTEGER)`);

    db.run(`CREATE TABLE IF NOT EXISTS community_login (email TEXT PRIMARY KEY, password TEXT)`);

    db.run(`CREATE TABLE IF NOT EXISTS community_mapping (flatNo TEXT, email TEXT, customerName TEXT, deviceId TEXT, sensorType TEXT, location TEXT, mappedDate TEXT, mappedBy TEXT, status TEXT, isMapped INTEGER, PRIMARY KEY(flatNo, email))`);

    // Ensure any community JSON files (including Community 8) are present in the community and login tables.
    const communityFiles = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json')).sort();
    communityFiles.forEach((file) => {
      try {
        const filePath = path.join(communityDataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const match = file.match(/community(\d+)\.json$/i);
        const cid = match ? parseInt(match[1], 10) : null;
        const pwd = cid ? `pass${cid}` : 'pass8';

        if (data && data.email) {
          db.run(
            "INSERT OR REPLACE INTO community (id, customerName, flatNo, email) VALUES (?,?,?,?)",
            [cid, data.customerName, data.flatNo, data.email]
          );
          db.run(
            "INSERT OR REPLACE INTO community_login (email, password) VALUES (?,?)",
            [data.email, pwd]
          );
        }
      } catch (err) {
        console.error('Error syncing community file to DB:', file, err);
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS client (sno INTEGER PRIMARY KEY, flatNo TEXT, deviceId TEXT, customerName TEXT, email TEXT UNIQUE, phone TEXT, address TEXT, lat REAL, lng REAL, registrationDate TEXT, status TEXT, subscriptionPlan TEXT, accessLevel TEXT, isNew INTEGER)`);

    // Only populate devices if the table is empty (preserve mappings across restarts)
    db.get('SELECT COUNT(*) as count FROM device', (err, row) => {
      if (err) {
        console.error('Error checking device count:', err);
        log('SQLite database initialized');
        if (callback) callback();
        return;
      }

      const existingDevices = (row && row.count) || 0;
  
      if (existingDevices === 0) {
        // No devices exist, populate from JSON files
        const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json'));
        files.sort();
        files.forEach((file, idx) => {
          const data = JSON.parse(fs.readFileSync(path.join(communityDataDir, file), 'utf8'));
          const cid = idx + 1;
          db.run(
            "INSERT OR REPLACE INTO community (id, customerName, flatNo, email) VALUES (?,?,?,?)",
            [cid, data.customerName, data.flatNo, data.email]
          );

          // Map community files to stable login credentials by file index and email.
          // Ensure customer1@meghasmart.com always stays pass1.
          let pwd = `pass${cid}`;
          const fileMatch = file.match(/community(\d+)\.json$/i);
          if (fileMatch) {
            pwd = `pass${fileMatch[1]}`; // use explicit file number if present.
          }
          if (data.email === 'customer1@meghasmart.com') {
            pwd = 'pass1';
          }

          db.run(
            "INSERT OR REPLACE INTO community_login (email, password) VALUES (?,?)",
            [data.email, pwd]
          );

          if (Array.isArray(data.devices)) {
            data.devices.forEach(dev => {
              db.run(
                "INSERT OR REPLACE INTO device (communityId, flatNo, deviceId, sensorType, status, lastDataPush) VALUES (?,?,?,?,?,?,?)",
                [cid, dev.flatNo, dev.deviceId, dev.sensorType, dev.status, Date.now()]
              );
            });
          }
        });
        log('Populated devices from JSON files');
      } else {
        log(`Preserved ${existingDevices} existing devices with mappings`);
      }

      log('SQLite database initialized');
      if (callback) callback();
    });
  });
}

// write all seven community files (call again whenever underlying arrays change)
function saveAllCommunityFiles() {
  for (let i = 0; i < 7; i++) {
    saveCommunityFile(i);
  }
}

// generate the JSON on disk before we initialise the sqlite DB so the import
// step sees the latest assignment.  previously the call came afterwards which
// meant only whatever files existed from the last run were imported (hence only
// two communities).

// Initialize DB and then load clients, devices, mappings
initDatabase(() => {
  // Clean up deleted yellow devices from database
  DELETED_DEVICE_IDS.forEach(deviceId => {
    db.run('DELETE FROM device WHERE deviceId = ?', [deviceId], (err) => {
      if (err) {
        console.error(`Error deleting device ${deviceId}:`, err);
      } else {
        log(`✓ Cleaned up deleted device: ${deviceId}`);
      }
    });
  });

  db.all(`SELECT client.*, community.id AS communityId
          FROM client
          LEFT JOIN community ON client.email = community.email`, (err, rows) => {
    if (err) {
      console.error('Error loading clients from database:', err);
      return;
    }

    clientsDatabase = rows.map(row => ({
      ...row,
      communityId: row.communityId,
      coordinates: { lat: row.lat, lng: row.lng },
      registrationDate: new Date(row.registrationDate),
      isNew: row.isNew === 1
    }));
    log(`Loaded ${clientsDatabase.length} clients from database`);

    loadDevicesFromDatabase(() => {
      loadCommunityMappingsFromDatabase(() => {
        // Save community files once the in-memory state is restored
        saveAllCommunityFiles();
      });
    });
  });
});

// ------------------------------------------------------------------

/**
 * Build the JSON structure that is written to each community file.
 * This mirrors the data that is exported to Excel currently.
 * NOTE: Maximum of 1,400 devices across all community assignments.
 * In this setup we now generate 1,400 total devices and split them evenly (200 per community) across community files.
 */
function generateCommunityData(index) {
  const selectedCommunities = clientsDatabase.slice(0, MAX_COMMUNITIES);
  const client = selectedCommunities[index];
  if (!client) return null;

  // Prefer explicit ownership through communityId when available.
  let clientDevices = devicesDatabase
    .filter(d => d.communityId === client.communityId)
    .map(d => ({
      flatNo: d.flatNo,
      deviceId: d.deviceId,
      sensorType: d.sensorType,
      status: d.status
    }));

  // Legacy fallback: if no explicit assignment exists, preserve existing distribution
  if (clientDevices.length === 0) {
    const communityCount = selectedCommunities.length || 1;
    const devicesPerCommunity = Math.floor(devicesDatabase.length / communityCount);
    const remainder = devicesDatabase.length % communityCount;

    const extraThisCommunity = index < remainder ? 1 : 0;
    const startIndex = index * devicesPerCommunity + Math.min(index, remainder);
    const endIndex = startIndex + devicesPerCommunity + extraThisCommunity;

    const slice = devicesDatabase.slice(startIndex, endIndex);
    for (let i = slice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slice[i], slice[j]] = [slice[j], slice[i]];
    }

    clientDevices = slice.map(d => ({
      flatNo: d.flatNo,
      deviceId: d.deviceId,
      sensorType: d.sensorType,
      status: d.status
    }));
  }

  return {
    customerName: client.customerName,
    flatNo: client.flatNo,
    email: client.email,
    devices: clientDevices
  };
}

function getNextFlatNoForCommunity(communityData) {
  const existingFlatNos = communityData.devices
    .map(d => d.flatNo)
    .filter(Boolean);

  if (existingFlatNos.length === 0) {
    return 'A8-001';
  }

  // Parse all flatNos: extract prefix (A8, A9, A10, etc.) and series number
  const flatNoMap = new Map(); // prefix -> array of numbers
  existingFlatNos.forEach(flatNo => {
    const match = /^([A-Z]+\d+)-(\d+)$/i.exec(flatNo);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2], 10);
      if (!flatNoMap.has(prefix)) {
        flatNoMap.set(prefix, []);
      }
      flatNoMap.get(prefix).push(number);
    }
  });

  // Find the last prefix (alphabetically/numerically highest)
  const prefixes = Array.from(flatNoMap.keys()).sort();
  if (prefixes.length === 0) {
    return 'A8-001';
  }

  const lastPrefix = prefixes[prefixes.length - 1];
  const numbersInLastPrefix = flatNoMap.get(lastPrefix).sort((a, b) => a - b);
  const maxNumberInLastPrefix = Math.max(...numbersInLastPrefix);
  const countInLastPrefix = numbersInLastPrefix.length;

  // If last prefix has 10 or more devices, move to next prefix (e.g., A8 -> A9)
  if (countInLastPrefix >= 10) {
    const prefixMatch = /^([A-Z]+)(\d+)$/i.exec(lastPrefix);
    if (prefixMatch) {
      const letters = prefixMatch[1];
      const number = parseInt(prefixMatch[2], 10);
      const nextNumber = number + 1;
      return `${letters}${nextNumber}-001`;
    }
  }

  // Otherwise stay in same prefix, increment the series number
  const nextNumber = maxNumberInLastPrefix + 1;
  return `${lastPrefix}-${String(nextNumber).padStart(3, '0')}`;
}

const SPECIAL_COMMUNITY_EMAILS = new Set(['customer8@meghasmart.com', 'customer9@meghasmart.com']);

function loadCommunityJsonByEmail(email) {
  const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const filePath = path.join(communityDataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && data.email === email) {
        const match = file.match(/community(\d+)\.json$/i);
        const communityId = match ? parseInt(match[1], 10) : null;
        return { data, communityId };
      }
    } catch (err) {
      console.error('Error loading community file:', file, err);
    }
  }
  return null;
}

function resolveSpecialCommunityDeviceForLeak(deviceId) {
  const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const filePath = path.join(communityDataDir, file);
      const communityData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const foundDevice = (communityData.devices || []).find(d => d.deviceId === deviceId);
      if (foundDevice) {
        const retailDevice = retailDevices.find(r => r.deviceId === foundDevice.deviceId);
        const status = retailDevice && typeof retailDevice.status !== 'undefined'
          ? normalizeDeviceStatus(retailDevice.status)
          : normalizeDeviceStatus(foundDevice.status);
        const match = file.match(/community(\d+)\.json$/i);
        const communityId = match ? parseInt(match[1], 10) : null;
        return {
          communityId,
          device: {
            flatNo: foundDevice.flatNo || '',
            deviceId: foundDevice.deviceId,
            sensorType: foundDevice.sensorType || 'External Device',
            status
          }
        };
      }
    } catch (err) {
      console.warn(`Error resolving special community device from ${file}:`, err);
    }
  }

  const mapping = Object.values(communityMappingDatabase).find(m => m.deviceId === deviceId);
  if (mapping) {
    return {
      communityId: null,
      device: {
        flatNo: mapping.flatNo || '',
        deviceId: mapping.deviceId,
        sensorType: mapping.sensorType || 'External Device',
        status: normalizeDeviceStatus(mapping.status)
      }
    };
  }

  return null;
}

function getSpecialCommunityIdByEmail(email) {
  const specialCommunity = loadCommunityJsonByEmail(email);
  return specialCommunity ? specialCommunity.communityId : null;
}

// helper that returns community details (including devices assigned) by login
// email.  Prefer explicit communityId ownership.  Fall back to modulo mapping if
// no explicit assignments exist, for legacy behavior.
function getCommunityDataByEmail(email) {
  const selectedClients = clientsDatabase.slice(0, MAX_COMMUNITIES);
  const client = selectedClients.find(c => c.email === email);
  if (!client) {
    const specialCommunity = loadCommunityJsonByEmail(email);
    if (specialCommunity && specialCommunity.data && Array.isArray(specialCommunity.data.devices)) {
      const communityData = specialCommunity.data;
      const devices = communityData.devices.map(d => {
        const retailDevice = retailDevices.find(r => r.deviceId === d.deviceId);
        return {
          flatNo: d.flatNo || '',
          deviceId: d.deviceId,
          sensorType: d.sensorType || 'External Device',
          status: retailDevice && typeof retailDevice.status !== 'undefined'
            ? normalizeDeviceStatus(retailDevice.status)
            : normalizeDeviceStatus(d.status)
        };
      });

      return {
        customerName: communityData.customerName,
        flatNo: communityData.flatNo,
        email: communityData.email,
        devices,
        isSpecialCommunity: SPECIAL_COMMUNITY_EMAILS.has(communityData.email)
      };
    }
    return null;
  }

  // Prefer explicit assignment via communityId to avoid modulo drift
  let assignedDevices = [];
  if (client.communityId != null) {
    assignedDevices = devicesDatabase
      .filter(d => d.communityId === client.communityId)
      .map(d => ({
        flatNo: d.flatNo,
        deviceId: d.deviceId,
        sensorType: d.sensorType,
        status: d.status
      }));
  }

  // Also respect explicit mapping log entries in communityMappingDatabase
  const mappedDevicesByEmail = Object.values(communityMappingDatabase)
    .filter(m => m.email === email && m.isMapped && m.deviceId)
    .map(m => ({
      flatNo: m.flatNo,
      deviceId: m.deviceId,
      sensorType: m.sensorType || 'Unknown',
      status: m.status  // Preserve numeric status from mapping (1, 2, 3, or 4)
    }));

  if (mappedDevicesByEmail.length > 0) {
    const deviceMap = new Map(assignedDevices.map(d => [d.deviceId, d]));
    mappedDevicesByEmail.forEach(d => {
      if (!deviceMap.has(d.deviceId)) {
        deviceMap.set(d.deviceId, d);
      }
    });
    assignedDevices = Array.from(deviceMap.values());
  }

  // Legacy fallback: keep old behavior if explicit references are missing
  if (assignedDevices.length === 0 && selectedClients.length > 0) {
    const idx = selectedClients.findIndex(c => c.email === email);
    assignedDevices = devicesDatabase
      .map((device, i) => ({
        ...device,
        clientIdx: i % selectedClients.length
      }))
      .filter(d => d.clientIdx === idx)
      .map(d => ({
        flatNo: d.flatNo,
        deviceId: d.deviceId,
        sensorType: d.sensorType,
        status: d.status
      }));
  }

  return {
    customerName: client.customerName,
    flatNo: client.flatNo,
    email: client.email,
    devices: assignedDevices
  };
}

function resolveCommunity8DeviceForLeak(deviceId) {
  const specialTarget = resolveSpecialCommunityDeviceForLeak(deviceId);
  return specialTarget ? specialTarget.device : null;
}

// write a single community file
function saveCommunityFile(index) {
  const data = generateCommunityData(index);
  if (!data) {
    log(`Warning: generateCommunityData(${index}) returned null`);
    return;
  }
  const filePath = path.join(communityDataDir, `community${index + 1}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  log(`✓ Saved community${index + 1}.json`);
}

// helper to load all community file contents (used by new route below)
function loadAllCommunityFiles() {
  const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json')); 
  return files
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(communityDataDir, f), 'utf8')));
}

// load devices from SQLite into in-memory DB (for persistence across restarts)
function loadDevicesFromDatabase(callback) {
  db.all('SELECT * FROM device', (err, rows) => {
    if (err) {
      console.error('Error loading devices from database:', err);
      if (callback) callback(err);
      return;
    }

    if (rows && rows.length > 0) {
      // Filter out deleted devices
      devicesDatabase = rows
        .filter(row => !DELETED_DEVICE_IDS.includes(row.deviceId))
        .map(row => ({
          communityId: row.communityId || null,
          flatNo: row.flatNo,
          deviceId: row.deviceId,
          sensorType: row.sensorType,
          status: parseInt(row.status) || 1,  // Ensure status is numeric
          lastDataPush: row.lastDataPush ? parseInt(row.lastDataPush) : Date.now()
        }));

      if (devicesDatabase.length > TOTAL_RETAIL_DEVICES) {
        // No longer trim the device list; allow count to exceed TOTAL_RETAIL_DEVICES
        log(`Device count exceeds TOTAL_RETAIL_DEVICES: ${devicesDatabase.length}`);
      }

      log(`Loaded ${devicesDatabase.length} devices from database`);
    } else {
      log('No devices found in database, using generated defaults');
      devicesDatabase = shuffleArray(generateMockDevices(TOTAL_RETAIL_DEVICES));
    }

    if (callback) callback();
  });
}

// load community mapping data from SQLite into in-memory cache
function loadCommunityMappingsFromDatabase(callback) {
  db.all('SELECT * FROM community_mapping', (err, rows) => {
    if (err) {
      console.error('Error loading community mappings from database:', err);
      if (callback) callback(err);
      return;
    }

    communityMappingDatabase = {};
    if (rows && rows.length > 0) {
      rows.forEach(row => {
        const mappingKey = `${row.flatNo}|${row.email}`;
        // Ensure status is numeric (1-5) if loaded from DB as string
        let status = row.status;
        if (typeof status === 'string') {
          const normalized = status.trim().toLowerCase();
          const numericValue = parseInt(normalized, 10);
          if (!Number.isNaN(numericValue) && [1, 2, 3, 4, 5].includes(numericValue)) {
            status = numericValue;
          } else {
            switch (normalized) {
              case 'initialize':
              case 'initializing':
              case 'init':
                status = 1;
                break;
              case 'no communication':
              case 'no-communication':
              case 'offline':
              case 'inactive':
                status = 2;
                break;
              case 'alert':
                status = 3;
                break;
              case 'panic':
              case 'panic alert':
              case 'panic-alert':
              case 'panic_alert':
                status = 5;
                break;
              case 'good':
              case 'online':
              case 'active':
              case 'mapped':
                status = 4;
                break;
              default:
                status = 1;
            }
          }
        } else if (typeof status !== 'number') {
          status = 1;
        }
        
        communityMappingDatabase[mappingKey] = {
          flatNo: row.flatNo,
          email: row.email,
          customerName: row.customerName,
          deviceId: row.deviceId,
          sensorType: row.sensorType,
          location: row.location,
          mappedDate: row.mappedDate ? new Date(row.mappedDate) : null,
          mappedBy: row.mappedBy,
          status: status,
          isMapped: row.isMapped === 1
        };
      });
    }

    log(`Loaded ${rows.length} community mappings from database`);
    if (callback) callback();
  });
}



// Generate unique device IDs with GVM format: GVM + YEAR + 5-digit sequential number
// Format: GVM202500001, GVM202500002, ...
function generateDeviceId() {
  // Always check the latest deviceId in devices.json before generating
  deviceIdCounter = getLastDeviceIdFromFile() + 1;
  const year = new Date().getFullYear();
  const sequentialNumber = String(deviceIdCounter).padStart(5, '0');
  const deviceId = `GVM${year}${sequentialNumber}`;
  deviceIdCounter++;
  return deviceId;
}

// Fisher-Yates shuffle helper to randomize assignment order
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate 1000 mock clients with location details
function generateMockClients(count) {
  const clients = [];
  const locations = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Hall', 'Balcony', 'Garage', 'Office', 'Terrace', 'Basement'];
  const cities = ['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
  
  for (let i = 1; i <= count; i++) {
    const building = Math.floor((i - 1) / 50) + 1;
    const floor = Math.floor(((i - 1) % 50) / 5) + 1;
    const unit = ((i - 1) % 5) + 1;
    
    clients.push({
      sno: i,
      flatNo: `A${building}-${floor}0${unit}`,
      deviceId: generateDeviceId(),
      customerName: `${['Rajesh', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Divya', 'Arun', 'Pooja'][i % 10]} ${['Kumar', 'Singh', 'Patel', 'Sharma', 'Gupta', 'Khan', 'Jain', 'Verma', 'Nair', 'Desai'][Math.floor(i / 10) % 10]}`,
      email: `customer${i}@meghasmart.com`,
      phone: `98${String(i).padStart(8, '0')}`,
      address: `${locations[i % locations.length]}, ${cities[i % cities.length]}`,
      coordinates: {
        lat: (19 + Math.random() * 0.2).toFixed(4),
        lng: (73 + Math.random() * 0.2).toFixed(4)
      },
      registrationDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      status: Math.random() > 0.1 ? 'Active' : 'Inactive',
      subscriptionPlan: ['Basic', 'Pro', 'Premium'][(i % 3)],
      accessLevel: ['Full', 'Read-only', 'Limited'][(i % 3)],
      isNew: false
    });
  }
  return clients;
}

// Generate mock devices with sensor data
function generateMockDevices(count) {
  const devices = [];
  const sensorTypes = ['Gas Sensor', 'Smoke Detector', 'Temperature Sensor', 'Humidity Sensor', 'Multi-Sensor'];
  const possibleStatuses = [
    statusMapping.STATUS.INITIALIZE,
    statusMapping.STATUS.NO_COMMUNICATION,
    statusMapping.STATUS.ALERT,
    statusMapping.STATUS.GOOD
  ];
  
  for (let i = 1; i <= count; i++) {
    const building = Math.floor((i - 1) / 50) + 1;
    const floor = Math.floor(((i - 1) % 50) / 5) + 1;
    const unit = ((i - 1) % 5) + 1;
    
    // Randomly assign status with weights: 60% Good, 20% Initialize, 10% No Communication, 10% Alert
    let status;
    const rand = Math.random();
    if (rand < 0.6) {
      status = statusMapping.STATUS.GOOD;
    } else if (rand < 0.8) {
      status = statusMapping.STATUS.INITIALIZE;
    } else if (rand < 0.9) {
      status = statusMapping.STATUS.NO_COMMUNICATION;
    } else {
      status = statusMapping.STATUS.ALERT;
    }
    
    const communityId = Math.floor((i - 1) / 200) + 1;
    
    devices.push({
      sno: i,
      communityId: communityId,
      flatNo: `A${building}-${floor}0${unit}`, 
      deviceId: generateDeviceId(),
      status: status,
      sensorType: sensorTypes[i % sensorTypes.length],
      lastActive: new Date(Date.now() - Math.random() * 7 * 86400000),
      firmwareVersion: '2.1.0',
      batteryLevel: Math.floor(Math.random() * 100) + 20,
      signalStrength: Math.floor(Math.random() * 100),
      location: `Floor ${floor}, Unit ${unit}`,
      
      // Real-time sensor data
      sensorData: {
        gasLevel: (Math.random() * 50 + 10).toFixed(1), // ppm
        temperature: (Math.random() * 10 + 20).toFixed(1), // Celsius
        humidity: (Math.random() * 30 + 40).toFixed(0), // %
        smokeLevel: (Math.random() * 30).toFixed(1) // ppm
      },
      
      // Installation details
      installedDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      
      // Connection info
      connectionType: ['WiFi', 'Zigbee', 'LoRaWAN', 'Cellular'][i % 4],
      lastSyncTime: new Date(Date.now() - Math.random() * 300000),
      
      // Maintenance info
      maintenanceStatus: Math.random() > 0.9 ? 'Needs Service' : 'Good',
      nextMaintenanceDate: new Date(Date.now() + Math.random() * 90 * 86400000)
    });
  }
  return devices;
}

// Generate mock alerts with severity levels
function generateMockAlerts(count) {
  const alerts = [];
  const alertTypes = [
    { name: 'Gas Leak', severity: 'High', icon: '⚠️' },
    { name: 'Low Battery', severity: 'Medium', icon: '🔋' },
    { name: 'Connection Lost', severity: 'Medium', icon: '📡' },
    { name: 'High Temperature', severity: 'High', icon: '🔥' },
    { name: 'Maintenance Required', severity: 'Low', icon: '🔧' },
    { name: 'Smoke Detected', severity: 'High', icon: '💨' },
    { name: 'Humidity Alert', severity: 'Low', icon: '💧' },
    { name: 'Device Offline', severity: 'Medium', icon: '❌' }
  ];
  
  for (let i = 1; i <= count; i++) {
    const building = Math.floor(Math.random() * 20) + 1;
    const floor = Math.floor(Math.random() * 10) + 1;
    const unit = Math.floor(Math.random() * 5) + 1;
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    alerts.push({
      id: i,
      deviceId: generateDeviceId(),
      flatNo: `A${building}-${floor}0${unit}`,
      alertType: alertType.name,
      severity: alertType.severity,
      icon: alertType.icon,
      timestamp: new Date(Date.now() - Math.random() * 30 * 86400000),
      status: Math.random() > 0.4 ? 'Active' : 'Resolved',
      
      // Alert details
      description: `${alertType.name} detected in flat A${building}-${floor}0${unit}`,
      detectedValue: (Math.random() * 100).toFixed(2),
      unit: ['ppm', 'V', 'dB', '°C', '%'][Math.floor(Math.random() * 5)],
      
      // Alert actions
      acknowledgedBy: Math.random() > 0.5 ? `Admin User ${Math.floor(Math.random() * 5) + 1}` : null,
      acknowledgedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 10 * 86400000) : null,
      resolvedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 5 * 86400000) : null,
      
      // Escalation
      escalatedToSupervisor: Math.random() > 0.8,
      notificationChannels: ['SMS', 'Email', 'Push', 'Phone Call'],
      
      // Ticket info
      ticketId: `TKT-${String(i).padStart(6, '0')}`,
      priority: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)]
    });
  }
  return alerts;
}

// Initialize database after all functions are defined
initDatabase(() => {
  // Load clients from database after init completes
  db.all('SELECT * FROM client', (err, rows) => {
    if (err) {
      console.error('Error loading clients from database:', err);
    } else {
      clientsDatabase = rows.map(row => ({
        ...row,
        coordinates: { lat: row.lat, lng: row.lng },
        registrationDate: new Date(row.registrationDate),
        isNew: row.isNew === 1
      }));
      log(`Loaded ${clientsDatabase.length} clients from database`);
    }
  });
});

// ------------------------------------------------------------------
// Device Limit Constants and Helper Functions
// ------------------------------------------------------------------
const MAX_DEVICES_PER_COMMUNITY = 200; // Maximum devices allowed per community

// Helper function to check device count for a community
function getDeviceCountForCommunity(communityId, callback) {
  db.get(
    'SELECT COUNT(*) as count FROM device WHERE communityId = ?',
    [communityId],
    (err, row) => {
      if (err) {
        console.error('Error counting devices:', err);
        callback(0);
      } else {
        callback(row ? row.count : 0);
      }
    }
  );
}

// Helper function to check if community can accept more devices
function canAddDevices(communityId, isWithinLimit, callback) {
  getDeviceCountForCommunity(communityId, (count) => {
    callback(count < MAX_DEVICES_PER_COMMUNITY);
  });
}

// Routes

// Login Page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Handler
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS[email];
  if (user && user.password === password) {
    req.session.loggedIn = true;
    req.session.email = email;
    req.session.role = user.role;
    // Detect if request is API (AJAX/JSON) or browser form
    const acceptsJSON = req.xhr || req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
    if (acceptsJSON) {
      res.json({ success: true });
    } else {
      res.redirect('/dashboard');
    }
  } else {
    const acceptsJSON = req.xhr || req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
    if (acceptsJSON) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    } else {
      res.render('login', { error: 'Invalid email or password' });
    }
  }
});

// Community login page (six communities with their own credentials)
app.get('/community-login', (req, res) => {
  // pass credentials list to view
  db.all('SELECT email, password FROM community_login ORDER BY email', [], (err, rows) => {
    const creds = rows || [];
    res.render('community-login', { error: null, credentials: creds });
  });
});

app.post('/community-login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT password FROM community_login WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('DB error on community login', err);
      return res.render('community-login', { error: 'Server error', credentials: [] });
    }
    if (row && row.password === password) {
      req.session.communityLoggedIn = true;
      req.session.communityEmail = email;
      res.redirect('/community/dashboard');
    } else {
      res.render('community-login', { error: 'Invalid email or password', credentials: [] });
    }
  });
});

// middleware for community auth
function checkCommunityAuth(req, res, next) {
  if (req.session.communityLoggedIn) {
    next();
  } else {
    res.redirect('/community-login');
  }
}

// Add Retail Device (API): Returns next device ID in sequence

// Helper to load all retail devices from file
function loadRetailDevices() {
  try {
    if (fs.existsSync(devicesFilePath)) {
      return JSON.parse(fs.readFileSync(devicesFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading devices.json:', e);
  }
  return [];
}

// Helper to save all retail devices to file
function saveRetailDevices(devices) {
  try {
    fs.writeFileSync(devicesFilePath, JSON.stringify(devices, null, 2), 'utf8');
    retailDevices = devices;
  } catch (e) {
    console.error('Error saving devices.json:', e);
  }
}

// Load devices at startup
let retailDevices = loadRetailDevices();

// Merge retailDevices into devicesDatabase, normalizing MAC addresses
const normalizeMac = mac => (mac || '').trim().toLowerCase();
const existingMacs = new Set(devicesDatabase.map(d => normalizeMac(d.macAddress)));
retailDevices.forEach(device => {
  const normMac = normalizeMac(device.macAddress);
  if (normMac && !existingMacs.has(normMac)) {
    // Normalize MAC in retailDevices as well
    device.macAddress = normMac;
    devicesDatabase.push(device);
    existingMacs.add(normMac);
  }
});

app.post('/api/retail-devices/add', (req, res) => {
  // Accepts { macAddress: "..." } in body
  const { macAddress, ...rest } = req.body;
  if (!macAddress) {
    return res.status(400).json({ error: 'macAddress is required' });
  }

  // Normalize MAC address for comparison and storage
  const normMac = macAddress.trim().toLowerCase();
  // Check in retailDevices (persistent) first
  let existingDevice = retailDevices.find(d => (d.macAddress || '').trim().toLowerCase() === normMac);
  if (!existingDevice) {
    // Also check in devicesDatabase (for legacy/memory)
    existingDevice = devicesDatabase.find(d => (d.macAddress || '').trim().toLowerCase() === normMac);
  }
  if (existingDevice) {
    // Update existing device with any new fields except deviceId
    Object.keys(rest).forEach(key => {
      if (key !== 'deviceId') {
        existingDevice[key] = rest[key];
      }
    });
    existingDevice.lastDataPush = Date.now();
    saveRetailDevices(retailDevices); // persist any updates
    return res.json({ deviceId: existingDevice.deviceId, updated: true });
  }

  // Generate next device ID
  const deviceId = generateDeviceId();
  const newDevice = {
    deviceId,
    macAddress: normMac, // always store normalized
    createdAt: new Date().toISOString(),
    ...rest
  };
  retailDevices.push(newDevice);
  saveRetailDevices(retailDevices);
  // Also add to devicesDatabase for consistency
  devicesDatabase.push(newDevice);
  res.json({ deviceId, created: true });
});

// API to get all retail devices
app.get('/api/retail-devices', (req, res) => {
  res.json({ devices: retailDevices });
});

/**
 * Normalize device status into numeric 1-5 status values.
 * 1 = Initialize, 2 = No Communication, 3 = Alert, 4 = Good, 5 = Panic Alert
 */
function normalizeDeviceStatus(status) {
  if (typeof status === 'number') {
    if ([1, 2, 3, 4, 5].includes(status)) {
      return status;
    }
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    const numericValue = parseInt(normalized, 10);
    if (!Number.isNaN(numericValue) && [1, 2, 3, 4, 5].includes(numericValue)) {
      return numericValue;
    }

    switch (normalized) {
      case 'initialize':
      case 'initializing':
      case 'init':
        return 1;
      case 'no communication':
      case 'no-communication':
      case 'offline':
      case 'inactive':
        return 2;
      case 'alert':
      case 'error':
        return 3;
      case 'panic':
      case 'panic alert':
      case 'panic-alert':
      case 'panic_alert':
        return 5;
      case 'good':
      case 'online':
      case 'active':
        return 4;
      default:
        return 2;
    }
  }

  return 2;
}

// community dashboard
app.get('/community/dashboard', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  let devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  res.render('community-dashboard', { community, devices, statusMapping });
});

// API endpoint for community dashboard statistics (for auto-refresh)
app.get('/api/community/dashboard/stats', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  let devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const stats = {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.status === 4).length, // Good status
    alertDevices: devices.filter(d => d.status === 3 || d.status === 5).length, // Alert and Panic Alert statuses
    offlineDevices: devices.filter(d => d.status === 2).length, // No Communication
    initializeDevices: devices.filter(d => d.status === 1).length // Initialize
  };

  res.json({ community, devices, stats });
});

// export community devices to Excel
app.get('/community/export', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  const devices = community.devices;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Devices');
  worksheet.addRow(['Flat No', 'Device ID', 'Sensor Type', 'Status']);
  devices.forEach(d => {
    worksheet.addRow([d.flatNo, d.deviceId, d.sensorType, d.status]);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${community.flatNo}_${new Date().toISOString().split('T')[0]}.xlsx"`);
  workbook.xlsx.write(res).then(() => res.end());
});

// community devices page
app.get('/community/devices', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  let devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  res.render('community-my-devices', { community, devices, statusMapping });
});

// API: Get device status counts for community (for real-time updates)
app.get('/api/community/device-status-counts', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const statusCounts = {};
  statusCounts[statusMapping.STATUS.INITIALIZE] = devices.filter(d => d.status === statusMapping.STATUS.INITIALIZE).length;
  statusCounts[statusMapping.STATUS.NO_COMMUNICATION] = devices.filter(d => d.status === statusMapping.STATUS.NO_COMMUNICATION).length;
  statusCounts[statusMapping.STATUS.ALERT] = devices.filter(d => d.status === statusMapping.STATUS.ALERT).length;
  statusCounts[statusMapping.STATUS.GOOD] = devices.filter(d => d.status === statusMapping.STATUS.GOOD).length;

  res.json({
    success: true,
    totalDevices: devices.length,
    statusCounts: statusCounts,
    timestamp: Date.now()
  });
});

// API: Get device list with updated statuses (for real-time table refresh)
app.get('/api/community/devices-list', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let devices = community.devices.map(d => ({
    flatNo: d.flatNo,
    deviceId: d.deviceId,
    sensorType: d.sensorType,
    status: normalizeDeviceStatus(d.status)
  }));

  res.json({
    success: true,
    devices: devices,
    timestamp: Date.now()
  });
});

// community profile
app.get('/community/profile', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  let devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  res.render('community-profile', { community, devices, statusMapping });
});

// community tickets
app.get('/community/tickets', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }
  if (!SPECIAL_COMMUNITY_EMAILS.has(community.email)) {
    return res.redirect('/community/dashboard');
  }
  const devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));
  res.render('community-tickets', { community, devices, statusMapping });
});

// special community reports
app.get('/community/reports', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  if (!SPECIAL_COMMUNITY_EMAILS.has(email)) {
    return res.redirect('/community/dashboard');
  }

  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  const devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {});

  const typeCounts = devices.reduce((acc, device) => {
    const type = device.sensorType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  res.render('community-reports', {
    community,
    devices,
    statusMapping,
    statusCounts,
    typeCounts
  });
});

app.get('/community/reports/export', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  if (!SPECIAL_COMMUNITY_EMAILS.has(email)) {
    return res.redirect('/community/dashboard');
  }

  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  const devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {});

  const typeCounts = devices.reduce((acc, device) => {
    const typeName = device.sensorType || 'Unknown';
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {});

  const specialCommunityId = getSpecialCommunityIdByEmail(email) || 8;
  const type = (req.query.type || 'detailed').toLowerCase();
  const filename = `${community.customerName.replace(/\s+/g, '_')}_${type === 'leak-history' ? 'leak_history' : type === 'summary' ? 'summary' : 'detailed'}.pdf`;

  const formatAsIST = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffsetMs);
    const pad = n => String(n).padStart(2, '0');
    return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())} ${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}`;
  };

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const lineHeight = 20;
  const headerHeight = 26;

  const renderTable = (headers, rows, widths) => {
    const startX = doc.page.margins.left;
    const maxY = doc.page.height - doc.page.margins.bottom;
    const totalWidth = widths.reduce((total, width) => total + width, 0);
    const columnWidths = widths.map(w => (pageWidth * w) / totalWidth);
    const columnPositions = columnWidths.reduce((positions, width, index) => {
      positions[index] = index === 0 ? startX : positions[index - 1] + columnWidths[index - 1];
      return positions;
    }, []);

    const renderHeaderRow = y => {
      doc.fillColor('#f3f4f6').rect(startX, y, pageWidth, headerHeight).fill();
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
      headers.forEach((header, index) => {
        doc.text(header, columnPositions[index] + 6, y + 7, {
          width: columnWidths[index] - 12,
          align: 'left',
          lineBreak: false
        });
      });
      doc.strokeColor('#d1d5db').lineWidth(0.5);
      doc.moveTo(startX, y + headerHeight).lineTo(startX + pageWidth, y + headerHeight).stroke();
      columnPositions.forEach(x => {
        doc.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
      });
      doc.moveTo(startX + pageWidth, y).lineTo(startX + pageWidth, y + headerHeight).stroke();
    };

    let y = doc.y;
    if (y + headerHeight >= maxY) {
      doc.addPage();
      y = doc.y;
    }
    renderHeaderRow(y);
    y += headerHeight;

    rows.forEach(row => {
      if (y + lineHeight >= maxY) {
        doc.addPage();
        y = doc.y;
        renderHeaderRow(y);
        y += headerHeight;
      }

      doc.font('Helvetica').fontSize(9).fillColor('#111827');
      row.forEach((cell, index) => {
        doc.text(cell || '-', columnPositions[index] + 6, y + 6, {
          width: columnWidths[index] - 12,
          align: 'left',
          lineBreak: false
        });
      });
      doc.strokeColor('#e5e7eb').lineWidth(0.5);
      doc.moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
      doc.moveTo(startX, y + lineHeight).lineTo(startX + pageWidth, y + lineHeight).stroke();
      columnPositions.forEach(x => {
        doc.moveTo(x, y).lineTo(x, y + lineHeight).stroke();
      });
      doc.moveTo(startX + pageWidth, y).lineTo(startX + pageWidth, y + lineHeight).stroke();
      y += lineHeight;
    });
    doc.y = y + 12;
  };

  const renderSectionTitle = title => {
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(title, { underline: true });
    doc.moveDown(0.5);
  };

  doc.font('Helvetica-Bold').fontSize(18).text(`${community.customerName} Report`, { align: 'center' });
  doc.moveDown();
  doc.font('Helvetica').fontSize(12).text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  doc.moveDown();

  if (type === 'summary') {
    renderSectionTitle('Summary');
    renderTable(
      ['Metric', 'Value'],
      [
        ['Total Devices', String(devices.length)],
        ['Online Devices', String(statusCounts[statusMapping.STATUS.GOOD] || 0)],
        ['Offline Devices', String(statusCounts[statusMapping.STATUS.NO_COMMUNICATION] || 0)],
        ['Alert Devices', String(statusCounts[statusMapping.STATUS.ALERT] || 0)],
        ['Panic Alert Devices', String(statusCounts[statusMapping.STATUS.PANIC_ALERT] || 0)],
        ['Initialize Devices', String(statusCounts[statusMapping.STATUS.INITIALIZE] || 0)]
      ],
      [1, 1]
    );
    doc.moveDown();
    renderSectionTitle('Sensor Type Breakdown');
    renderTable(
      ['Sensor Type', 'Count'],
      Object.entries(typeCounts).map(([typeName, count]) => [typeName, String(count)]),
      [2, 1]
    );
  } else if (type === 'leak-history') {
    renderSectionTitle('Leak History');
    try {
      const leakHistory = leakHistoryService.getLeakHistory(specialCommunityId);
      if (leakHistory.length === 0) {
        doc.font('Helvetica').fontSize(11).text('No leak events recorded.');
      } else {
        renderTable(
          ['Device ID', 'Sensor Type', 'Event Type', 'Leak Status', 'Occurred At'],
          leakHistory.map(record => [
            record.deviceId || '-',
            record.sensorType || '-',
            record.eventType || '-',
            record.leakStatus || '-',
            formatAsIST(record.timeOccurred)
          ]),
          [1.3, 1.4, 1.4, 1, 1.4]
        );
      }
    } catch (err) {
      console.error('Error retrieving leak history:', err);
      doc.font('Helvetica').fontSize(11).text('Error reading leak history');
    }
  } else {
    renderSectionTitle('Current Device Status');
    renderTable(
      ['Flat / Location', 'Device ID', 'Sensor Type', 'Status'],
      devices.map(device => [
        device.flatNo || device.assignedCommunity || '-',
        device.deviceId || '-',
        device.sensorType || '-',
        statusMapping.getStatusLabel(device.status) || String(device.status)
      ]),
      [1.4, 1, 1.4, 1]
    );

    doc.addPage();
    renderSectionTitle('Event History');
    try {
      const eventHistory = leakHistoryService.getEventHistory(specialCommunityId);
      if (eventHistory.length === 0) {
        doc.font('Helvetica').fontSize(11).text('No device event history recorded.');
      } else {
        const formatEventType = type => {
          if (!type) return '-';
          if (type === 'STATUS_CHANGED') return 'Status Changed';
          return type.replace(/_/g, ' ').replace(/\b\w/g, w => w.toUpperCase());
        };

        const formatEventStatus = statusValue => {
          if (!statusValue) return '-';
          const numeric = Number(statusValue);
          if (!Number.isNaN(numeric) && [1, 2, 3, 4, 5].includes(numeric)) {
            return statusMapping.getStatusLabel(numeric);
          }
          return statusValue;
        };

        renderTable(
          ['Device ID', 'Sensor Type', 'Event Type', 'Status', 'Occurred At'],
          eventHistory.map(record => [
            record.deviceId || '-',
            record.sensorType || '-',
            formatEventType(record.eventType),
            formatEventStatus(record.leakStatus),
            formatAsIST(record.timeOccurred)
          ]),
          [1.3, 1.4, 1.4, 1, 1.4]
        );
      }
    } catch (err) {
      console.error('Error retrieving event history:', err);
      doc.font('Helvetica').fontSize(11).text('Error reading event history');
    }
  }

  doc.end();
});

// community logout
app.get('/community/logout', (req, res) => {
  req.session.communityLoggedIn = false;
  req.session.communityEmail = null;
  res.redirect('/community-login');
});





// Dashboard
app.get('/dashboard', checkAuth, (req, res) => {
  // Only admin and superadmin can access dashboard
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    res.redirect('/access-denied');
    return;
  }
  
  res.render('dashboard', { 
    email: req.session.email,
    role: req.session.role,
    clientCount: clientsDatabase.length,
    deviceCount: devicesDatabase.length,
    alertCount: alertsDatabase.filter(a => a.status === 'Active').length
  });
});

// API endpoint for dashboard statistics (for auto-refresh)
app.get('/api/dashboard/stats', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const stats = {
    clientCount: clientsDatabase.length,
    deviceCount: devicesDatabase.length,
    alertCount: alertsDatabase.filter(a => a.status === 'Active').length,
    systemHealth: devicesDatabase.length > 0 ? Math.round((devicesDatabase.length - alertsDatabase.filter(a => a.status === 'Active').length) / devicesDatabase.length * 100) : 0
  };

  res.json(stats);
});

// Clients Page
app.get('/clients', checkAuth, (req, res) => {
  // Only admin and superadmin can access clients
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    res.redirect('/access-denied');
    return;
  }
  
  // Show only first 7 original clients plus any clients added via POST /clients/add
  const baseClients = clientsDatabase.slice(0, MAX_COMMUNITIES);
  const newClients = clientsDatabase.filter(c => c.isNew && !baseClients.some(bc => bc.customerName === c.customerName));
  const selectedClients = [...baseClients, ...newClients];
  
  // Get ALL devices and map them to clients using explicit communityId where available
  const allDevices = selectedClients.length > 0 ? devicesDatabase
    .map((device, idx) => {
      const assignedClient = selectedClients.find(c => c.communityId && c.communityId === device.communityId);
      if (assignedClient) {
        return {
          ...device,
          clientName: assignedClient.customerName,
          email: assignedClient.email,
          flatNo: assignedClient.flatNo,
          location: ['Living Room', 'Kitchen', 'Office', 'Bedroom', 'Storage', 'Reception'][idx % 6]
        };
      }
      const clientIdx = idx % selectedClients.length;
      const fallbackClient = selectedClients[clientIdx];
      return {
        ...device,
        clientName: fallbackClient.customerName,
        email: fallbackClient.email,
        flatNo: fallbackClient.flatNo,
        location: ['Living Room', 'Kitchen', 'Office', 'Bedroom', 'Storage', 'Reception'][idx % 6]
      };
    }) : []; // Show all devices when clients exist, otherwise none
  
  // Pagination for all devices
  const page = parseInt(req.query.page) || 1;
  const limit = 15; // Show 15 per page
  const startIndex = (page - 1) * limit;
  const paginatedDevices = allDevices.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(allDevices.length / limit);

  // Compute unmapped devices based on communityMappingDatabase (devices not present in mappings)
  const mappedDeviceIds = Object.values(communityMappingDatabase).filter(m => m.isMapped).map(m => m.deviceId);
  const allUnmappedDevices = devicesDatabase.filter(d => !mappedDeviceIds.includes(d.deviceId));

  // Pagination for unmapped devices
  const unmappedPage = parseInt(req.query.unmappedPage) || 1;
  const unmappedLimit = 10; // Show 10 per page


  const unmappedStartIndex = (unmappedPage - 1) * unmappedLimit;
  const paginatedUnmapped = allUnmappedDevices.slice(unmappedStartIndex, unmappedStartIndex + unmappedLimit);
  const unmappedTotalPages = Math.ceil(allUnmappedDevices.length / unmappedLimit);

  res.render('clients', { 
    clients: paginatedDevices,
    currentPage: page,
    totalPages: totalPages,
    totalDevices: allDevices.length,
    totalClients: allDevices.length, // total device rows shown for clients
    allDevices: paginatedDevices,
    role: req.session.role,
    unmappedDevices: paginatedUnmapped,
    unmappedCurrentPage: unmappedPage,
    unmappedTotalPages: unmappedTotalPages,
    totalUnmappedDevices: allUnmappedDevices.length,
    selectedClients: selectedClients
  });
});

// Community Device Mapping
app.get('/community-devices', checkAuth, (req, res) => {
  // Only admin and superadmin can access community devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    res.redirect('/access-denied');
    return;
  }
  
  // Use first 7 clients as communities
  const allCommunities = clientsDatabase.slice(0, MAX_COMMUNITIES);
  let selectedCommunities = allCommunities;

  // Optionally filter community list by clientName query
  const filterName = req.query.clientName;
  let usedFiltered = false;
  if (filterName) {
    const filtered = allCommunities.filter(c => c.customerName === filterName);
    if (filtered.length > 0) {
      selectedCommunities = filtered;
      usedFiltered = true;
    }
  }

  // Select community from communityId query or default first selected community
  const selectedCommunityId = parseInt(req.query.communityId) || 0;
  const selectedCommunity = selectedCommunities[selectedCommunityId] || selectedCommunities[0] || allCommunities[0];

  // Determine index within allCommunities for consistent mapping resolution
  const selectedCommunityIndex = allCommunities.findIndex(c => c.email === selectedCommunity?.email);
  const selectedCommunityIndexNormalized = selectedCommunityIndex >= 0 ? selectedCommunityIndex : 0;

  // Determine filter mode (use selectedCommunity if filter found)
  const effectiveFilter = usedFiltered ? filterName : null;

  // Map all registered devices and link to communities by explicit communityId or legacy modulo assignment
  const allDevices = devicesDatabase.map((device, deviceIndex) => {
    let assignedCommunityIdx = null;
    let assignedCommunity = null;

    // First try: explicit communityId assignment for devices added via API
    if (device.communityId != null) {
      const community = allCommunities.find(c => c.communityId === device.communityId);
      if (community) {
        assignedCommunity = community;
        assignedCommunityIdx = allCommunities.indexOf(community);
      }
    }

    // Fallback: use legacy modulo-based assignment for initial generated devices
    if (assignedCommunityIdx === null && allCommunities.length > 0) {
      assignedCommunityIdx = deviceIndex % allCommunities.length;
      assignedCommunity = allCommunities[assignedCommunityIdx];
    }

    // Handle numeric status
    let numericStatus = device.status;
    if (typeof device.status === 'string') {
      numericStatus = statusMapping.convertStatusToNumeric(device.status);
    } else if (!numericStatus || typeof numericStatus !== 'number') {
      numericStatus = statusMapping.STATUS.INITIALIZE;
    }
    
    const statusConfig = statusMapping.getStatusConfig(numericStatus);

    return {
      ...device,
      status: numericStatus,
      statusLabel: statusConfig.label,
      statusColor: statusConfig.color,
      statusClass: statusConfig.cssClass,
      statusIcon: statusConfig.icon,
      assignedCommunityIdx,
      assignedCommunity: assignedCommunity ? assignedCommunity.customerName : '',
    };
  });

  // Mapped/unmapped arrays from explicit assignment only
  let mappedDevicesForSelected;
  let unmappedDevices;
  if (effectiveFilter) {
    // If filtering by customerName, map by explicit community name
    mappedDevicesForSelected = allDevices.filter(d => d.assignedCommunity === effectiveFilter);
    unmappedDevices = allDevices.filter(d => d.assignedCommunity !== effectiveFilter);
  } else {
    mappedDevicesForSelected = allDevices.filter(d => d.assignedCommunityIdx === selectedCommunityIndexNormalized);
    unmappedDevices = allDevices.filter(d => d.assignedCommunityIdx !== selectedCommunityIndexNormalized);
  }
  
  // Pagination for unmapped devices
  const page = parseInt(req.query.page) || 1;
  const limit = 12; // Show 12 per page
  const startIndex = (page - 1) * limit;
  const paginatedUnmapped = unmappedDevices.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(unmappedDevices.length / limit);

  res.render('community-devices', { 
    communities: selectedCommunities,
    selectedCommunityId: selectedCommunityId,
    selectedCommunity: selectedCommunity,
    community: selectedCommunity,
    unmappedDevices: paginatedUnmapped,
    mappedDevices: mappedDevicesForSelected,
    allDevices: allDevices,
    currentPage: page,
    totalPages: totalPages,
    totalUnmappedDevices: unmappedDevices.length,
    totalMappedDevices: mappedDevicesForSelected.length,
    role: req.session.role
  });
});

// -----------------------------------------------------------------------------
// Community DB viewer
// -----------------------------------------------------------------------------
app.get('/community-data', checkAuth, (req, res) => {
  // only admin & superadmin
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.redirect('/access-denied');
  }

  const communities = loadAllCommunityFiles();
  const index = parseInt(req.query.index) || 0;
  const selectedCommunity = communities[index] || null;

  res.render('community-data', {
    communities,
    selectedCommunity,
    selectedIndex: index,
    role: req.session.role
  });
});

// Create new client
app.post('/clients/add', checkAuth, (req, res) => {
  // Only admin and superadmin can create clients
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can create clients.' });
  }

  try {
    const payload = req.body || {};
    const id = clientsDatabase.length + 1;
    const flatNo = payload.flatNo || `C${id}`;
    const customerName = payload.clientName || payload.shortName || `Client ${id}`;
    const email = payload.email || `client${id}@meghasmart.com`;

    const newClient = {
      sno: id,
      flatNo: flatNo,
      deviceId: null,
      customerName: customerName,
      email: email,
      phone: payload.phone || '',
      address: [payload.street || '', payload.city || '', payload.state || '', payload.country || ''].filter(Boolean).join(', '),
      coordinates: {
        lat: (19 + Math.random() * 0.2).toFixed(4),
        lng: (73 + Math.random() * 0.2).toFixed(4)
      },
      registrationDate: new Date(),
      status: payload.status || 'Active',
      subscriptionPlan: payload.subscriptionPlan || 'Basic',
      accessLevel: 'Full',
      isNew: true
    };

    // Insert into database
    db.run(
      `INSERT INTO client (sno, flatNo, deviceId, customerName, email, phone, address, lat, lng, registrationDate, status, subscriptionPlan, accessLevel, isNew) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newClient.sno, newClient.flatNo, newClient.deviceId, newClient.customerName, newClient.email, newClient.phone, newClient.address, parseFloat(newClient.coordinates.lat), parseFloat(newClient.coordinates.lng), newClient.registrationDate.toISOString(), newClient.status, newClient.subscriptionPlan, newClient.accessLevel, newClient.isNew ? 1 : 0],
      function(err) {
        if (err) {
          console.error('Error inserting client:', err);
          return res.json({ success: false, message: 'Database error while creating client' });
        }

        // Reload clients from database
        db.all('SELECT * FROM client', (err, rows) => {
          if (err) {
            console.error('Error reloading clients:', err);
          } else {
            clientsDatabase = rows.map(row => ({
              ...row,
              coordinates: { lat: row.lat, lng: row.lng },
              registrationDate: new Date(row.registrationDate),
              isNew: row.isNew === 1
            }));
            log(`Reloaded ${clientsDatabase.length} clients from database`);
          }
        });

        // update JSON files for communities so they stay in sync
        saveAllCommunityFiles();

        return res.json({ success: true, message: 'Client created successfully', client: newClient });
      }
    );
  } catch (err) {
    console.error('Error creating client', err);
    return res.json({ success: false, message: 'Server error while creating client' });
  }
});

// Return JSON info for a single client (used by manage icon)
app.get('/clients/:clientIndex', checkAuth, (req, res) => {
  const idx = parseInt(req.params.clientIndex);
  if (isNaN(idx) || idx < 0 || idx >= clientsDatabase.length) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }
  return res.json({ success: true, client: clientsDatabase[idx] });
});

// API endpoint: list all clients (JSON)
app.get('/api/clients', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  db.all('SELECT * FROM client', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    const clients = rows.map(row => ({
      ...row,
      coordinates: { lat: row.lat, lng: row.lng },
      registrationDate: new Date(row.registrationDate),
      isNew: row.isNew === 1
    }));
    res.json({ success: true, count: clients.length, clients });
  });
});

// Delete a client
app.delete('/clients/:clientIndex', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can delete clients.' });
  }
  const idx = parseInt(req.params.clientIndex);
  if (isNaN(idx) || idx < 0 || idx >= clientsDatabase.length) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }
  const removed = clientsDatabase.splice(idx, 1);
  saveAllCommunityFiles();
  return res.json({ success: true, message: 'Client deleted', client: removed[0] });
});




// Retail Devices Page - Show all retail devices from device.csv
const loadAllDevicesFromCSV = require('./backend/utils/loadAllDevicesFromCSV');
app.get('/retail-devices', checkAuth, (req, res) => {
  // Only admin and superadmin can access retail devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    res.redirect('/access-denied');
    return;
  }

  // Load all devices from device.csv
  const retailDevicesList = loadAllDevicesFromCSV();

  // Load all devices from devices.json
  let jsonDevices = [];
  try {
    const jsonPath = path.join(__dirname, 'data', 'devices.json');
    if (fs.existsSync(jsonPath)) {
      jsonDevices = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading devices.json:', e);
  }

  // Merge devices from both sources, avoiding duplicates (prefer CSV, add JSON-only devices)
  const csvDeviceIds = new Set(retailDevicesList.map(d => d.deviceId));
  const mergedDevices = [
    ...retailDevicesList,
    ...jsonDevices.filter(d => !csvDeviceIds.has(d.deviceId))
  ];

  // Normalize status values for display
  const devicesWithStatus = mergedDevices.map(device => {
    let numericStatus = device.status;
    if (typeof numericStatus === 'string') {
      numericStatus = statusMapping.convertStatusToNumeric(numericStatus);
    } else if (!numericStatus || typeof numericStatus !== 'number') {
      numericStatus = statusMapping.STATUS.INITIALIZE;
    }
    const statusConfig = statusMapping.getStatusConfig(numericStatus);
    return {
      ...device,
      status: numericStatus,
      statusLabel: statusConfig.label,
      statusColor: statusConfig.color,
      statusClass: statusConfig.cssClass,
      statusIcon: statusConfig.icon
    };
  });

  // Calculate statistics
  const totalRetailDevices = devicesWithStatus.length;
  const onlineDevices = devicesWithStatus.filter(d => d.status === statusMapping.STATUS.GOOD).length;
  const avgBattery = totalRetailDevices > 0 ? 100 : 0; // No battery info, set 100%
  const totalClients = totalRetailDevices; // No client info, set to device count

  // Get newDeviceId from query if present
  const newDeviceId = req.query.newDeviceId;

  res.render('retail-devices', {
    devices: devicesWithStatus,
    totalRetailDevices,
    onlineDevices,
    avgBattery,
    totalClients,
    sensorTypes: [], // No sensor types for retail devices
    statusMapping,
    role: req.session.role,
    newDeviceId
  });
});

// API endpoint for retail devices statistics (for auto-refresh)
app.get('/api/retail-devices/stats', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Load all retail devices from CSV and JSON sources
  const retailDevicesList = loadAllDevicesFromCSV();
  const jsonPath = path.join(__dirname, 'data', 'devices.json');
  let jsonDevicesForStats = [];
  try {
    if (fs.existsSync(jsonPath)) {
      jsonDevicesForStats = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading devices.json for retail stats:', e);
  }

  const csvDeviceIdsForStats = new Set(retailDevicesList.map(d => d.deviceId));
  const mergedRetailDevices = [
    ...retailDevicesList,
    ...jsonDevicesForStats.filter(d => !csvDeviceIdsForStats.has(d.deviceId))
  ];

  const allDevices = mergedRetailDevices.map(device => {
    let numericStatus = device.status;
    if (typeof numericStatus === 'string') {
      numericStatus = statusMapping.convertStatusToNumeric(numericStatus);
    } else if (!numericStatus || typeof numericStatus !== 'number') {
      numericStatus = statusMapping.STATUS.INITIALIZE;
    }
    const statusConfig = statusMapping.getStatusConfig(numericStatus);
    return {
      ...device,
      status: numericStatus,
      statusLabel: statusConfig.label,
      statusColor: statusConfig.color,
      statusClass: statusConfig.cssClass,
      statusIcon: statusConfig.icon,
      batteryLevel: 85 + Math.floor(Math.random() * 15)
    };
  });

  const stats = {
    totalRetailDevices: allDevices.length,
    onlineDevices: allDevices.filter(d => d.status === statusMapping.STATUS.GOOD).length,
    avgBattery: allDevices.length > 0
      ? Math.round(allDevices.reduce((sum, d) => sum + d.batteryLevel, 0) / allDevices.length)
      : 0,
    totalClients: allDevices.length
  };

  res.json({ devices: allDevices, stats });
});

// Alerts Page
app.get('/alerts', checkAuth, (req, res) => {
  // Only admin and superadmin can access alerts
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    res.redirect('/access-denied');
    return;
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const startIndex = (page - 1) * limit;
  const paginatedAlerts = alertsDatabase.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(alertsDatabase.length / limit);

  res.render('alerts', { 
    alerts: paginatedAlerts,
    currentPage: page,
    totalPages: totalPages,
    totalAlerts: alertsDatabase.length,
    activeAlerts: alertsDatabase.filter(a => a.status === 'Active').length,
    role: req.session.role
  });
});

// API: Get device details
app.get('/api/device/:deviceId', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  const device = devicesDatabase.find(d => d.deviceId === req.params.deviceId);
  if (device) {
    res.json({ success: true, device: device });
  } else {
    res.json({ success: false, message: 'Device not found' });
  }
});

// API: Get device real-time data
app.get('/api/device/:deviceId/data', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  const device = devicesDatabase.find(d => d.deviceId === req.params.deviceId);
  if (device) {
    res.json({ 
      success: true, 
      deviceId: device.deviceId,
      status: device.status,
      sensorData: device.sensorData,
      batteryLevel: device.batteryLevel,
      signalStrength: device.signalStrength,
      lastSyncTime: device.lastSyncTime
    });
  } else {
    res.json({ success: false, message: 'Device not found' });
  }
});

// API: Update device numeric status by deviceId
app.post('/api/device/:deviceId/status', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin and Super Admin can update device status.' });
  }

  const deviceId = req.params.deviceId;
  const status = parseInt(req.body.status, 10);
  if (![1, 2, 3, 4, 5].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Allowed values are 1,2,3,4,5.' });
  }

  const device = devicesDatabase.find(d => d.deviceId === deviceId);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found' });
  }

  // Store old status for leak tracking
  const oldStatus = device.status;

  // When data is received (status update), set status and update lastDataPush timestamp
  device.status = status;
  device.lastDataPush = Date.now();

  // Persist to SQLite if device table exists
  const sql = 'UPDATE device SET status = ?, lastDataPush = ? WHERE deviceId = ?';
  db.run(sql, [status, device.lastDataPush, deviceId], function(err) {
    if (err) {
      console.error('Error updating device status in DB:', err);
      return res.status(500).json({ success: false, message: 'Database error while updating status' });
    }

    // Update community mapping cache entries for this device (by flatNo or communityId)
    Object.keys(communityMappingDatabase).forEach(mapKey => {
      const mapping = communityMappingDatabase[mapKey];
      if (mapping && mapping.deviceId === device.deviceId) {
        mapping.status = status;
      }
    });

    // Keep special community device status in sync with retail device state as the reports and community pages
    // may derive status from data/devices.json.
    const retailDevice = retailDevices.find(d => d.deviceId === deviceId);
    if (retailDevice) {
      retailDevice.status = status;
      saveRetailDevices(retailDevices);
    }

    // Track leak events for special community devices
    try {
      if (oldStatus !== status) {
        const specialTarget = resolveSpecialCommunityDeviceForLeak(deviceId);
        if (specialTarget && specialTarget.communityId != null) {
          leakHistoryService.trackStatusChange(specialTarget.communityId, specialTarget.device, status, oldStatus);
        }
      }
    } catch (leakErr) {
      console.warn('Error tracking leak history:', leakErr);
    }

    // Also update any community JSON file that explicitly lists this device.
    const communityFiles = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json'));
    communityFiles.forEach(file => {
      try {
        const filePath = path.join(communityDataDir, file);
        if (!fs.existsSync(filePath)) return;
        const communityData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let updated = false;
        communityData.devices = (communityData.devices || []).map(d => {
          if (d.deviceId === deviceId) {
            updated = true;
            return { ...d, status };
          }
          return d;
        });
        if (updated) {
          fs.writeFileSync(filePath, JSON.stringify(communityData, null, 2), 'utf8');
        }
      } catch (err) {
        console.error(`Error updating community JSON file ${file}:`, err);
      }
    });

    saveAllCommunityFiles();
    res.json({ success: true, message: 'Device status updated', device });
  });
});

// API: Acknowledge Alert
app.post('/api/alerts/:alertId/acknowledge', checkAuth, (req, res) => {
  const alert = alertsDatabase.find(a => a.id === parseInt(req.params.alertId));
  if (alert) {
    alert.acknowledgedBy = 'Admin User';
    alert.acknowledgedAt = new Date();
    res.json({ success: true, message: 'Alert acknowledged successfully' });
  } else {
    res.json({ success: false, message: 'Alert not found' });
  }
});

// API: Resolve Alert
app.post('/api/alerts/:alertId/resolve', checkAuth, (req, res) => {
  const alert = alertsDatabase.find(a => a.id === parseInt(req.params.alertId));
  if (alert) {
    alert.status = 'Resolved';
    alert.resolvedAt = new Date();
    res.json({ success: true, message: 'Alert resolved successfully' });
  } else {
    res.json({ success: false, message: 'Alert not found' });
  }
});

// API: Get alerts by severity
app.get('/api/alerts/severity/:level', checkAuth, (req, res) => {
  const filtered = alertsDatabase.filter(a => a.severity === req.params.level);
  res.json({ success: true, alerts: filtered, count: filtered.length });
});

// API: Get device statistics
app.get('/api/statistics', checkAuth, (req, res) => {
  const activeDevices = devicesDatabase.filter(d => d.status === 'Active').length;
  const inactiveDevices = devicesDatabase.filter(d => d.status === 'Inactive').length;
  const activeAlerts = alertsDatabase.filter(a => a.status === 'Active').length;
  const criticalAlerts = alertsDatabase.filter(a => a.severity === 'High' && a.status === 'Active').length;
  
  res.json({
    success: true,
    devices: {
      total: devicesDatabase.length,
      active: activeDevices,
      inactive: inactiveDevices,
      activePercentage: ((activeDevices / devicesDatabase.length) * 100).toFixed(1)
    },
    alerts: {
      total: alertsDatabase.length,
      active: activeAlerts,
      critical: criticalAlerts,
      resolved: alertsDatabase.filter(a => a.status === 'Resolved').length
    },
    clients: {
      total: clientsDatabase.length,
      active: clientsDatabase.filter(c => c.status === 'Active').length
    },
    capacity: {
      used: Math.min(devicesDatabase.length, TOTAL_RETAIL_DEVICES),
      total: TOTAL_RETAIL_DEVICES,
      percentage: ((Math.min(devicesDatabase.length, TOTAL_RETAIL_DEVICES) / TOTAL_RETAIL_DEVICES) * 100).toFixed(1)
    }
  });
});

// API: Export alerts as CSV
app.get('/api/alerts/export/csv', checkAuth, (req, res) => {
  let csv = 'Alert ID,Device ID,Flat No,Alert Type,Severity,Status,Timestamp,Ticket ID\n';
  alertsDatabase.forEach(alert => {
    csv += `${alert.id},${alert.deviceId},${alert.flatNo},${alert.alertType},${alert.severity},${alert.status},${alert.timestamp.toISOString()},${alert.ticketId}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="alerts.csv"');
  res.send(csv);
});

// API: Get alerts with filters
app.get('/api/alerts/filter', checkAuth, (req, res) => {
  const { severity, status, type } = req.query;
  let filtered = alertsDatabase;
  
  if (severity) filtered = filtered.filter(a => a.severity === severity);
  if (status) filtered = filtered.filter(a => a.status === status);
  if (type) filtered = filtered.filter(a => a.alertType === type);
  
  res.json({ success: true, alerts: filtered, count: filtered.length });
});

// API: Download each client's data as separate Excel sheet
app.get('/api/clients/:clientIndex/download-excel', checkAuth, (req, res) => {
  // Only admin and superadmin can download
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can download.' });
  }

  try {
    const clientIndex = parseInt(req.params.clientIndex);
    
    // Use the first MAX_COMMUNITIES clients
    const selectedClients = clientsDatabase.slice(0, MAX_COMMUNITIES);
    if (clientIndex < 0 || clientIndex >= selectedClients.length) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    const client = selectedClients[clientIndex];
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    // Create Excel workbook for this single client
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(client.customerName);
    
    // Title section (merged across A-D)
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${client.customerName}`; // just name or custom title
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    // use purple background to match requested style
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800080' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'center' };
    worksheet.getRow(1).height = 25;
    // leave row2 blank for spacing
    worksheet.addRow([]);    
    // Get all devices assigned to this client
    const clientDevices = devicesDatabase
      .map((device, idx) => {
        const distributedClientIdx = idx % selectedClients.length;
        return {
          device,
          isForThisClient: distributedClientIdx === clientIndex
        };
      })
      .filter(d => d.isForThisClient)
      .map(d => d.device);
    
    // Devices section
    worksheet.addRow([]); // spacer
    worksheet.mergeCells('A3:D3');
    const devicesHeader = worksheet.getCell('A3');
    devicesHeader.value = `Assigned IoT Devices (Total: ${clientDevices.length})`;
    devicesHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    devicesHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    
    // Device table headers (flat no, id, type, status only)
    worksheet.addRow(['Flat No','Device ID', 'Sensor Type', 'Status']);
    worksheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    
    // Add device data rows
    clientDevices.forEach((device, idx) => {
      worksheet.addRow([
        device.flatNo || '',
        device.deviceId,
        device.sensorType,
        device.status
      ]);
    });
    
    // Set column widths
    worksheet.columns = [
      { width: 12 }, // Flat No
      { width: 20 }, // Device ID
      { width: 15 }, // Sensor Type
      { width: 12 }  // Status
    ];
    
    // Set response headers
    const fileName = `${client.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Write and send
    workbook.xlsx.write(res).then(() => {
      res.end();
    }).catch(err => {
      // after an export we also refresh the files so they match the latest
      saveAllCommunityFiles();
      console.error('Error generating Excel file:', err);
      res.status(500).json({ success: false, message: 'Error generating Excel file' });
    });
  } catch (err) {
    console.error('Error downloading client data:', err);
    res.status(500).json({ success: false, message: 'Error downloading client data' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});

// Access Denied Page
app.get('/access-denied', (req, res) => {
  res.status(403).render('access-denied', { 
    message: 'You do not have permission to access this page. Only Admin and Super Admin can access this section.' 
  });
});

// Root route
app.get('/', (req, res) => {
  if (req.session.communityLoggedIn) {
    return res.redirect('/community/dashboard');
  }
  if (req.session.loggedIn) {
    return res.redirect('/dashboard');
  }
  // no one logged in, render a simple selection page
  res.render('root');
});

// API: Map device to community using flatNo, email, and deviceId
// API: Add a new device to the first client/community
app.post('/api/community/add-device', checkAuth, (req, res) => {
  // Only admin and superadmin can add devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can add devices.' });
  }

  // Accept all details from body, including email to specify the client
  let { flatNo, deviceId, sensorType, status, email } = req.body;

  // Default status to 2 (yellow) if not provided or invalid
  let statusNum = parseInt(status, 10);
  if (!statusNum || ![1,2,3,4,5].includes(statusNum)) {
    statusNum = 2;
  }

  // Find the client by email if provided, otherwise use first client
  let targetClient;
  if (email) {
    targetClient = clientsDatabase.find(c => c.email === email);
    if (!targetClient) {
      return res.json({ success: false, message: 'Client not found with the provided email.' });
    }
  } else {
    targetClient = clientsDatabase[0];
    if (!targetClient) {
      return res.json({ success: false, message: 'No clients found.' });
    }
  }

  // No need to check statusNum, it is always valid now (defaults to 2)

  // Auto-generate next deviceId if not provided
  if (!deviceId) {
    const csvPath = path.join(__dirname, 'device.csv');
    let lastId = 'GVM202601400';
    try {
      const csvData = fs.readFileSync(csvPath, 'utf8').split('\n');
      for (let i = csvData.length - 1; i >= 0; i--) {
        const row = csvData[i].trim();
        if (row && row.startsWith('GVM')) {
          lastId = row.split(',')[3].replace(/"/g, '');
          break;
        } else if (row && row.includes('GVM')) {
          lastId = row.split(',').find(col => col.includes('GVM')).replace(/"/g, '');
          break;
        }
      }
    } catch (e) { /* fallback to default */ }
    const prefix = lastId.slice(0, 9);
    const num = parseInt(lastId.slice(9)) + 1;
    deviceId = prefix + num.toString().padStart(3, '0');
  }

  // Auto-generate new flatNo if not provided (A1-XXX, not already present)
  if (!flatNo) {
    const usedFlats = new Set(devicesDatabase.map(d => d.flatNo));
    let found = false;
    let flatPrefix = 'A1-';
    let flatNum = 1;
    while (!found) {
      const candidate = flatPrefix + flatNum.toString().padStart(3, '0');
      if (!usedFlats.has(candidate)) {
        flatNo = candidate;
        found = true;
      }
      flatNum++;
      if (flatNum > 999) { flatPrefix = 'A2-'; flatNum = 1; }
    }
  }

  // Find communityId for the target client (use email as the unique identifier)
  db.get('SELECT id FROM community WHERE email = ?', [targetClient.email], (err, community) => {
    if (err || !community) {
      return res.json({ success: false, message: 'Community not found in database. Email: ' + targetClient.email });
    }

    // No device limit per community
    db.run(
      `INSERT INTO device (communityId, flatNo, deviceId, sensorType, status) VALUES (?,?,?,?,?)`,
      [community.id, flatNo, deviceId, sensorType || 'sensor', statusNum],
      function(err) {
        if (err) {
          console.error('Error inserting device:', err);
          return res.json({ success: false, message: 'Database error while adding device', error: err.message });
        }

        // Add to devicesDatabase in memory, include communityId for precise community grouping
        devicesDatabase.push({
          communityId: community.id,
          flatNo,
          deviceId,
          sensorType: sensorType || 'sensor',
          status: statusNum,
          lastDataPush: Date.now()
        });

        // Save to JSON files
        saveAllCommunityFiles();

        // Append to device.csv
        try {
          const csvPath = path.join(__dirname, 'device.csv');
          const sno = devicesDatabase.length;
          const csvRow = `\n${sno},${community.id},\"${flatNo}\",\"${deviceId}\",\"${sensorType || 'sensor'}\",${statusNum}`;
          fs.appendFileSync(csvPath, csvRow);
        } catch (e) {
          console.error('Error writing to device.csv:', e);
        }

        return res.json({ deviceId });
      }
    );
  });
});
app.post('/api/community/map-device', checkAuth, (req, res) => {
  // Only admin and superadmin can map devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can map devices.' });
  }
  
  const { flatNo, email, deviceId } = req.body;
  
  const client = clientsDatabase.find(c => c.flatNo === flatNo && c.email === email);
  const device = devicesDatabase.find(d => d.deviceId === deviceId);
  
  if (!client) {
    return res.json({ success: false, message: 'Client not found for this flat' });
  }
  
  if (!device) {
    return res.json({ success: false, message: 'Device not found' });
  }
  
  // Get community ID and check device limit
  db.get('SELECT id FROM community WHERE flatNo = ? AND email = ?', [flatNo, email], (err, community) => {
    if (err || !community) {
      return res.json({ success: false, message: 'Community not found in database' });
    }
    
    // Check device count for this community
    getDeviceCountForCommunity(community.id, (count) => {
      if (count >= MAX_DEVICES_PER_COMMUNITY) {
        return res.json({ 
          success: false, 
          message: `Cannot map device. Community '${client.customerName}' has reached maximum limit of ${MAX_DEVICES_PER_COMMUNITY} devices.`,
          currentDeviceCount: count,
          maxLimit: MAX_DEVICES_PER_COMMUNITY
        });
      }
      
      // Create mapping key using flatNo and email
      const mappingKey = `${flatNo}|${email}`;
      
      // Persist mapping to database (store device's numeric status, not 'Mapped')
      const mappedDate = new Date().toISOString();
      db.run(
        `INSERT OR REPLACE INTO community_mapping (flatNo, email, customerName, deviceId, sensorType, location, mappedDate, mappedBy, status, isMapped) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [flatNo, email, client.customerName, device.deviceId, device.sensorType, device.location, mappedDate, 'Admin User', device.status, 1],
        function(err) {
          if (err) {
            console.error('Error saving community mapping:', err);
          }
        }
      );

      // Persist community assignment to device row so community can be accurately computed
      db.run(
        `UPDATE device SET communityId = ?, flatNo = ? WHERE deviceId = ?`,
        [community.id, flatNo, deviceId],
        function(err) {
          if (err) {
            console.error('Error updating device assignment:', err);
          }
        }
      );

      // Update in-memory device assignment
      device.communityId = community.id;
      device.flatNo = flatNo;

      // Update mapping cache (preserve numeric status from device)
      communityMappingDatabase[mappingKey] = {
        flatNo: flatNo,
        email: email,
        customerName: client.customerName,
        deviceId: device.deviceId,
        sensorType: device.sensorType,
        location: device.location,
        mappedDate: mappedDate,
        mappedBy: 'Admin User',
        status: device.status,
        isMapped: true
      };
      
      res.json({ 
        success: true, 
        message: `Device ${device.deviceId} mapped to ${client.customerName} in flat ${flatNo} successfully`,
        mappingInfo: communityMappingDatabase[mappingKey],
        currentDeviceCount: count + 1,
        maxLimit: MAX_DEVICES_PER_COMMUNITY
      });

      // mapping does not change the device list logic but we still refresh files
      saveAllCommunityFiles();
    });
  });
});

// API: Unmap device from community using flatNo and email
app.post('/api/community/unmap-device', checkAuth, (req, res) => {
  // Only admin and superadmin can unmap devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can unmap devices.' });
  }
  
  const { flatNo, email } = req.body;
  
  const client = clientsDatabase.find(c => c.flatNo === flatNo && c.email === email);
  if (!client) {
    return res.json({ success: false, message: 'Client not found' });
  }
  
  const mappingKey = `${flatNo}|${email}`;
  
  // Persist unmapping to database
  const mappedDate = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO community_mapping (flatNo, email, customerName, deviceId, sensorType, location, mappedDate, mappedBy, status, isMapped) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [flatNo, email, client.customerName, null, null, null, mappedDate, 'Admin User', 'Unmapped', 0],
    function(err) {
      if (err) {
        console.error('Error saving community unmapping:', err);
      }
    }
  );
  
  // Persist community unassignment for potential last-mapped device in this flat
  const deviceToClear = devicesDatabase.find(d => d.communityId === client.communityId && d.flatNo === flatNo);
  if (deviceToClear) {
    deviceToClear.communityId = null;
  }

  db.run(
    `UPDATE device SET communityId = NULL WHERE flatNo = ? AND communityId = ?`,
    [flatNo, client.communityId],
    function(err) {
      if (err) {
        console.error('Error clearing communityId for unmapped device:', err);
      }
    }
  );

  // Update mapping cache
  communityMappingDatabase[mappingKey] = {
    flatNo: flatNo,
    email: email,
    customerName: client.customerName,
    deviceId: null,
    sensorType: null,
    location: null,
    mappedDate: mappedDate,
    mappedBy: 'Admin User',
    status: 'Unmapped',
    isMapped: false
  };
  
  res.json({ 
    success: true, 
    message: `Device in flat ${flatNo} unmapped successfully`,
    mappingInfo: communityMappingDatabase[mappingKey]
  });

  // refresh persisted community data just in case
  saveAllCommunityFiles();
});

// Regenerate devices and alerts on demand
app.post('/regenerate-devices', (req, res) => {
  devicesDatabase = shuffleArray(generateMockDevices(TOTAL_RETAIL_DEVICES));
  // count unique flat numbers immediately after generation
  const uniqueFlatCount = new Set(devicesDatabase.map(d => d.flatNo)).size;
  log(`generated ${devicesDatabase.length} devices with ${uniqueFlatCount} distinct flat numbers`);

  // Update database with new devices
  db.serialize(() => {
    db.run('DELETE FROM device');
    devicesDatabase.forEach(device => {
      db.run(
        "INSERT OR REPLACE INTO device (communityId, flatNo, deviceId, sensorType, status) VALUES (?,?,?,?,?)",
        [device.communityId, device.flatNo, device.deviceId, device.sensorType, device.status]
      );
    });
  });

  saveAllCommunityFiles();

  res.json({ success: true, message: 'Devices regenerated and community files updated' });
});

// API: Update device numeric status by flatNo (community mapping context)
app.post('/api/community/device/status', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin and Super Admin can update device status.' });
  }

  const deviceId = req.body.deviceId;
  const status = parseInt(req.body.status, 10);

  // Validate deviceId
  if (!deviceId) {
    return res.status(400).json({ success: false, message: 'Device ID is required in request body' });
  }

  // Validate status
  if (![1, 2, 3, 4, 5].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Allowed values are 1,2,3,4,5.' });
  }

  const device = devicesDatabase.find(d => d.deviceId === deviceId);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found for deviceId ' + deviceId });
  }

  // Store old status for leak tracking
  const oldStatus = device.status;

  device.status = status;
  device.lastDataPush = Date.now();

  db.run('UPDATE device SET status = ?, lastDataPush = ? WHERE deviceId = ?', [status, device.lastDataPush, deviceId], function(err) {
    if (err) {
      console.error('Error updating device status in DB:', err);
      return res.status(500).json({ success: false, message: 'Database error while updating status' });
    }

    Object.keys(communityMappingDatabase).forEach(mapKey => {
      const mapping = communityMappingDatabase[mapKey];
      if (mapping && mapping.deviceId === deviceId) {
        mapping.status = status;
      }
    });

    // Track leak events for special community devices
    try {
      if (oldStatus !== status) {
        const specialTarget = resolveSpecialCommunityDeviceForLeak(deviceId);
        if (specialTarget && specialTarget.communityId != null) {
          leakHistoryService.trackStatusChange(specialTarget.communityId, specialTarget.device, status, oldStatus);
        }
      }
    } catch (leakErr) {
      console.warn('Error tracking leak history:', leakErr);
    }

    saveAllCommunityFiles();
    res.json({ success: true, message: `Device status for deviceId ${deviceId} updated`, device });
  });
});

// API: Delete a mapped device by flatNo (and optional email filter)
app.delete('/api/community/device/:flatNo', checkAuth, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can delete device records.' });
  }

  const flatNo = req.params.flatNo;
  const { email } = req.body;

  // Delete from SQLite device table (flatNo-managed). email is optional context only.
  const queryParams = [flatNo];
  const sql = `DELETE FROM device WHERE flatNo = ?`;

  if (email) {
    // Check the community mapping by email + flatNo to keep context and log a warning if mismatch
    db.get('SELECT flatNo FROM community WHERE email = ?', [email], (checkErr, community) => {
      if (checkErr) {
        console.error('Error checking community for email:', checkErr);
      } else if (community && community.flatNo !== flatNo) {
        console.warn(`Delete requested for flatNo ${flatNo} while email ${email} maps to ${community.flatNo}`);
      }
    });
  }

  db.run(sql, queryParams, function(err) {
    if (err) {
      console.error('Error deleting device:', err);
      return res.json({ success: false, message: 'Database error while deleting device' });
    }

    // Remove from in-memory arrays and mapping cache
    devicesDatabase = devicesDatabase.filter(d => d.flatNo !== flatNo);
    Object.keys(communityMappingDatabase).forEach(key => {
      if (communityMappingDatabase[key].flatNo === flatNo) {
        delete communityMappingDatabase[key];
      }
    });

    saveAllCommunityFiles();

    return res.json({ success: true, message: `Device record for flatNo ${flatNo} deleted.` });
  });
});

// API: Get community details with devices using flatNo and email
app.get('/api/community/:flatNo/:email/devices', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  const { flatNo, email } = req.params;
  const mappingKey = `${flatNo}|${email}`;
  
  const client = clientsDatabase.find(c => c.flatNo === flatNo && c.email === email);
  const mapping = communityMappingDatabase[mappingKey];
  const devices = devicesDatabase.filter(d => d.communityId === client.communityId || d.flatNo === flatNo);

  if (!client) {
    return res.json({ success: false, message: 'Client not found' });
  }
  
  res.json({
    success: true,
    client: {
      flatNo: client.flatNo,
      customerName: client.customerName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      status: client.status
    },
    devices: devices,
    mapping: mapping || {
      flatNo: flatNo,
      email: email,
      status: 'Not Mapped',
      isMapped: false
    },
    stats: {
      isMapped: mapping?.isMapped || false,
      mappedDate: mapping?.mappedDate || null,
      deviceStatus: devices.length > 0 ? devices[0].status : 'No Device',
      totalDevices: devices.length
    }
  });
});

// API: Get device count for a specific community
app.get('/api/community/:communityId/device-count', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  const communityId = parseInt(req.params.communityId);
  
  getDeviceCountForCommunity(communityId, (count) => {
    res.json({
      success: true,
      communityId: communityId,
      deviceCount: count,
      maxLimit: MAX_DEVICES_PER_COMMUNITY,
      remainingCapacity: MAX_DEVICES_PER_COMMUNITY - count,
      isAtCapacity: count >= MAX_DEVICES_PER_COMMUNITY,
      capacityPercentage: Math.round((count / MAX_DEVICES_PER_COMMUNITY) * 100)
    });
  });
});

// API: Get capacity information for all communities
app.get('/api/community/capacity/check', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  // Get capacity for all communities
  db.all('SELECT id, customerName FROM community', [], (err, communities) => {
    if (err || !communities) {
      return res.json({ success: false, message: 'Error retrieving communities' });
    }
    
    let communitiesCapacity = [];
    let processed = 0;
    
    communities.forEach((community) => {
      getDeviceCountForCommunity(community.id, (count) => {
        communitiesCapacity.push({
          id: community.id,
          name: community.customerName,
          deviceCount: count,
          maxLimit: MAX_DEVICES_PER_COMMUNITY,
          remainingCapacity: MAX_DEVICES_PER_COMMUNITY - count,
          isAtCapacity: count >= MAX_DEVICES_PER_COMMUNITY,
          capacityPercentage: Math.round((count / MAX_DEVICES_PER_COMMUNITY) * 100)
        });
        
        processed++;
        if (processed === communities.length) {
          res.json({
            success: true,
            maxDevicesPerCommunity: MAX_DEVICES_PER_COMMUNITY,
            communities: communitiesCapacity,
            summary: {
              totalCommunities: communities.length,
              communitiesAtCapacity: communitiesCapacity.filter(c => c.isAtCapacity).length,
              totalDevices: communitiesCapacity.reduce((sum, c) => sum + c.deviceCount, 0)
            }
          });
        }
      });
    });
  });
});

// API: Get all community mappings and unmapped clients
app.get('/api/community/all-mappings', checkAuth, (req, res) => {
  // Only admin and superadmin can access API
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.json({ success: false, message: 'Access denied. Only Admin and Super Admin can access this.' });
  }
  
  const mappings = Object.values(communityMappingDatabase).filter(m => m.isMapped);
  const unmappedClients = clientsDatabase.filter(client => {
    const mappingKey = `${client.flatNo}|${client.email}`;
    return !communityMappingDatabase[mappingKey]?.isMapped;
  });
  
  res.json({
    success: true,
    mappedDevices: mappings,
    unmappedClients: unmappedClients,
    stats: {
      totalMapped: mappings.length,
      totalUnmapped: unmappedClients.length,
      totalClients: clientsDatabase.length
    }
  });
});

// Middleware to check authentication
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// API: Save device details for a given deviceId

// API: Save device details, deviceId in body, other details in query or body
app.post('/api/device/details', (req, res) => {
  const deviceId = req.body.deviceId;
  if (!deviceId) {
    return res.status(400).json({ success: false, message: 'deviceId is required in body' });
  }

  const macAddress = req.body.macAddress || req.query.macAddress;
  const hardwareVersion = req.body.hardwareVersion || req.query.hardwareVersion;
  const firmwareVersion = req.body.firmwareVersion || req.query.firmwareVersion;
  const latitude = req.body.latitude || req.query.latitude;
  const longitude = req.body.longitude || req.query.longitude;
  const location = req.body.location || req.query.location;
  const statusValue = req.body.status || req.query.status;

  let device = devicesDatabase.find(d => d.deviceId === deviceId);
  let oldStatus = null;
  
  if (!device) {
    device = { deviceId, lastDataPush: Date.now() };
    devicesDatabase.push(device);
  } else {
    oldStatus = device.status;
    device.lastDataPush = Date.now();
  }

  if (macAddress) device.macAddress = macAddress;
  if (hardwareVersion) device.hardwareVersion = hardwareVersion;
  if (firmwareVersion) device.firmwareVersion = firmwareVersion;
  if (latitude) device.lat = latitude;
  if (longitude) device.lng = longitude;
  if (location) device.location = location;
  if (typeof statusValue !== 'undefined') {
    const normalizedStatus = normalizeDeviceStatus(statusValue);
    if (normalizedStatus) {
      device.status = normalizedStatus;
    }
  }

  try {
    const persistedDevices = loadRetailDevices();
    const existingIndex = persistedDevices.findIndex(d => d.deviceId === deviceId);
    const persistedDevice = {
      deviceId,
      ...(existingIndex >= 0 ? persistedDevices[existingIndex] : {}),
      ...(macAddress ? { macAddress } : {}),
      ...(hardwareVersion ? { hardwareVersion } : {}),
      ...(firmwareVersion ? { firmwareVersion } : {}),
      ...(latitude ? { latitude } : {}),
      ...(longitude ? { longitude } : {}),
      ...(location ? { location } : {}),
      ...(typeof statusValue !== 'undefined' ? { status: normalizeDeviceStatus(statusValue) } : {}),
      lastDataPush: Date.now()
    };

    if (existingIndex >= 0) {
      persistedDevices[existingIndex] = persistedDevice;
    } else {
      persistedDevices.push(persistedDevice);
    }

    saveRetailDevices(persistedDevices);
  } catch (err) {
    console.error('Error saving device details persistently:', err);
  }

  // Track leak events for special community devices if status changed
  try {
    if (oldStatus !== null && typeof statusValue !== 'undefined' && oldStatus !== device.status) {
      const specialTarget = resolveSpecialCommunityDeviceForLeak(deviceId);
      if (specialTarget && specialTarget.communityId) {
        leakHistoryService.trackStatusChange(specialTarget.communityId, specialTarget.device, device.status, oldStatus);
      }
    }
  } catch (leakErr) {
    console.warn('Error tracking leak history:', leakErr);
  }

  res.json({ success: true, message: 'Device details saved successfully' });
});

// API: Add retail device by MAC address only (auto-generate next deviceId, no community assignment)

app.post('/api/retail-devices/add', checkAuth, (req, res) => {
  // Only admin and superadmin can add retail devices
  if (req.session.role !== 'admin' && req.session.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin and Super Admin can add retail devices.' });
  }

  const { macAddress, ...rest } = req.body;
  if (!macAddress) {
    return res.status(400).json({ success: false, message: 'macAddress is required' });
  }

  // Normalize MAC address for comparison
  const normMac = macAddress.trim().toLowerCase();
  let existingDevice = devicesDatabase.find(d => (d.macAddress || '').trim().toLowerCase() === normMac);
  if (existingDevice) {
    // Update existing device with any new fields except deviceId
    Object.keys(rest).forEach(key => {
      if (key !== 'deviceId') {
        existingDevice[key] = rest[key];
      }
    });
    existingDevice.lastDataPush = Date.now();
    // Optionally update CSV and DB if needed (not duplicating rows)
    return res.json({ success: true, deviceId: existingDevice.deviceId, updated: true });
  }

  // Find the last GVM deviceId in devicesDatabase (retail devices only, not mapped to any community)
  const year = new Date().getFullYear();
  const gvmPrefix = `GVM${year}`;
  let maxSeq = 1400; // Start from 1400 as per your requirement
  devicesDatabase.forEach(d => {
    if (typeof d.deviceId === 'string' && d.deviceId.startsWith(gvmPrefix)) {
      const seq = parseInt(d.deviceId.slice(8), 10); // GVM + YYYY = 8 chars, then 5 digits
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  const nextSeq = maxSeq + 1;
  const newDeviceId = gvmPrefix + String(nextSeq).padStart(5, '0');

  // Add to devicesDatabase (no communityId, not mapped)
  const newDevice = {
    deviceId: newDeviceId,
    macAddress,
    status: 1, // Initialize
    sensorType: 'sensor',
    lastDataPush: Date.now(),
    // No communityId, no flatNo
    ...rest
  };
  devicesDatabase.push(newDevice);

  // Optionally, persist to DB and device.csv
  try {
    const csvPath = path.join(__dirname, 'device.csv');
    const sno = devicesDatabase.length;
    const csvRow = `\n${sno},,\"\",\"${newDeviceId}\",\"sensor\",1,${macAddress}`;
    fs.appendFileSync(csvPath, csvRow);
  } catch (e) {
    console.error('Error writing to device.csv:', e);
  }

  db.run(
    `INSERT INTO device (communityId, flatNo, deviceId, sensorType, status, lastDataPush) VALUES (NULL, NULL, ?, ?, ?, ?)`,
    [newDeviceId, 'sensor', 1, Date.now()],
    function(err) {
      if (err) {
        console.error('Error inserting retail device:', err);
        // Still return success, as in-memory and CSV are updated
      }
    }
  );

  return res.json({ success: true, deviceId: newDeviceId, created: true });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Megha Smart is running on http://localhost:${PORT}`);
});

// Handle port already in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`\nSOLUTION:`);
    console.error(`1. Open Command Prompt as Administrator`);
    console.error(`2. Run: netstat -ano | findstr :${PORT}`);
    console.error(`3. Find the PID and run: taskkill /PID <PID> /F`);
    console.error(`\nOR try one of these commands:\n`);
    console.error(`taskkill /F /IM node.exe`);
    console.error(`taskkill /F /IM chrome.exe`);
    console.error(`netsh int ipv4 set dynamic tcp start=49152 num=16384`);
    process.exit(1);
  }
});

// export helper(s) for testing or future use
module.exports = { getCommunityDataByEmail };
  