const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DIRECT_URL or DATABASE_URL not specified in environment");
    process.exit(1);
  }
  
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to Database');

  // Clean the database schema first to prevent conflicts
  console.log('🧹 Cleaning existing public schema...');
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('✅ Public schema reset');

  // Read schema.sql
  const sqlPath = "d:\\Koinonia\\database\\migrations\\schema.sql";
  console.log(`📖 Reading schema file from: ${sqlPath}`);
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Execute SQL
  console.log('🚀 Running schema migration...');
  await client.query(sqlContent);
  console.log('✅ Migration complete');

  await client.end();
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
