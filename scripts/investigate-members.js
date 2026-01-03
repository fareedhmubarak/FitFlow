// Script to investigate member payment history
// Run with: node scripts/investigate-members.js

const SUPABASE_URL = 'https://dbtdarmxvgbxeinwcxka.supabase.co';
// You'll need to provide the anon key when running
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'PASTE_KEY_HERE';

async function fetchData(table, filters = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  
  // Add filters
  for (const [key, value] of Object.entries(filters)) {
    url += `&${key}=eq.${value}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

async function investigateMember(memberName) {
  console.log(`\n=== Investigating: ${memberName} ===\n`);
  
  try {
    // 1. Find member
    const members = await fetchData('gym_members', { full_name: memberName });
    
    if (members.length === 0) {
      console.log(`❌ Member not found: ${memberName}`);
      return;
    }
    
    const member = members[0];
    console.log('📋 Member Details:');
    console.log(`   - ID: ${member.id}`);
    console.log(`   - Phone: ${member.phone}`);
    console.log(`   - Plan: ${member.membership_plan}`);
    console.log(`   - Plan Amount: ₹${member.plan_amount}`);
    console.log(`   - Joining Date: ${member.joining_date}`);
    console.log(`   - Membership End: ${member.membership_end_date}`);
    console.log(`   - Next Due Date: ${member.next_payment_due_date}`);
    console.log(`   - Status: ${member.status}`);
    console.log(`   - Plan ID: ${member.plan_id}`);
    
    // 2. Fetch plan details if plan_id exists
    if (member.plan_id) {
      const plans = await fetchData('gym_membership_plans', { id: member.plan_id });
      if (plans.length > 0) {
        const plan = plans[0];
        console.log('\n💎 Plan Details:');
        console.log(`   - Name: ${plan.name}`);
        console.log(`   - Base Duration: ${plan.base_duration_months || plan.duration_months} months`);
        console.log(`   - Bonus Duration: ${plan.bonus_duration_months || 0} months`);
        console.log(`   - Total Duration: ${(plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0)} months`);
        console.log(`   - Price: ₹${plan.price}`);
      }
    }
    
    // 3. Fetch payment history
    const payments = await fetchData('gym_payments', { member_id: member.id });
    console.log(`\n💰 Payment History (${payments.length} payments):`);
    
    payments
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
      .forEach((payment, index) => {
        console.log(`   ${index + 1}. Date: ${payment.payment_date} | Amount: ₹${payment.amount} | Due: ${payment.due_date} | Method: ${payment.payment_method}`);
        if (payment.notes) console.log(`      Notes: ${payment.notes}`);
      });
    
    // 4. Calculate expected dates
    console.log('\n🔍 Expected Calculation:');
    if (member.plan_id && payments.length > 0) {
      const plans = await fetchData('gym_membership_plans', { id: member.plan_id });
      if (plans.length > 0) {
        const plan = plans[0];
        const totalMonths = (plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0);
        const joiningDate = new Date(member.joining_date);
        
        console.log(`   Starting from: ${member.joining_date}`);
        console.log(`   Plan total months: ${totalMonths}`);
        
        payments
          .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
          .forEach((payment, index) => {
            const expectedDue = new Date(joiningDate);
            expectedDue.setMonth(expectedDue.getMonth() + (totalMonths * (index + 1)));
            console.log(`   After payment ${index + 1}: Expected Due = ${expectedDue.toISOString().split('T')[0]}`);
          });
      }
    }
    
  } catch (error) {
    console.error(`Error investigating ${memberName}:`, error.message);
  }
}

async function main() {
  console.log('🔍 FitFlow Member Investigation Script');
  console.log('======================================');
  
  // Investigate both members
  await investigateMember('Ravi');
  await investigateMember('Pandira');
}

main().catch(console.error);
