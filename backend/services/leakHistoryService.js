/**
 * Leak History Service
 * Tracks all leak events (Alert/Panic Alert status changes) with exact timestamps
 * Stores complete history even when leaks return to normal
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const LEAK_HISTORY_DIR = path.join(DATA_DIR, 'leak_history');

const STATUS_LABELS = {
  1: 'Initialize',
  2: 'No Communication',
  3: 'Alert',
  4: 'Online',
  5: 'Panic Alert'
};

// Ensure leak history directory exists
function ensureLeakHistoryDir() {
  if (!fs.existsSync(LEAK_HISTORY_DIR)) {
    fs.mkdirSync(LEAK_HISTORY_DIR, { recursive: true });
  }
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || String(status || 'Unknown');
}

/**
 * Get the leak history file path for a specific community
 * @param {number} communityId - Community ID
 * @returns {string} File path
 */
function getLeakHistoryFile(communityId) {
  ensureLeakHistoryDir();
  return path.join(LEAK_HISTORY_DIR, `community${communityId}_leak_history.csv`);
}

/**
 * Initialize CSV file with headers if it doesn't exist
 * @param {number} communityId - Community ID
 */
function initializeLeakHistoryFile(communityId) {
  const filePath = getLeakHistoryFile(communityId);
  if (!fs.existsSync(filePath)) {
    const headers = 'Flat No,Device ID,Sensor Type,Event Type,Leak Status,Time Occurred,Time Resolved,Duration (minutes),Details\n';
    fs.writeFileSync(filePath, headers, 'utf8');
  }
}

/**
 * Read existing leak history from CSV
 * @param {number} communityId - Community ID
 * @returns {array} Array of leak history records
 */
function readLeakHistory(communityId) {
  initializeLeakHistoryFile(communityId);
  const filePath = getLeakHistoryFile(communityId);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) return []; // Only headers
    
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV line carefully to handle quoted fields
      const record = parseCSVLine(line);
      if (record.length >= 9) {
        records.push({
          flatNo: record[0],
          deviceId: record[1],
          sensorType: record[2],
          eventType: record[3],
          leakStatus: record[4],
          timeOccurred: record[5],
          timeResolved: record[6],
          duration: record[7],
          details: record[8]
        });
      }
    }
    return records;
  } catch (error) {
    console.error(`Error reading leak history for community${communityId}:`, error);
    return [];
  }
}

/**
 * Parse a CSV line carefully handling quoted fields
 * @param {string} line - CSV line
 * @returns {array} Parsed fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Escape CSV value (handle commas and quotes)
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCsv(value) {
  const text = String(value || '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

/**
 * Record a leak start event
 * @param {number} communityId - Community ID
 * @param {object} device - Device object with flatNo, deviceId, sensorType
 * @param {number} status - Current status (3=ALERT, 5=PANIC_ALERT)
 * @returns {void}
 */
function recordLeakStart(communityId, device, status) {
  initializeLeakHistoryFile(communityId);
  const filePath = getLeakHistoryFile(communityId);
  
  const timestamp = new Date().toISOString();
  const statusLabel = status === 5 ? 'Panic Alert' : 'Alert';
  const eventType = 'LEAK_STARTED';
  
  const row = [
    escapeCsv(device.flatNo || ''),
    escapeCsv(device.deviceId || ''),
    escapeCsv(device.sensorType || ''),
    eventType,
    statusLabel,
    timestamp,
    '', // Time resolved - empty for ongoing leak
    '', // Duration - empty for ongoing leak
    `Leak detected. Status: ${statusLabel}`
  ].join(',') + '\n';

  fs.appendFileSync(filePath, row, 'utf8');
  console.log(`[LeakHistory] Leak started recorded for device ${device.deviceId} in community${communityId}`);
}

function recordStatusChange(communityId, device, oldStatus, newStatus) {
  initializeLeakHistoryFile(communityId);
  const filePath = getLeakHistoryFile(communityId);
  const timestamp = new Date().toISOString();
  const oldLabel = getStatusLabel(oldStatus);
  const newLabel = getStatusLabel(newStatus);

  const row = [
    escapeCsv(device.flatNo || ''),
    escapeCsv(device.deviceId || ''),
    escapeCsv(device.sensorType || ''),
    'STATUS_CHANGED',
    newLabel,
    timestamp,
    '',
    '',
    `Status changed from ${oldLabel} to ${newLabel}`
  ].join(',') + '\n';

  fs.appendFileSync(filePath, row, 'utf8');
  console.log(`[LeakHistory] Status changed recorded for device ${device.deviceId} in community${communityId}: ${oldLabel} -> ${newLabel}`);
}

/**
 * Record a leak end event
 * @param {number} communityId - Community ID
 * @param {object} device - Device object
 * @param {object} previousRecord - Previous leak record to update
 * @returns {void}
 */
function recordLeakEnd(communityId, device, previousRecord) {
  const filePath = getLeakHistoryFile(communityId);
  
  if (!fs.existsSync(filePath)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const history = readLeakHistory(communityId);
  
  // Find the last unresolved leak for this device
  let targetIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].deviceId === device.deviceId && !history[i].timeResolved) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex === -1) {
    // No unresolved leak found, create a new end record with both timestamps populated
    const row = [
      escapeCsv(device.flatNo || ''),
      escapeCsv(device.deviceId || ''),
      escapeCsv(device.sensorType || ''),
      'LEAK_ENDED',
      'Resolved',
      timestamp,
      timestamp,
      '0',
      'Leak resolved and device returned to normal status (start event missing)'
    ].join(',') + '\n';

    fs.appendFileSync(filePath, row, 'utf8');
  } else {
    // Update existing record with resolution time
    history[targetIndex].timeResolved = timestamp;
    
    // Calculate duration
    const startTime = new Date(history[targetIndex].timeOccurred);
    const endTime = new Date(timestamp);
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / 60000);
    history[targetIndex].duration = durationMinutes.toString();
    
    // Update details
    history[targetIndex].details = `Leak resolved. Duration: ${durationMinutes} minutes`;
    
    // Rewrite entire file with updated records
    writeLeakHistory(communityId, history);
  }

  console.log(`[LeakHistory] Leak ended recorded for device ${device.deviceId} in community${communityId}`);
}

/**
 * Write leak history to file
 * @param {number} communityId - Community ID
 * @param {array} records - Array of records to write
 */
function writeLeakHistory(communityId, records) {
  const filePath = getLeakHistoryFile(communityId);
  
  let content = 'Flat No,Device ID,Sensor Type,Event Type,Leak Status,Time Occurred,Time Resolved,Duration (minutes),Details\n';
  
  records.forEach(record => {
    const row = [
      escapeCsv(record.flatNo),
      escapeCsv(record.deviceId),
      escapeCsv(record.sensorType),
      escapeCsv(record.eventType),
      escapeCsv(record.leakStatus),
      escapeCsv(record.timeOccurred),
      escapeCsv(record.timeResolved),
      escapeCsv(record.duration),
      escapeCsv(record.details)
    ].join(',') + '\n';
    content += row;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Get complete leak history for a community
 * @param {number} communityId - Community ID
 * @returns {array} Complete leak history
 */
function getLeakHistory(communityId) {
  return readLeakHistory(communityId).filter(record => record.eventType === 'LEAK_STARTED' || record.eventType === 'LEAK_ENDED');
}

function getEventHistory(communityId) {
  return readLeakHistory(communityId);
}

/**
 * Check if device was in leak status before
 * @param {number} communityId - Community ID
 * @param {string} deviceId - Device ID
 * @returns {boolean} True if device had leak events before
 */
function hadLeakBefore(communityId, deviceId) {
  const history = readLeakHistory(communityId);
  return history.some(record => record.deviceId === deviceId);
}

/**
 * Get last leak status for a device
 * @param {number} communityId - Community ID
 * @param {string} deviceId - Device ID
 * @returns {object|null} Last leak record or null
 */
function getLastLeakRecord(communityId, deviceId) {
  const history = readLeakHistory(communityId);
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].deviceId === deviceId) {
      return history[i];
    }
  }
  return null;
}

/**
 * Track device status change and record leak events
 * @param {number} communityId - Community ID
 * @param {object} device - Device object
 * @param {number} newStatus - New status value
 * @param {number} oldStatus - Old status value
 */
function trackStatusChange(communityId, device, newStatus, oldStatus) {
  if (oldStatus === newStatus) {
    return;
  }

  const isAlertStatus = (status) => status === 3 || status === 5; // 3=ALERT, 5=PANIC_ALERT
  const wasInLeak = isAlertStatus(oldStatus);
  const isInLeak = isAlertStatus(newStatus);

  if (!wasInLeak && isInLeak) {
    // Transition from non-alert to alert
    recordLeakStart(communityId, device, newStatus);
  } else if (wasInLeak && !isInLeak) {
    // Transition from alert to non-alert
    recordLeakEnd(communityId, device, null);
  } else {
    // Record all other status transitions so detailed reports show yellow/green/blue changes.
    recordStatusChange(communityId, device, oldStatus, newStatus);
  }
}

module.exports = {
  recordLeakStart,
  recordLeakEnd,
  getLeakHistory,
  getEventHistory,
  hadLeakBefore,
  getLastLeakRecord,
  trackStatusChange,
  getLeakHistoryFile,
  initializeLeakHistoryFile,
  readLeakHistory,
  writeLeakHistory,
  escapeCsv
};
