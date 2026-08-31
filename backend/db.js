const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'smartfarm.sqlite');
const db = new sqlite3.Database(DB_PATH);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_name TEXT NOT NULL UNIQUE
    CHECK (crop_name IN ('Tomato','Lettuce','Wheat','Maize')),
  location TEXT NOT NULL,
  target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
  target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
  normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (target_min < target_max)
);
`;

// Maize is deliberately NOT seeded - it must be created through the UI
// so the marker can test Create immediately (Section 6 of the brief).
const SEED_CROPS = [
  { crop_name: 'Tomato', location: 'Greenhouse A', target_min: 55, target_max: 75, normal_water: 500 },
  { crop_name: 'Lettuce', location: 'Greenhouse B', target_min: 60, target_max: 80, normal_water: 400 },
  { crop_name: 'Wheat', location: 'North Field', target_min: 35, target_max: 55, normal_water: 300 },
];

function initDb() {
  return new Promise((resolve, reject) => {
    db.run(SCHEMA, (err) => {
      if (err) return reject(err);

      db.get('SELECT COUNT(*) AS count FROM crops', (err, row) => {
        if (err) return reject(err);
        if (row.count > 0) return resolve();

        const stmt = db.prepare(
          `INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
           VALUES (?, ?, ?, ?, ?, '')`
        );
        SEED_CROPS.forEach((c) => {
          stmt.run(c.crop_name, c.location, c.target_min, c.target_max, c.normal_water);
        });
        stmt.finalize((err) => (err ? reject(err) : resolve()));
      });
    });
  });
}

module.exports = { db, initDb, DB_PATH };