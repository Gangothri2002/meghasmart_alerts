const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'communities.db');
const communityDataDir = path.join(__dirname, 'data', 'communities');

// Device limit constant (must match server.js)
const MAX_DEVICES_PER_COMMUNITY = 300;

const db = new sqlite3.Database(dbPath);

// First, clear existing device data
db.run('DELETE FROM device', [], (err) => {
  if (err) {
    console.error('Error deleting devices:', err);
    db.close();
    process.exit(1);
  }
  
  console.log('✓ Cleared all devices from database');
  console.log(`✓ Device limit per community: ${MAX_DEVICES_PER_COMMUNITY} devices max`);
  console.log('');
  
  // Re-insert from JSON files
  const files = fs.readdirSync(communityDataDir).filter(f => f.endsWith('.json')).sort();
  let totalInserted = 0;
  
  files.forEach((file, idx) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(communityDataDir, file), 'utf8'));
      const cid = idx + 1;
      
      if (Array.isArray(data.devices)) {
        // Check if devices exceed limit
        if (data.devices.length > MAX_DEVICES_PER_COMMUNITY) {
          console.warn(`⚠️  WARNING: Community ${cid} (${data.customerName}) has ${data.devices.length} devices, which exceeds the limit of ${MAX_DEVICES_PER_COMMUNITY}`);
          console.warn(`   Only inserting first ${MAX_DEVICES_PER_COMMUNITY} devices`);
        }
        
        // Slice to limit
        const devicesToInsert = data.devices.slice(0, MAX_DEVICES_PER_COMMUNITY);
        
        devicesToInsert.forEach(dev => {
          db.run(
            'INSERT INTO device (communityId, flatNo, deviceId, sensorType, status) VALUES (?,?,?,?,?)',
            [cid, dev.flatNo, dev.deviceId, dev.sensorType, dev.status],
            (err) => {
              if (err) console.error('  Error inserting device:', err);
            }
          );
        });
        console.log(`✓ Inserted ${devicesToInsert.length}/${data.devices.length} devices for community ${cid} (${data.customerName})`);
        totalInserted += devicesToInsert.length;
      }
    } catch (e) {
      console.error('  Error processing', file, ':', e.message);
    }
  });
  
  // Check final count after all inserts
  setTimeout(() => {
    db.all('SELECT communityId, COUNT(*) as device_count FROM device GROUP BY communityId ORDER BY communityId', (err, rows) => {
      if (err) {
        console.error('Error reading device count:', err);
        db.close();
        process.exit(1);
      } else {
        console.log('\n✓ Device count per community after cleanup:');
        let totalDevices = 0;
        let capacityIssues = [];
        
        rows.forEach(row => {
          const capacityPercent = Math.round((row.device_count / MAX_DEVICES_PER_COMMUNITY) * 100);
          console.log(`  Community ${row.communityId}: ${row.device_count}/${MAX_DEVICES_PER_COMMUNITY} devices (${capacityPercent}%)`);
          totalDevices += row.device_count;
          
          if (row.device_count >= MAX_DEVICES_PER_COMMUNITY) {
            capacityIssues.push(`Community ${row.communityId} is at or exceeds capacity`);
          }
        });
        
        console.log(`\n✓ Total devices in database: ${totalDevices}`);
        
        if (capacityIssues.length > 0) {
          console.warn('\n⚠️  Capacity Warnings:');
          capacityIssues.forEach(issue => console.warn(`   - ${issue}`));
        }
      }
      db.close();
    });
  }, 1500);
});
