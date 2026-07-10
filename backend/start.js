// Startup script with error handling
const db = require('./database');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.log('ℹ️  Using SQLite, skipping PostgreSQL migration');
    return;
  }

  console.log('🔄 Running database migration...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        employee_name TEXT NOT NULL,
        department TEXT,
        position TEXT,
        level TEXT,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employees table ready');

    // Create training_records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        employee_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('trainer', 'trainee')),
        training_date DATE NOT NULL,
        training_topic TEXT NOT NULL,
        training_hours REAL NOT NULL,
        trainer_name TEXT,
        notes TEXT,
        session_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Training records table ready');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_session ON training_records(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_role ON training_records(role)');
    console.log('✅ Indexes ready');

    // Import employees if table is empty
    const result = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(result.rows[0].count) === 0) {
      console.log('📥 Importing employees...');
      const employeesFile = path.join(__dirname, '..', 'employees.json');

      if (fs.existsSync(employeesFile)) {
        const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

        for (const emp of employees) {
          await client.query(
            'INSERT INTO employees (employee_id, employee_name, department, position, level, email, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id) DO NOTHING',
            [emp.employee_id, emp.employee_name, emp.department, emp.position || '', emp.level || '', emp.email || '', emp.phone || '']
          );
        }

        const finalCount = await client.query('SELECT COUNT(*) FROM employees');
        console.log(`✅ ${finalCount.rows[0].count} employees imported`);
      }
    } else {
      console.log(`ℹ️  ${result.rows[0].count} employees already exist, skipping import`);
    }

    await client.end();
    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    throw error;
  }
}

async function startServer() {
  try {
    console.log('🔄 Starting server...');

    // Run migration first for PostgreSQL
    if (process.env.DATABASE_URL) {
      await runMigration();
    }

    // Test database connection
    if (process.env.DATABASE_URL) {
      console.log('📊 Testing PostgreSQL connection...');
      await new Promise((resolve, reject) => {
        db.query('SELECT NOW()', [], (err, result) => {
          if (err) {
            console.error('❌ PostgreSQL connection failed:', err.message);
            reject(err);
          } else {
            console.log('✅ PostgreSQL connected successfully');
            resolve(result);
          }
        });
      });
    }

    // Start Express server
    require('./server');

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
