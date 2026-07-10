const { Client } = require('pg');
require('dotenv').config();

async function addAttachmentColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    console.log('Adding attachment_url column...');

    await client.query(`
      ALTER TABLE training_records
      ADD COLUMN IF NOT EXISTS attachment_url TEXT;
    `);

    console.log('✅ attachment_url column added successfully');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addAttachmentColumn();
