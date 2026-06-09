const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function openDatabase(dbFilePath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE, err => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function getTables(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.name));
    });
  });
}

function queryTable(db, name) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${name}`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function printTable(name, rows) {
  console.log(`\n--- ${name.toUpperCase()} (${rows.length} rows) ---`);
  if (rows.length === 0) { console.log('(empty)'); return; }
  console.table(rows);
}

function exportCsv(name, rows) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(',')];
  rows.forEach(r => {
    lines.push(cols.map(c => {
      const v = r[c] === null || r[c] === undefined ? '' : String(r[c]);
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }).join(','));
  });
  fs.writeFileSync(`${name}.csv`, lines.join('\n'), 'utf8');
}

async function showFn(dbFileName) {
  const dbFilePath = path.join(__dirname, 'data', dbFileName);
  if (!fs.existsSync(dbFilePath)) {
    console.error('File not found:', dbFilePath);
    return;
  }

  try {
    const db = await openDatabase(dbFilePath);
    const tables = await getTables(db);
    if (!tables.length) {
      console.log('No tables found in', dbFileName);
      db.close();
      return;
    }

    for (const t of tables) {
      const rows = await queryTable(db, t);
      printTable(t, rows);
      exportCsv(t, rows);
      console.log(`Exported ${t}.csv`);
    }

    console.log(`\nDatabase file ${dbFileName} displayed and exported.`);
    db.close();
  } catch (err) {
    console.error('Error reading', dbFileName, err.message);
    if (dbFileName.endsWith('.corrupt')) {
      const fallback = 'communities.db';
      if (fs.existsSync(path.join(__dirname, 'data', fallback))) {
        console.info(`Copying ${fallback} to ${dbFileName} to recover and retry.`);
        fs.copyFileSync(path.join(__dirname, 'data', fallback), path.join(__dirname, 'data', dbFileName));
        return showFn(dbFileName);
      }
    }
  }
}

(async () => {
  const targets = ['communities.db', 'communities.db.corrupt'];
  for (const f of targets) {
    console.log(`\n====== Processing ${f} ======`);
    await showFn(f);
  }
})();