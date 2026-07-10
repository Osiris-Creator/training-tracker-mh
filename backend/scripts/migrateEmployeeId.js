const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating employee_id from INTEGER to TEXT...');

db.serialize(() => {
  // Step 1: Create new employees table with TEXT employee_id
  db.run(`
    CREATE TABLE IF NOT EXISTS employees_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      employee_name TEXT NOT NULL,
      name_thai TEXT,
      surname_thai TEXT,
      position TEXT,
      department TEXT,
      level TEXT,
      email TEXT,
      phone TEXT,
      start_date TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err.message);
      return;
    }
    console.log('✓ Created new employees table');
  });

  // Step 2: Copy data with employee_id as TEXT (preserving leading zeros)
  db.run(`
    INSERT INTO employees_new (id, employee_id, employee_name, name_thai, surname_thai, position, department, level, email, phone, start_date)
    SELECT id, CAST(employee_id AS TEXT), employee_name, name_thai, surname_thai, position, department, level, email, phone, start_date
    FROM employees
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err.message);
      return;
    }
    console.log('✓ Copied data to new table');
  });

  // Step 3: Drop old table
  db.run(`DROP TABLE employees`, (err) => {
    if (err) {
      console.error('Error dropping old table:', err.message);
      return;
    }
    console.log('✓ Dropped old employees table');
  });

  // Step 4: Rename new table
  db.run(`ALTER TABLE employees_new RENAME TO employees`, (err) => {
    if (err) {
      console.error('Error renaming table:', err.message);
      return;
    }
    console.log('✓ Renamed table to employees');

    // Verify
    db.all("SELECT employee_id, employee_name FROM employees LIMIT 5", (err, rows) => {
      if (err) {
        console.error('Error verifying:', err.message);
      } else {
        console.log('\n✅ Migration complete! Sample data:');
        rows.forEach(row => {
          console.log(`   ${row.employee_id} - ${row.employee_name}`);
        });
      }
      db.close();
    });
  });
});
