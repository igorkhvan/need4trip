#!/usr/bin/env node

// Load env BEFORE any imports
require('dotenv').config({ path: '.env.test' });

// Now import after env is loaded
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying Production Schema\n');
console.log('URL:', url?.substring(0, 30) + '...');
console.log('Key:', key ? '✅ Present' : '❌ Missing');
console.log('');

if (!url || !key) {
  console.error('❌ Missing env vars!');
  process.exit(1);
}

const db = createClient(url, key);

async function verify() {
  // 1. Check billing_transactions
  console.log('1️⃣  billing_transactions:');
  const { data: tx, error: txErr } = await db
    .from('billing_transactions')
    .select('*')
    .limit(0);
  
  if (txErr) {
    console.log('   ❌', txErr.message);
  } else {
    console.log('   ✅ Table exists');
  }
  
  // 2. Check billing_credits
  console.log('\n2️⃣  billing_credits:');
  const { data: credits, error: credErr } = await db
    .from('billing_credits')
    .select('*')
    .limit(0);
  
  if (credErr) {
    console.log('   ❌', credErr.message);
  } else {
    console.log('   ✅ Table exists');
  }
  
  // 3. Check billing_products
  console.log('\n3️⃣  billing_products:');
  const { data: products, error: prodErr } = await db
    .from('billing_products')
    .select('*');
  
  if (prodErr) {
    console.log('   ❌', prodErr.message);
  } else {
    console.log('   ✅ Table exists');
    console.log('   Products:', products?.map(p => p.code).join(', ') || 'NONE');
  }
  
  // 4. Check events.published_at
  console.log('\n4️⃣  events.published_at:');
  const { data: events, error: evErr } = await db
    .from('events')
    .select('id, published_at')
    .limit(1);
  
  if (evErr) {
    console.log('   ❌', evErr.message);
  } else {
    console.log('   ✅ Column exists');
  }
  
  // 5. Try insert test transaction
  console.log('\n5️⃣  Test insert transaction:');
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testTxId = '00000000-0000-0000-0000-000000000002';
  
  const { error: insErr } = await db
    .from('billing_transactions')
    .insert({
      id: testTxId,
      user_id: testUserId,
      product_code: 'EVENT_UPGRADE_500',
      amount: 1000,
      currency_code: 'KZT',
      status: 'completed',
    });
  
  if (insErr) {
    console.log('   ❌ Insert failed:', insErr.message);
    if (insErr.code) console.log('   Code:', insErr.code);
    if (insErr.hint) console.log('   Hint:', insErr.hint);
  } else {
    console.log('   ✅ Insert successful');
    // Cleanup
    await db.from('billing_transactions').delete().eq('id', testTxId);
    console.log('   ✅ Cleanup done');
  }
  
  console.log('\n✅ Schema verification complete!\n');
}

verify().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

