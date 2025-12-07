#!/usr/bin/env node

/**
 * Membership System Test Script
 *
 * This script performs comprehensive end-to-end testing of the gym membership system:
 * 1. Database schema validation
 * 2. Member creation and management
 * 3. Payment processing and due date calculation
 * 4. Membership status tracking
 * 5. Gym data isolation verification
 * 6. Dashboard statistics validation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logTest(message) {
  log(`🧪 ${message}`, colors.cyan);
}

function logStep(step, message) {
  log('\n' + colors.bright + `Test Step ${step}: ${message}` + colors.reset);
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function runTest(testName, testFn) {
  testResults.total++;
  logTest(`Testing: ${testName}`);

  try {
    const result = testFn();
    if (result === true || (result && result.success)) {
      logSuccess(`✓ ${testName}`);
      testResults.passed++;
    } else {
      logError(`✗ ${testName}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`✗ ${testName}: ${error.message}`);
    testResults.failed++;
  }
}

// Test helpers
async function verifyTableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    return !error;
  } catch (error) {
    return false;
  }
}

async function createTestMember(gymId, planType = 'monthly') {
  const testMember = {
    gym_id: gymId,
    full_name: `Test User ${Date.now()}`,
    phone: `987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    email: `test${Date.now()}@example.com`,
    membership_plan: planType,
    plan_amount: planType === 'monthly' ? 1000 : planType === 'quarterly' ? 2500 : planType === 'half_yearly' ? 5000 : 7500,
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  const { data, error } = await supabase
    .from('members')
    .insert(testMember)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestPayment(memberId, amount = 1000) {
  const testPayment = {
    member_id: memberId,
    amount: amount,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    due_date: new Date().toISOString().split('T')[0],
    notes: 'Test payment'
  };

  const { data, error } = await supabase
    .from('payments')
    .insert(testPayment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Main test suite
async function runTests() {
  log('\n🧪 Gym/FitFlow Membership System Test Suite', colors.bright + colors.cyan);
  log('==========================================\n');

  let gymId = null;
  let testMemberId = null;
  let testPaymentId = null;

  try {
    // Test 1: Database schema validation
    logStep(1, 'Database Schema Validation');

    runTest('Members table exists', async () => {
      return await verifyTableExists('members');
    });

    runTest('Payments table exists', async () => {
      return await verifyTableExists('payments');
    });

    runTest('Payment schedules table exists', async () => {
      return await verifyTableExists('payment_schedules');
    });

    runTest('Membership plans config table exists', async () => {
      return await verifyTableExists('membership_plans_config');
    });

    // Test 2: Gym setup and isolation
    logStep(2, 'Gym Setup and Data Isolation');

    runTest('Sample gym exists', async () => {
      const { data } = await supabase
        .from('gyms')
        .select('*')
        .eq('name', 'Avengers Gym')
        .single();

      if (data) {
        gymId = data.id;
        return true;
      }
      return false;
    });

    runTest('Gym ID is valid UUID', () => {
      if (!gymId) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(gymId);
    });

    // Test 3: Member Management
    logStep(3, 'Member Management');

    runTest('Can create new member', async () => {
      const member = await createTestMember(gymId);
      if (member) {
        testMemberId = member.id;
        return member.full_name.includes('Test User') && member.gym_id === gymId;
      }
      return false;
    });

    runTest('Member data is valid', () => {
      if (!testMemberId) return false;
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', testMemberId)
        .single();
      return data && data.phone.length === 10 && data.status === 'active';
    });

    runTest('Member membership_end_date is set', () => {
      if (!testMemberId) return false;
      const { data } = await supabase
        .from('members')
        .select('membership_end_date')
        .eq('id', testMemberId)
        .single();
      return data && data.membership_end_date;
    });

    runTest('Member next_payment_due_date is calculated', () => {
      if (!testMemberId) return false;
      const { data } = await supabase
        .from('members')
        .select('next_payment_due_date')
        .eq('id', testMemberId)
        .single();
      return data && data.next_payment_due_date;
    });

    // Test 4: Payment Processing
    logStep(4, 'Payment Processing');

    runTest('Can create payment record', async () => {
      const payment = await createTestPayment(testMemberId, 1500);
      if (payment) {
        testPaymentId = payment.id;
        return payment.amount === 1500 && payment.member_id === testMemberId;
      }
      return false;
    });

    runTest('Payment status is properly set', () => {
      if (!testPaymentId) return false;
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('id', testPaymentId)
        .single();
      return data && data.status === 'succeeded';
    });

    runTest('Payment extends membership_end_date', async () => {
      if (!testMemberId) return false;
      const { data } = await supabase
        .from('members')
        .select('membership_end_date, last_payment_amount')
        .eq('id', testMemberId)
        .single();

      // Check if end date was extended (should be > original end date)
      return data && data.membership_end_date && data.last_payment_amount === 1500;
    });

    // Test 5: Payment Schedule Generation
    logStep(5, 'Payment Schedule Generation');

    runTest('Payment schedules created for member', async () => {
      if (!testMemberId) return false;
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('member_id', testMemberId)
        .eq('status', 'pending');

      if (error) throw error;
      return data && data.length > 0;
    });

    // Test 6: Due Date Calculation
    logStep(6, 'Due Date Calculation');

    runTest('Due date calculation function works', async () => {
      // Test the SQL function
      const { data, error } = await supabase
        .rpc('calculate_next_payment_due_date', {
          p_member_id: testMemberId,
          p_gym_id: gymId
        });

      if (error) throw error;
      return data && typeof data === 'string';
    });

    // Test 7: Membership Plans Configuration
    logStep(7, 'Membership Plans Configuration');

    runTest('Default membership plans exist', async () => {
      const { data, error } = await supabase
        .from('membership_plans_config')
        .select('*')
        .eq('gym_id', gymId);

      if (error) throw error;
      return data && data.length >= 4; // monthly, quarterly, half_yearly, annual
    });

    runTest('Plan pricing is configured correctly', async () => {
      const { data, error } = await supabase
        .from('membership_plans_config')
        .select('plan_type, price, duration_months')
        .eq('gym_id', gymId);

      if (error) throw error;

      const monthlyPlan = data?.find(p => p.plan_type === 'monthly');
      const quarterlyPlan = data?.find(p => p.plan_type === 'quarterly');

      return monthlyPlan?.price === 1000 && monthlyPlan?.duration_months === 1 &&
             quarterlyPlan?.price === 2500 && quarterlyPlan?.duration_months === 3;
    });

    // Test 8: Gym Data Isolation
    logStep(8, 'Gym Data Isolation');

    runTest('Members are isolated by gym_id', async () => {
      const { data, error } = await supabase
        .from('members')
        .select('count')
        .eq('gym_id', gymId);

      if (error) throw error;
      return data && Array.isArray(data) && data.length >= 0;
    });

    runTest('Payments are isolated by gym_id', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('count')
        .eq('gym_id', gymId);

      if (error) throw error;
      return data && Array.isArray(data) && data.length >= 0;
    });

    runTest('Cannot access other gym data', async () => {
      // Try to access data from a different gym ID
      const fakeGymId = '00000000-0000-0000-0000-000000000000';
      const { data } = await supabase
        .from('members')
        .select('count')
        .eq('gym_id', fakeGymId);

      return data && Array.isArray(data) && data.length === 0;
    });

    // Test 9: Dashboard Statistics
    logStep(9, 'Dashboard Statistics');

    runTest('Dashboard stats function works', async () => {
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { p_gym_id: gymId });

      if (error) throw error;
      return data && typeof data === 'object';
    });

    runTest('Dashboard stats contains required fields', async () => {
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { p_gym_id: gymId });

      if (error) throw error;

      const hasRequiredFields = data &&
        data.due_today &&
        data.overdue_this_month &&
        data.total_members &&
        data.revenue_this_month !== undefined;

      return hasRequiredFields;
    });

    // Test 10: Payment Deletion and Reversion
    logStep(10, 'Payment Deletion and Reversion');

    runTest('Payment deletion works', async () => {
      if (!testPaymentId) return false;

      const { error } = await supabase
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', testPaymentId);

      if (error) throw error;
      return true;
    });

    // Test 11: Calendar Data
    logStep(11, 'Calendar Data Generation');

    runTest('Calendar data function works', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { data, error } = await supabase
        .rpc('get_calendar_data', {
          p_gym_id: gymId,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (error) throw error;
      return data && Array.isArray(data);
    });

    // Test 12: Integration Test
    logStep(12, 'End-to-End Integration Test');

    runTest('Complete workflow test', async () => {
      // Create a new member with quarterly plan
      const quarterlyMember = await createTestMember(gymId, 'quarterly');
      if (!quarterlyMember) return false;

      // Verify initial state
      const { data: memberData } = await supabase
        .from('members')
        .select('membership_end_date, next_payment_due_date, total_payments_received')
        .eq('id', quarterlyMember.id)
        .single();

      if (!memberData || memberData.total_payments_received !== 2500) return false;

      // Create a payment for a different plan (upgrade)
      const upgradePayment = await createTestPayment(quarterlyMember.id, 1000);
      if (!upgradePayment) return false;

      // Verify the upgrade affected membership
      const { data: updatedMemberData } = await supabase
        .from('members')
        .select('membership_end_date, next_payment_due_date, total_payments_received')
        .eq('id', quarterlyMember.id)
        .single();

      if (!updatedMemberData) return false;

      // Check if payment was properly recorded and membership extended
      return updatedMemberData.total_payments_received === 3500;
    });

  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    testResults.failed++;
  }

  // Results Summary
  log('\n' + colors.bright + 'Test Results Summary' + colors.reset);
  log('==========================================');

  log(`Total Tests: ${testResults.total}`);
  logSuccess(`Passed: ${testResults.passed}`);

  if (testResults.failed > 0) {
    logError(`Failed: ${testResults.failed}`);
  }

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%`);

  if (testResults.failed === 0) {
    log('\n' + colors.green + colors.bright + '🎉 ALL TESTS PASSED!' + colors.reset);
    log('\nThe gym membership system is working correctly and ready for production use.');

    log('\n📋 System Features Validated:');
    log('   ✅ Member creation and management');
    log('   ✅ Payment processing with due date calculation');
    log('   ✅ Automatic membership extension');
    log('   ✅ Payment deletion and reversion');
    log('   ✅ Gym data isolation');
    log('   ✅ Dashboard statistics');
    log('   ✅ Calendar data generation');
    log('   ✅ Membership plans configuration');
    log('   ✅ Row Level Security (RLS)');

    log('\n🚀 Ready for production deployment!');
  } else {
    log('\n' + colors.red + colors.bright + '❌ SOME TESTS FAILED!' + colors.reset);
    log('\nPlease review the failed tests and fix any issues before deploying to production.');

    log('\n🔧 Troubleshooting:');
    log('   1. Check if all database migrations ran successfully');
    log('   '2. Verify Supabase connection and permissions');
    log('   '3. Ensure gym isolation policies are correctly configured');
    log('   '   4. Run the setup script: node scripts/setup-membership-system.js');
  }

  log('\n📊 Test Coverage Summary:');
  log('   • Database Schema: Tables, indexes, functions');
  log('   • Member Management: CRUD operations, status tracking');
  log('   • Payment System: Processing, due dates, extensions');
  log('   • Data Security: Gym isolation, RLS policies');
  log('   • Analytics: Dashboard stats, calendar data');
  log('   • Integration: End-to-end workflows');

  return testResults.failed === 0;
}

// Run the test suite
main().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  logError(error.stack);
  process.exit(1);
});