// Simple database connection
if (process.env.DATABASE_URL) {
  // Production: PostgreSQL
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });

  console.log('✅ Using PostgreSQL');
  module.exports = pool;

} else {
  // Development: SQLite
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');

  const dbPath = path.join(__dirname, 'training.db');
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
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
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS training_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        role TEXT DEFAULT 'trainee',
        training_date DATE NOT NULL,
        training_topic TEXT NOT NULL,
        training_hours REAL NOT NULL,
        trainer_name TEXT,
        notes TEXT,
        session_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_employee_id ON training_records(employee_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date)');
  });

  console.log('✅ Using SQLite');
  module.exports = db;
}
