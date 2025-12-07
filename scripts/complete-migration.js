/**
 * COMPLETE AVENGERS GYM MIGRATION SCRIPT
 * Migrates ALL data from DEV to PROD including photos
 * 
 * Usage:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Run: node scripts/complete-migration.js
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION - Don't change these
// =====================================================
const DEV_URL = 'https://qvszzwfvkvjxpkkiilyv.supabase.co';
const DEV_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2c3p6d2Z2a3ZqeHBra2lpbHl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE0OTA3OCwiZXhwIjoyMDc5NzI1MDc4fQ.66UKerK3wfLZQitUxKrZS84GP61WbkUh1OEl4Mx84E4';

const PROD_URL = 'https://dbtdarmxvgbxeinwcxka.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidGRhcm14dmdieGVpbndjeGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxNzM0MCwiZXhwIjoyMDgwNTkzMzQwfQ.P969-ullvXbVTW5sghXs-kC8eXnUqHy2_OJ4l9N8IyE';

const GYM_ID = 'a0000000-0000-0000-0000-000000000001';
const AUTH_USER_ID = 'c0000000-0000-0000-0000-000000000001';

// Create clients
const devClient = createClient(DEV_URL, DEV_SERVICE_KEY);
const prodClient = createClient(PROD_URL, PROD_SERVICE_KEY);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function replacePhotoUrl(url) {
  if (!url) return url;
  return url.replace('qvszzwfvkvjxpkkiilyv', 'dbtdarmxvgbxeinwcxka');
}

async function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type] || ''} ${message}`);
}

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

async function createAuthUser() {
  log('Creating auth user...', 'info');
  
  try {
    // Create user using admin API
    const { data, error } = await prodClient.auth.admin.createUser({
      email: 'avengers@fitflow.app',
      password: 'FitFlow@2025!',
      email_confirm: true,
      user_metadata: { full_name: 'Avengers Gym Admin' }
    });
    
    if (error) {
      if (error.message.includes('already been registered')) {
        log('Auth user already exists - skipping', 'warn');
        return true;
      }
      throw error;
    }
    
    log(`Auth user created: ${data.user.email}`, 'success');
    return true;
  } catch (err) {
    log(`Auth user error: ${err.message}`, 'error');
    return false;
  }
}

async function migrateGym() {
  log('Migrating gym...', 'info');
  
  const { data: gym, error: fetchError } = await devClient
    .from('gym_gyms')
    .select('*')
    .eq('id', GYM_ID)
    .single();
  
  if (fetchError) throw fetchError;
  
  const { error: insertError } = await prodClient
    .from('gym_gyms')
    .upsert({
      ...gym,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  
  if (insertError) throw insertError;
  log(`Gym migrated: ${gym.name}`, 'success');
}

async function migrateGymUser() {
  log('Migrating gym user...', 'info');
  
  const { data: user, error: fetchError } = await devClient
    .from('gym_users')
    .select('*')
    .eq('gym_id', GYM_ID)
    .single();
  
  if (fetchError) throw fetchError;
  
  const { error: insertError } = await prodClient
    .from('gym_users')
    .upsert({
      ...user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  
  if (insertError) throw insertError;
  log(`Gym user migrated: ${user.email}`, 'success');
}

async function migratePlans() {
  log('Migrating membership plans...', 'info');
  
  const { data: plans, error: fetchError } = await devClient
    .from('gym_membership_plans')
    .select('*')
    .eq('gym_id', GYM_ID);
  
  if (fetchError) throw fetchError;
  
  for (const plan of plans) {
    const { error: insertError } = await prodClient
      .from('gym_membership_plans')
      .upsert({
        ...plan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (insertError) throw insertError;
  }
  
  log(`${plans.length} plans migrated`, 'success');
}

async function migrateMembers() {
  log('Migrating members...', 'info');
  
  const { data: members, error: fetchError } = await devClient
    .from('gym_members')
    .select('*')
    .eq('gym_id', GYM_ID);
  
  if (fetchError) throw fetchError;
  
  let count = 0;
  for (const member of members) {
    const { error: insertError } = await prodClient
      .from('gym_members')
      .upsert({
        ...member,
        photo_url: replacePhotoUrl(member.photo_url),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (insertError) {
      log(`Error migrating member ${member.full_name}: ${insertError.message}`, 'error');
    } else {
      count++;
      if (count % 20 === 0) log(`  ${count}/${members.length} members...`);
    }
  }
  
  log(`${count}/${members.length} members migrated`, 'success');
}

async function migratePayments() {
  log('Migrating payments...', 'info');
  
  const { data: payments, error: fetchError } = await devClient
    .from('gym_payments')
    .select('*')
    .eq('gym_id', GYM_ID);
  
  if (fetchError) throw fetchError;
  
  let count = 0;
  for (const payment of payments) {
    const { error: insertError } = await prodClient
      .from('gym_payments')
      .upsert({
        ...payment,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (insertError) {
      log(`Error migrating payment ${payment.id}: ${insertError.message}`, 'error');
    } else {
      count++;
    }
  }
  
  log(`${count}/${payments.length} payments migrated`, 'success');
}

async function migratePaymentSchedules() {
  log('Migrating payment schedules...', 'info');
  
  const { data: schedules, error: fetchError } = await devClient
    .from('gym_payment_schedule')
    .select('*')
    .eq('gym_id', GYM_ID);
  
  if (fetchError) throw fetchError;
  
  let count = 0;
  for (const schedule of schedules) {
    const { error: insertError } = await prodClient
      .from('gym_payment_schedule')
      .upsert({
        ...schedule,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (insertError) {
      log(`Error migrating schedule ${schedule.id}: ${insertError.message}`, 'error');
    } else {
      count++;
    }
  }
  
  log(`${count}/${schedules.length} schedules migrated`, 'success');
}

async function migratePhotos() {
  log('Migrating photos...', 'info');
  
  const bucket = 'images';
  const path = 'gyms/avengers-gym/members';
  
  // List files in DEV
  const { data: files, error: listError } = await devClient.storage
    .from(bucket)
    .list(path);
  
  if (listError) {
    log(`Error listing photos: ${listError.message}`, 'error');
    return;
  }
  
  if (!files || files.length === 0) {
    log('No photos found to migrate', 'warn');
    return;
  }
  
  log(`Found ${files.length} photos to migrate`);
  
  let count = 0;
  for (const file of files) {
    if (file.name.startsWith('.')) continue;
    
    const filePath = `${path}/${file.name}`;
    
    try {
      // Download from DEV
      const { data: fileData, error: downloadError } = await devClient.storage
        .from(bucket)
        .download(filePath);
      
      if (downloadError) {
        log(`  Error downloading ${file.name}: ${downloadError.message}`, 'error');
        continue;
      }
      
      // Upload to PROD
      const { error: uploadError } = await prodClient.storage
        .from(bucket)
        .upload(filePath, fileData, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (uploadError) {
        log(`  Error uploading ${file.name}: ${uploadError.message}`, 'error');
        continue;
      }
      
      count++;
      if (count % 20 === 0) log(`  ${count}/${files.length} photos...`);
    } catch (err) {
      log(`  Error with ${file.name}: ${err.message}`, 'error');
    }
  }
  
  log(`${count}/${files.length} photos migrated`, 'success');
}

async function verify() {
  log('\n========== VERIFICATION ==========', 'info');
  
  const { data: gymCount } = await prodClient
    .from('gym_gyms')
    .select('*', { count: 'exact', head: true })
    .eq('id', GYM_ID);
  
  const { data: memberCount } = await prodClient
    .from('gym_members')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', GYM_ID);
  
  const { data: paymentCount } = await prodClient
    .from('gym_payments')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', GYM_ID);
  
  const { count: members } = await prodClient
    .from('gym_members')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', GYM_ID);
  
  const { count: payments } = await prodClient
    .from('gym_payments')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', GYM_ID);
  
  const { count: schedules } = await prodClient
    .from('gym_payment_schedule')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', GYM_ID);
  
  console.log('\n📊 PRODUCTION DATA COUNTS:');
  console.log(`   Members: ${members || 0} (expected: 133)`);
  console.log(`   Payments: ${payments || 0} (expected: 102)`);
  console.log(`   Schedules: ${schedules || 0} (expected: 174)`);
  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log(`   Email: avengers@fitflow.app`);
  console.log(`   Password: FitFlow@2025!`);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   AVENGERS GYM - COMPLETE MIGRATION TO PRODUCTION ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`From: ${DEV_URL}`);
  console.log(`To:   ${PROD_URL}`);
  console.log('\n');
  
  try {
    // Step 1: Auth User
    await createAuthUser();
    
    // Step 2: Gym
    await migrateGym();
    
    // Step 3: Gym User
    await migrateGymUser();
    
    // Step 4: Plans
    await migratePlans();
    
    // Step 5: Members
    await migrateMembers();
    
    // Step 6: Payments
    await migratePayments();
    
    // Step 7: Payment Schedules
    await migratePaymentSchedules();
    
    // Step 8: Photos (optional but recommended)
    console.log('\n');
    await migratePhotos();
    
    // Step 9: Verify
    await verify();
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║              🎉 MIGRATION COMPLETE! 🎉            ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('\n');
    
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
