const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'communities.db');
const db = new sqlite3.Database(dbPath);

console.log('Loading clients from database...\n');

db.all('SELECT * FROM client LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('First 10 clients:');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.customerName} (${row.email}) - ${row.flatNo}`);
    });

    // Get total count
    db.get('SELECT COUNT(*) as total FROM client', (err, countRow) => {
      if (err) {
        console.error('Error getting count:', err);
      } else {
        console.log(`\nTotal clients in database: ${countRow.total}`);
      }
      db.close();
    });
  }
});