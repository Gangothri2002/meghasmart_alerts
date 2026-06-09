const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname,'data','communities.db');
const db = new sqlite3.Database(dbPath);
db.serialize(()=>{
  db.all('SELECT id, customerName, email FROM community', (err, rows) => {
    if(err){ console.error(err); }
    else { rows.forEach(r => console.log(r.id, r.customerName, r.email)); }
    db.close();
  });
});
