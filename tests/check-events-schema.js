#!/usr/bin/env node

// Load env BEFORE any imports
require('dotenv').config({ path: '.env.test' });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing env vars!');
  process.exit(1);
}

const db = createClient(url, key);

async function checkEventsSchema() {
  console.log('🔍 Checking REAL schema in PostgreSQL database\n');
  
  // Query information_schema directly (bypasses PostgREST cache!)
  const { data, error } = await db.rpc('exec_sql', {
    query: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'events'
      ORDER BY ordinal_position;
    `
  });
  
  if (error) {
    // If RPC doesn't exist, try direct query
    console.log('RPC not available, trying direct query...\n');
    
    const { data: cols, error: err2 } = await db
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'events')
      .order('ordinal_position');
    
    if (err2) {
      console.error('❌ Error:', err2.message);
      return;
    }
    
    console.log('✅ events table columns (REAL PostgreSQL schema):\n');
    console.table(cols);
    
    // Check specific columns
    console.log('\n📋 Key columns check:');
    const columnNames = cols.map(c => c.column_name);
    
    checkColumn(columnNames, 'published_at', '⚡ BILLING V4 (NEW)');
    checkColumn(columnNames, 'created_by_user_id', '👤 Owner field');
    checkColumn(columnNames, 'owner_id', '❌ Old field (should NOT exist)');
    checkColumn(columnNames, 'location_text', '📍 Location');
    checkColumn(columnNames, 'date_time', '📅 DateTime');
    
    return;
  }
  
  console.log('✅ events table columns:\n');
  console.table(data);
}

function checkColumn(columnNames, columnName, description) {
  const exists = columnNames.includes(columnName);
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${columnName.padEnd(25)} ${description}`);
}

checkEventsSchema().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

