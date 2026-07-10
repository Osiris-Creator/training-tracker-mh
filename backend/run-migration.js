// One-time migration runner via API endpoint
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    return { error: 'DATABASE_URL not configured' };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const results = [];

  try {
    await client.connect();
    results.push('✅ Connected to PostgreSQL');

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
    results.push('✅ Employees table created');

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
    results.push('✅ Training records table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_session ON training_records(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_training_role ON training_records(role)');
    results.push('✅ Indexes created');

    // Check if employees exist
    const countResult = await client.query('SELECT COUNT(*) FROM employees');
    const count = parseInt(countResult.rows[0].count);

    if (count === 0) {
      results.push('📥 Importing employees...');
      const employeesFile = path.join(__dirname, '..', 'employees.json');

      if (fs.existsSync(employeesFile)) {
        const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

        for (const emp of employees) {
          await client.query(
            'INSERT INTO employees (employee_id, employee_name, department, position, level, email, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (employee_id) DO NOTHING',
            [
              emp.employee_id,
              emp.employee_name,
              emp.department || '',
              emp.position || '',
              emp.level || '',
              emp.email || '',
              emp.phone || ''
            ]
          );
        }

        const finalCount = await client.query('SELECT COUNT(*) FROM employees');
        results.push(`✅ ${finalCount.rows[0].count} employees imported`);
      } else {
        results.push('⚠️  employees.json not found');
      }
    } else {
      results.push(`ℹ️  ${count} employees already exist`);
    }

    await client.end();
    return { success: true, results };

  } catch (error) {
    await client.end();
    return { success: false, error: error.message, results };
  }
}

module.exports = { runMigration };
