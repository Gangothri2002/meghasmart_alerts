const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'communities.db');
const db = new sqlite3.Database(dbPath);

const client = {
  sno: 1,
  flatNo: 'A1-101',
  deviceId: 'GVM2400001',
  customerName: 'Test User',
  email: 'test@meghasmart.com',
  phone: '9800000001',
  address: 'Test Address',
  coordinates: { lat: '19.0760', lng: '72.8777' },
  registrationDate: new Date(),
  status: 'Active',
  subscriptionPlan: 'Basic',
  accessLevel: 'Full',
  isNew: false
};

db.run(
  `INSERT OR REPLACE INTO client (sno, flatNo, deviceId, customerName, email, phone, address, lat, lng, registrationDate, status, subscriptionPlan, accessLevel, isNew) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [client.sno, client.flatNo, client.deviceId, client.customerName, client.email, client.phone, client.address, parseFloat(client.coordinates.lat), parseFloat(client.coordinates.lng), client.registrationDate.toISOString(), client.status, client.subscriptionPlan, client.accessLevel, client.isNew ? 1 : 0],
  function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Inserted successfully');
    }
    db.close();
  }
);