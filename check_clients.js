const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/communities.db');

db.all('SELECT sno, email, customerName FROM client WHERE email = ? OR email = ?', ['test@meghasmart.com', 'customer1@meghasmart.com'], (err, rows) => {
  console.log('Clients:', rows);
  db.close();
});