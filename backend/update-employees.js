const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function updateEmployees() {
  try {
    const employeesFile = path.join(__dirname, '..', 'employees.json');

    if (!fs.existsSync(employeesFile)) {
      console.error('❌ employees.json not found!');
      process.exit(1);
    }

    const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
    console.log(`Found ${employees.length} employees to update\n`);

    let success = 0;
    let failed = 0;

    for (const emp of employees) {
      try {
        await axios.put(`${API_URL}/employees/${emp.employee_id}`, {
          employee_name: emp.employee_name,
          department: emp.department,
          position: emp.position || '',
          level: emp.level || '',
          email: emp.email || '',
          phone: emp.phone || ''
        });
        console.log(`✅ Updated: ${emp.employee_name} (${emp.employee_id})`);
        success++;
      } catch (err) {
        console.error(`❌ Failed: ${emp.employee_name} - ${err.response?.data?.error || err.message}`);
        failed++;
      }
    }

    console.log(`\n--- Update Summary ---`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${employees.length}`);

  } catch (err) {
    console.error('❌ Update failed:', err.message);
    process.exit(1);
  }
}

updateEmployees();
