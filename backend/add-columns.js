const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addMissingColumns() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check existing columns
    console.log('Checking existing columns in training_records...');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'training_records'
      ORDER BY ordinal_position
    `);

    console.log('Current columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const existingColumns = result.rows.map(r => r.column_name);

    // Add missing columns
    console.log('\nAdding missing columns...');

    if (!existingColumns.includes('training_hours')) {
      await client.query('ALTER TABLE training_records ADD COLUMN training_hours REAL');
      console.log('✅ Added training_hours column');
    } else {
      console.log('⚠️  training_hours already exists');
    }

    if (!existingColumns.includes('trainer_name')) {
      await client.query('ALTER TABLE training_records ADD COLUMN trainer_name TEXT');
      console.log('✅ Added trainer_name column');
    } else {
      console.log('⚠️  trainer_name already exists');
    }

    if (!existingColumns.includes('notes')) {
      await client.query('ALTER TABLE training_records ADD COLUMN notes TEXT');
      console.log('✅ Added notes column');
    } else {
      console.log('⚠️  notes already exists');
    }

    // Update session_id to INTEGER if it's TEXT
    const sessionIdCol = result.rows.find(r => r.column_name === 'session_id');
    if (sessionIdCol && sessionIdCol.data_type === 'text') {
      console.log('\nConverting session_id from TEXT to INTEGER...');
      await client.query('ALTER TABLE training_records ALTER COLUMN session_id TYPE INTEGER USING session_id::integer');
      console.log('✅ Converted session_id to INTEGER');
    }

    // Copy duration_hours to training_hours if needed
    if (!existingColumns.includes('training_hours') && existingColumns.includes('duration_hours')) {
      console.log('\nCopying duration_hours to training_hours...');
      await client.query('UPDATE training_records SET training_hours = duration_hours WHERE training_hours IS NULL');
      console.log('✅ Copied duration_hours to training_hours');
    }

    await client.end();
    console.log('\n✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    await client.end();
    process.exit(1);
  }
}

addMissingColumns();
