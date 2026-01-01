/**
 * PRODUCTION TO DEVELOPMENT DATA SYNC SCRIPT
 * ==========================================
 * This script copies all Avengers Gym data from Production to Development
 * 
 * Usage:
 *   1. Make sure you have the Supabase credentials set
 *   2. Run: node migrations/sync_prod_to_dev.js
 */

const PROD_URL = 'https://dbtdarmxvgbxeinwcxka.supabase.co';
const DEV_URL = 'https://qvszzwfvkvjxpkkiilyv.supabase.co';

// You'll need to set these - get them from Supabase Dashboard > Settings > API
const PROD_SERVICE_KEY = process.env.PROD_SUPABASE_SERVICE_KEY || 'YOUR_PROD_SERVICE_ROLE_KEY';
const DEV_SERVICE_KEY = process.env.DEV_SUPABASE_SERVICE_KEY || 'YOUR_DEV_SERVICE_ROLE_KEY';

const GYM_ID = 'a0000000-0000-0000-0000-000000000001';

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const prodClient = createClient(PROD_URL, PROD_SERVICE_KEY);
  const devClient = createClient(DEV_URL, DEV_SERVICE_KEY);
  
  console.log('🔄 Starting Production to Development sync...\n');
  
  // Step 1: Clear existing data in dev
  console.log('🗑️  Clearing existing Avengers Gym data from dev...');
  await devClient.from('gym_payment_schedule').delete().eq('gym_id', GYM_ID);
  await devClient.from('gym_payments').delete().eq('gym_id', GYM_ID);
  await devClient.from('gym_members').delete().eq('gym_id', GYM_ID);
  await devClient.from('gym_membership_plans').delete().eq('gym_id', GYM_ID);
  await devClient.from('gym_users').delete().eq('gym_id', GYM_ID);
  await devClient.from('gym_gyms').delete().eq('id', GYM_ID);
  console.log('   ✅ Data cleared\n');
  
  // Step 2: Copy gym_gyms
  console.log('📦 Copying gym_gyms...');
  const { data: gyms } = await prodClient.from('gym_gyms').select('*').eq('id', GYM_ID);
  if (gyms?.length) {
    await devClient.from('gym_gyms').insert(gyms);
    console.log(`   ✅ Copied ${gyms.length} gym(s)\n`);
  }
  
  // Step 3: Copy gym_users
  console.log('📦 Copying gym_users...');
  const { data: users } = await prodClient.from('gym_users').select('*').eq('gym_id', GYM_ID);
  if (users?.length) {
    await devClient.from('gym_users').insert(users);
    console.log(`   ✅ Copied ${users.length} user(s)\n`);
  }
  
  // Step 4: Copy gym_membership_plans
  console.log('📦 Copying gym_membership_plans...');
  const { data: plans } = await prodClient.from('gym_membership_plans').select('*').eq('gym_id', GYM_ID);
  if (plans?.length) {
    await devClient.from('gym_membership_plans').insert(plans);
    console.log(`   ✅ Copied ${plans.length} plan(s)\n`);
  }
  
  // Step 5: Copy gym_members
  console.log('📦 Copying gym_members...');
  const { data: members } = await prodClient.from('gym_members').select('*').eq('gym_id', GYM_ID);
  if (members?.length) {
    await devClient.from('gym_members').insert(members);
    console.log(`   ✅ Copied ${members.length} member(s)\n`);
  }
  
  // Step 6: Copy gym_payments
  console.log('📦 Copying gym_payments...');
  const { data: payments } = await prodClient.from('gym_payments').select('*').eq('gym_id', GYM_ID);
  if (payments?.length) {
    await devClient.from('gym_payments').insert(payments);
    console.log(`   ✅ Copied ${payments.length} payment(s)\n`);
  }
  
  // Step 7: Copy gym_payment_schedule
  console.log('📦 Copying gym_payment_schedule...');
  const { data: schedules } = await prodClient.from('gym_payment_schedule').select('*').eq('gym_id', GYM_ID);
  if (schedules?.length) {
    // Insert in batches of 100 to avoid timeout
    for (let i = 0; i < schedules.length; i += 100) {
      const batch = schedules.slice(i, i + 100);
      await devClient.from('gym_payment_schedule').insert(batch);
    }
    console.log(`   ✅ Copied ${schedules.length} schedule(s)\n`);
  }
  
  console.log('🎉 Sync complete! Development now matches Production.\n');
  
  // Verify counts
  console.log('📊 Verifying data counts...');
  const { count: devMembers } = await devClient.from('gym_members').select('*', { count: 'exact', head: true }).eq('gym_id', GYM_ID);
  const { count: devPayments } = await devClient.from('gym_payments').select('*', { count: 'exact', head: true }).eq('gym_id', GYM_ID);
  const { count: devSchedules } = await devClient.from('gym_payment_schedule').select('*', { count: 'exact', head: true }).eq('gym_id', GYM_ID);
  
  console.log(`   Members: ${devMembers}`);
  console.log(`   Payments: ${devPayments}`);
  console.log(`   Schedules: ${devSchedules}`);
}

main().catch(console.error);
