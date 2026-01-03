// Investigation helper - paste this into browser console when app is running
// Make sure you're logged in to production database

async function investigateMember(memberName) {
  console.log(`\n=== Investigating: ${memberName} ===\n`);
  
  try {
    // @ts-ignore - supabase is available globally or import it
    const { supabase } = await import('/src/lib/supabase.ts');
    
    // 1. Find member by name
    const { data: members, error: memberError } = await supabase
      .from('gym_members')
      .select('*')
      .ilike('full_name', `%${memberName}%`);
    
    if (memberError) throw memberError;
    if (!members || members.length === 0) {
      console.log(`❌ Member not found: ${memberName}`);
      return;
    }
    
    const member = members[0];
    console.log('📋 Member Details:');
    console.table({
      'ID': member.id,
      'Full Name': member.full_name,
      'Phone': member.phone,
      'Plan': member.membership_plan,
      'Plan Amount': `₹${member.plan_amount}`,
      'Joining Date': member.joining_date,
      'Membership End': member.membership_end_date,
      'Next Due Date': member.next_payment_due_date,
      'Status': member.status,
      'Plan ID': member.plan_id
    });
    
    // 2. Fetch plan details if plan_id exists
    if (member.plan_id) {
      const { data: plans } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('id', member.plan_id);
      
      if (plans && plans.length > 0) {
        const plan = plans[0];
        const totalMonths = (plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0);
        console.log('\n💎 Plan Details:');
        console.table({
          'Name': plan.name,
          'Base Duration': `${plan.base_duration_months || plan.duration_months} months`,
          'Bonus Duration': `${plan.bonus_duration_months || 0} months`,
          'Total Duration': `${totalMonths} months`,
          'Price': `₹${plan.price}`
        });
      }
    }
    
    // 3. Fetch payment history
    const { data: payments } = await supabase
      .from('gym_payments')
      .select('*')
      .eq('member_id', member.id)
      .order('payment_date', { ascending: true });
    
    console.log(`\n💰 Payment History (${payments?.length || 0} payments):`);
    if (payments && payments.length > 0) {
      console.table(payments.map((p, i) => ({
        '#': i + 1,
        'Payment Date': p.payment_date,
        'Amount': `₹${p.amount}`,
        'Due Date': p.due_date,
        'Method': p.payment_method,
        'Notes': p.notes || '-'
      })));
    }
    
    // 4. Calculate expected dates
    if (member.plan_id && payments && payments.length > 0) {
      const { data: plans } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('id', member.plan_id);
      
      if (plans && plans.length > 0) {
        const plan = plans[0];
        const totalMonths = (plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0);
        
        console.log('\n🔍 Expected vs Actual Calculation:');
        console.log(`   Starting from: ${member.joining_date}`);
        console.log(`   Plan total months: ${totalMonths}`);
        
        const joiningDate = new Date(member.joining_date);
        const calculations = payments.map((payment, index) => {
          const expectedDue = new Date(joiningDate);
          expected Due.setMonth(expectedDue.getMonth() + (totalMonths * (index + 1)));
          
          return {
            'Payment #': index + 1,
            'Payment Date': payment.payment_date,
            'Expected Due': expectedDue.toISOString().split('T')[0],
            'Actual Due (DB)': index === payments.length - 1 ? member.next_payment_due_date : 'N/A'
          };
        });
        
        console.table(calculations);
        
        // Highlight discrepancy
        const lastPayment = calculations[calculations.length - 1];
        if (lastPayment['Expected Due'] !== lastPayment['Actual Due (DB)']) {
          console.log(`\n⚠️ DISCREPANCY FOUND!`);
          console.log(`   Expected: ${lastPayment['Expected Due']}`);
          console.log(`   Actual: ${lastPayment['Actual Due (DB)']}`);
        } else {
          console.log(`\n✅ Dates match correctly!`);
        }
      }
    }
    
  } catch (error) {
    console.error(`Error investigating ${memberName}:`, error);
  }
}

// Run for both members
console.log('🔍 FitFlow Member Investigation');
console.log('================================');
console.log('Copy-paste this into browser console while app is running');
console.log('\nTo investigate:');
console.log('  investigateMember("Ravi")');
console.log('  investigateMember("Pandira")');
console.log('\nOr run both:');
console.log('  await investigateMember("Ravi"); await investigateMember("Pandira");');
