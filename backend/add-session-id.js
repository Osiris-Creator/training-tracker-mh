const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'training.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding session_id column to training_records table...');

db.run(`ALTER TABLE training_records ADD COLUMN session_id INTEGER`, function(err) {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ Column session_id already exists');
    } else {
      console.error('❌ Error:', err.message);
    }
  } else {
    console.log('✅ Successfully added session_id column');
  }

  db.close();
});
