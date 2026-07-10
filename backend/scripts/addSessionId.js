const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding session_id column to training_records...');

db.serialize(() => {
  // Check if column exists
  db.all("PRAGMA table_info(training_records)", (err, columns) => {
    if (err) {
      console.error('Error checking table:', err.message);
      db.close();
      return;
    }

    const hasSessionId = columns.some(col => col.name === 'session_id');

    if (hasSessionId) {
      console.log('✓ session_id column already exists');
      db.close();
      return;
    }

    // Add session_id column
    db.run(`ALTER TABLE training_records ADD COLUMN session_id INTEGER`, (err) => {
      if (err) {
        console.error('Error adding column:', err.message);
      } else {
        console.log('✓ Added session_id column');

        // Create index
        db.run('CREATE INDEX IF NOT EXISTS idx_session_id ON training_records(session_id)', (err) => {
          if (err) {
            console.error('Error creating index:', err.message);
          } else {
            console.log('✓ Created index on session_id');
          }
          db.close();
        });
      }
    });
  });
});
