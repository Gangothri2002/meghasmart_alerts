// Utility to load all devices from device.csv
const fs = require('fs');
const path = require('path');

function loadAllDevicesFromCSV() {
  const csvPath = path.join(__dirname, '../../device.csv');
  if (!fs.existsSync(csvPath)) return [];
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      sno: cols[0],
      communityId: cols[1],
      flatNo: cols[2].replace(/"/g, ''),
      deviceId: cols[3].replace(/"/g, ''),
      sensorType: cols[4].replace(/"/g, ''),
      status: cols[5]
    };
  });
}

module.exports = loadAllDevicesFromCSV;
