const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Create employees table
    console.log('Creating employees table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employees table created');

    // Create training_records table
    console.log('Creating training_records table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('trainer', 'trainee')),
        training_topic TEXT NOT NULL,
        training_date DATE NOT NULL,
        duration_hours REAL NOT NULL,
        session_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Training records table created');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_session ON training_records(session_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_role ON training_records(role);
    `);
    console.log('✅ Indexes created');

    // Import employees from JSON if exists
    const employeesFile = path.join(__dirname, '..', 'employees.json');
    if (fs.existsSync(employeesFile)) {
      console.log('Importing employees from employees.json...');
      const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

      for (const emp of employees) {
        try {
          await client.query(
            'INSERT INTO employees (employee_id, employee_name, department) VALUES ($1, $2, $3) ON CONFLICT (employee_id) DO NOTHING',
            [emp.employee_id, emp.employee_name, emp.department]
          );
        } catch (err) {
          console.warn(`⚠️  Skipped ${emp.employee_name}: ${err.message}`);
        }
      }

      const result = await client.query('SELECT COUNT(*) FROM employees');
      console.log(`✅ Employees imported: ${result.rows[0].count} total`);
    } else {
      console.log('ℹ️  No employees.json found, skipping import');
    }

    await client.end();
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
