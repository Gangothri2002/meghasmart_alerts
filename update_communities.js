const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data', 'communities.db');
const db = new sqlite3.Database(dbPath);
const communityDataDir = path.join(__dirname, 'data', 'communities');

// Load clients
db.all(`SELECT client.*, community.id AS communityId
        FROM client
        LEFT JOIN community ON client.email = community.email
        WHERE community.id IS NOT NULL
        ORDER BY community.id`, (err, clients) => {
  if (err) {
    console.error('Error loading clients:', err);
    return;
  }

  // Load devices
  db.all('SELECT * FROM device', (err, devices) => {
    if (err) {
      console.error('Error loading devices:', err);
      return;
    }

    for (let i = 0; i < 7; i++) {
      const client = clients[i];
      if (!client) continue;

      const clientDevices = devices
        .filter(d => d.communityId === client.communityId)
        .map(d => ({
          flatNo: d.flatNo,
          deviceId: d.deviceId,
          sensorType: d.sensorType,
          status: d.status
        }));

      const data = {
        customerName: client.customerName,
        flatNo: client.flatNo,
        email: client.email,
        communityId: client.communityId,
        devices: clientDevices
      };

      const filePath = path.join(communityDataDir, `community${i + 1}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated community${i + 1}.json with ${clientDevices.length} devices`);
    }

    db.close();
  });
});