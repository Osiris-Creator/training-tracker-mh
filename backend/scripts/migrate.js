const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating database to add role column...');

// Add role column if it doesn't exist
db.run(`
  ALTER TABLE training_records ADD COLUMN role TEXT DEFAULT 'trainee'
`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✓ Role column already exists, skipping...');
    } else {
      console.error('Error adding role column:', err.message);
    }
  } else {
    console.log('✓ Role column added successfully');
  }

  // Verify the schema
  db.all("PRAGMA table_info(training_records)", (err, rows) => {
    if (err) {
      console.error('Error checking schema:', err.message);
    } else {
      console.log('\n✅ Current training_records schema:');
      rows.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    }
    db.close();
  });
});
