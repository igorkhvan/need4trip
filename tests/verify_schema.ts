/**
 * Quick schema verification test
 */

// Load .env.test first
require('dotenv').config({ path: '.env.test' });

import { getAdminDb } from '@/lib/db/client';

async function verifySchema() {
  const db = getAdminDb();
  
  console.log('🔍 Checking production schema...\n');
  
  // 1. Check billing_transactions structure
  console.log('1. billing_transactions columns:');
  const { data: txCols, error: txError } = await db
    .from('billing_transactions')
    .select('*')
    .limit(0);
  
  if (txError) {
    console.log('❌ Error:', txError.message);
  } else {
    console.log('✅ Table exists');
  }
  
  // 2. Check billing_credits
  console.log('\n2. billing_credits table:');
  const { data: creditCols, error: creditError } = await db
    .from('billing_credits')
    .select('*')
    .limit(0);
  
  if (creditError) {
    console.log('❌ Error:', creditError.message);
  } else {
    console.log('✅ Table exists');
  }
  
  // 3. Check billing_products
  console.log('\n3. billing_products table:');
  const { data: products, error: prodError } = await db
    .from('billing_products')
    .select('*')
    .eq('code', 'EVENT_UPGRADE_500');
  
  if (prodError) {
    console.log('❌ Error:', prodError.message);
  } else {
    console.log('✅ Table exists');
    console.log('✅ EVENT_UPGRADE_500:', products?.[0] || 'NOT FOUND');
  }
  
  // 4. Check events.published_at
  console.log('\n4. events.published_at column:');
  const { data: events, error: evError } = await db
    .from('events')
    .select('id, published_at')
    .limit(1);
  
  if (evError) {
    console.log('❌ Error:', evError.message);
  } else {
    console.log('✅ Column exists');
  }
  
  // 5. Try to insert test transaction
  console.log('\n5. Try inserting test transaction:');
  const testTxId = '00000000-0000-0000-0000-000000000001';
  const { error: insertError } = await db
    .from('billing_transactions')
    .insert({
      id: testTxId,
      user_id: '00000000-0000-0000-0000-000000000002',
      product_code: 'EVENT_UPGRADE_500',
      amount: 1000,               // ⚡ Normalized
      currency_code: 'KZT',       // ⚡ Normalized with FK
      status: 'completed',        // ⚡ Fixed enum
      provider: 'test',
    });
  
  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Hint:', insertError.hint);
  } else {
    console.log('✅ Insert successful');
    // Cleanup
    await db.from('billing_transactions').delete().eq('id', testTxId);
  }
}

verifySchema().catch(console.error);

