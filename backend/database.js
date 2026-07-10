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

  // Test connection
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  // Export PostgreSQL-compatible interface that mimics SQLite
  module.exports = {
    // For direct queries
    query: (text, params) => pool.query(text, params),

    // SQLite-style all() method
    all: (sql, params, callback) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }

      pool.query(pgSql, params)
        .then(result => callback(null, result.rows))
        .catch(err => callback(err));
    },

    // SQLite-style get() method
    get: (sql, params, callback) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }

      pool.query(pgSql, params)
        .then(result => callback(null, result.rows[0] || null))
        .catch(err => callback(err));
    },

    // SQLite-style run() method
    run: function(sql, params, callback) {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }

      pool.query(pgSql, params)
        .then(result => {
          if (callback) {
            // Mimic SQLite's this context
            const context = {
              changes: result.rowCount,
              lastID: result.rows && result.rows.length > 0 ? result.rows[0].id : null
            };
            callback.call(context, null);
          }
        })
        .catch(err => {
          if (callback) callback(err);
        });
    }
  };

  console.log('✅ Using PostgreSQL database');

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

  console.log('✅ Using SQLite database');
  module.exports = db;
}
