const db = require('../database');
const fs = require('fs');
const path = require('path');

// Read employee data from Excel (converted to JSON)
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '../../MH_ecampus_results VSAM (1).xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Starting database initialization...');
console.log(`Found ${data.length} employees in Excel file`);

// Insert employees into database
let inserted = 0;
let errors = 0;

data.forEach((row, index) => {
  // Skip header row or rows without Employee ID
  if (!row['Employee ID'] || isNaN(row['Employee ID'])) {
    return;
  }

  const sql = `
    INSERT OR IGNORE INTO employees
    (employee_id, employee_name, name_thai, surname_thai, position, department, level, email, phone, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Handle Start Date safely
  let startDate = null;
  if (row['Start Date']) {
    try {
      const date = new Date(row['Start Date']);
      if (!isNaN(date.getTime())) {
        startDate = date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date, keep as null
    }
  }

  const values = [
    String(row['Employee ID']).trim(),
    (row['EMPLOYEE NAME'] || '').trim(),
    (row['Name Thai'] || '').trim(),
    (row['Surename Thai'] || '').trim(),
    (row['Position'] || '').trim(),
    (row['Department'] || row['Department '] || '').trim(),
    (row['Level'] || '').trim(),
    (row['Email from Ecampus'] || '').trim(),
    (row['Phone'] || '').trim(),
    startDate
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error(`Error inserting employee ${row['Employee ID']}:`, err.message);
      errors++;
    } else if (this.changes > 0) {
      inserted++;
    }

    // Check if we're done
    if (index === data.length - 1) {
      console.log(`\n✅ Database initialization complete!`);
      console.log(`   Inserted: ${inserted} employees`);
      console.log(`   Errors: ${errors}`);

      // Verify the data
      db.get('SELECT COUNT(*) as count FROM employees', (err, row) => {
        console.log(`   Total in database: ${row.count} employees`);
        process.exit(0);
      });
    }
  });
});
