// Dynamic database connection based on environment
if (process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Export PostgreSQL-compatible interface
  module.exports = {
    query: (text, params, callback) => {
      return pool.query(text, params, callback);
    },
    all: (sql, params, callback) => {
      pool.query(sql, params)
        .then(result => callback(null, result.rows))
        .catch(err => callback(err));
    },
    get: (sql, params, callback) => {
      pool.query(sql, params)
        .then(result => callback(null, result.rows[0]))
        .catch(err => callback(err));
    },
    run: (sql, params, callback) => {
      pool.query(sql, params)
        .then(result => {
          if (callback) {
            callback.call({
              changes: result.rowCount,
              lastID: result.rows[0]?.id
            }, null);
          }
        })
        .catch(err => {
          if (callback) callback(err);
        });
    }
  };
} else {
  // Development: Use SQLite
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');

  const dbPath = path.join(__dirname, 'training.db');
  const db = new sqlite3.Database(dbPath);

  // Initialize database tables
  db.serialize(() => {
    // Employees table
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

    // Training records table
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

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_employee_id ON training_records(employee_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date)');
  });

  module.exports = db;
}
