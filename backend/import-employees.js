const axios = require('axios');
const fs = require('fs');
const path = require('path');

// แก้ไข URL นี้เป็น Backend URL ของคุณ
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function importEmployees() {
  try {
    // อ่านไฟล์ employees.json
    const employeesFile = path.join(__dirname, '..', 'employees.json');

    if (!fs.existsSync(employeesFile)) {
      console.error('❌ employees.json not found!');
      process.exit(1);
    }

    const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
    console.log(`Found ${employees.length} employees to import\n`);

    let success = 0;
    let failed = 0;

    for (const emp of employees) {
      try {
        await axios.post(`${API_URL}/employees`, emp);
        console.log(`✅ Added: ${emp.employee_name} (${emp.employee_id})`);
        success++;
      } catch (err) {
        console.error(`❌ Failed: ${emp.employee_name} - ${err.response?.data?.error || err.message}`);
        failed++;
      }
    }

    console.log(`\n--- Import Summary ---`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${employees.length}`);

  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
}

importEmployees();
