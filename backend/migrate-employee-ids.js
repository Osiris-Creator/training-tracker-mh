const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function migrateEmployeeIds() {
  try {
    const employeesFile = path.join(__dirname, '..', 'employees.json');
    const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

    console.log(`Found ${employees.length} employees to migrate\n`);
    console.log('Step 1: Deleting old employees without leading zeros...\n');

    let deleted = 0;
    let deleteFailed = 0;

    // Delete old employees (without leading zeros)
    for (const emp of employees) {
      const oldId = emp.employee_id.replace(/^0+/, ''); // Remove leading zeros

      try {
        await axios.delete(`${API_URL}/employees/${oldId}`);
        console.log(`✅ Deleted old ID: ${oldId} (${emp.employee_name})`);
        deleted++;
      } catch (err) {
        if (err.response?.status === 404) {
          console.log(`⚠️  Old ID not found: ${oldId} (${emp.employee_name}) - will create new`);
        } else if (err.response?.status === 400 && err.response?.data?.error?.includes('training records')) {
          console.log(`⚠️  Cannot delete ${oldId} (${emp.employee_name}) - has training records, will skip`);
          deleteFailed++;
        } else {
          console.error(`❌ Failed to delete: ${oldId} - ${err.response?.data?.error || err.message}`);
          deleteFailed++;
        }
      }
    }

    console.log(`\n--- Delete Summary ---`);
    console.log(`✅ Deleted: ${deleted}`);
    console.log(`❌ Failed: ${deleteFailed}\n`);

    console.log('Step 2: Creating employees with leading zeros...\n');

    let created = 0;
    let createFailed = 0;

    // Create new employees (with leading zeros)
    for (const emp of employees) {
      try {
        await axios.post(`${API_URL}/employees`, emp);
        console.log(`✅ Created: ${emp.employee_id} (${emp.employee_name})`);
        created++;
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
          console.log(`⚠️  Already exists: ${emp.employee_id} (${emp.employee_name})`);
        } else {
          console.error(`❌ Failed: ${emp.employee_name} - ${err.response?.data?.error || err.message}`);
          createFailed++;
        }
      }
    }

    console.log(`\n--- Create Summary ---`);
    console.log(`✅ Created: ${created}`);
    console.log(`❌ Failed: ${createFailed}`);
    console.log(`📊 Total: ${employees.length}`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrateEmployeeIds();
