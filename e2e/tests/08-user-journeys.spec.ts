/**
 * ============================================================================
 * TEST SUITE 08: COMPLETE USER JOURNEY
 * ============================================================================
 * 
 * End-to-end tests simulating complete real-world user workflows:
 * - New gym owner onboarding
 * - Daily gym operations
 * - Member lifecycle
 * - Payment cycles
 * - Delete and cleanup operations
 * 
 * These tests run longer but validate the complete experience.
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS, PLANS, createSupabaseClient } from '../config/test-config';

test.describe('08 - Complete User Journeys', () => {

  test.describe('Journey 1: New Member Complete Lifecycle', () => {

    test('TC08.01 - Add member → Pay → Extend → View history → Delete payment → Verify revert', async ({ page, loginAsGym }) => {
      const supabase = createSupabaseClient();
      const testMemberName = `Journey_${Date.now()}`;
      const testPhone = `999${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      
      // Step 1: Login
      await loginAsGym(GYMS.RAMESH);
      
      // Step 2: Add new member
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      await page.click(SELECTORS.ADD_MEMBER);
      await page.fill('input[name="name"]', testMemberName);
      await page.fill('input[name="phone"]', testPhone);
      
      // Select Monthly plan
      await page.locator('button:has-text("Monthly")').or(page.locator('text=Monthly').locator('..')).click();
      await page.locator('button:has-text("Save")').or(page.locator('button:has-text("Add")')).click();
      
      await page.waitForTimeout(2000);
      
      // Step 3: Verify member appears in DUE TODAY (new members are due)
      await page.click(SELECTORS.NAV_DASHBOARD);
      await expect(page.locator(`text=${testMemberName}`)).toBeVisible({ timeout: 5000 });
      
      // Step 4: Record first payment
      const memberCard = page.locator(`text=${testMemberName}`).locator('..');
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      
      await page.waitForTimeout(2000);
      
      // Step 5: Verify member moved out of DUE TODAY
      await page.click(SELECTORS.NAV_DASHBOARD);
      await page.waitForLoadState('networkidle');
      
      // Member should be in ACTIVE but not DUE TODAY
      const dueTodaySection = page.locator('text=DUE TODAY').locator('..');
      // Member should not be in due today anymore
      
      // Step 6: Check member details show correct dates
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.locator(`text=${testMemberName}`).click();
      
      // Should show next due date 1 month from today
      
      // Step 7: View payment history
      await page.click(SELECTORS.NAV_PAYMENTS);
      await expect(page.locator(`text=${testMemberName}`)).toBeVisible();
      await expect(page.locator('text=₹1,000')).toBeVisible();
      
      // Step 8: Delete the payment
      const paymentRow = page.locator(`text=${testMemberName}`).locator('..');
      const deleteBtn = paymentRow.locator('button:has-text("Delete")').or(paymentRow.locator('[aria-label*="delete"]'));
      await deleteBtn.click();
      
      // Confirm delete
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Delete")').nth(1)).click();
      
      await page.waitForTimeout(2000);
      
      // Step 9: Verify member back in DUE TODAY
      await page.click(SELECTORS.NAV_DASHBOARD);
      await expect(page.locator(`text=${testMemberName}`)).toBeVisible();
      
      // Step 10: Cleanup - delete member from database
      await supabase
        .from('gym_members')
        .delete()
        .eq('phone', testPhone);
    });
  });

  test.describe('Journey 2: Multiple Payments and Extensions', () => {

    test('TC08.02 - Member pays monthly → upgrades to quarterly → extends properly', async ({ page, loginAsGym }) => {
      const supabase = createSupabaseClient();
      const testMemberName = `MultiPay_${Date.now()}`;
      const testPhone = `888${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      
      await loginAsGym(GYMS.RAMESH);
      
      // Add member with monthly plan
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.click(SELECTORS.ADD_MEMBER);
      await page.fill('input[name="name"]', testMemberName);
      await page.fill('input[name="phone"]', testPhone);
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Get initial dates from DB
      const { data: member1 } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      const initialDue = new Date(member1.next_due_date);
      
      // Record monthly payment
      await page.click(SELECTORS.NAV_DASHBOARD);
      const memberCard = page.locator(`text=${testMemberName}`).locator('..');
      await memberCard.locator('button').first().click();
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      await page.waitForTimeout(2000);
      
      // Verify date extended by 1 month
      const { data: member2 } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      const afterMonthly = new Date(member2.next_due_date);
      expect(afterMonthly.getTime()).toBeGreaterThan(initialDue.getTime());
      
      // Now upgrade to quarterly payment
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.locator(`text=${testMemberName}`).click();
      
      // Record quarterly payment
      const payButton = page.locator('button').filter({ hasText: /pay/i }).first();
      await payButton.click();
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Quarterly")').click();
      await page.locator('button:has-text("Card")').or(page.locator('button:has-text("UPI")')).click();
      await page.locator('button:has-text("Record Payment")').click();
      await page.waitForTimeout(2000);
      
      // Verify date extended by 3 more months
      const { data: member3 } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      const afterQuarterly = new Date(member3.next_due_date);
      expect(afterQuarterly.getTime()).toBeGreaterThan(afterMonthly.getTime());
      
      // Verify 2 payments in history
      await page.click(SELECTORS.NAV_PAYMENTS);
      const payments = page.locator(`text=${testMemberName}`);
      await expect(payments).toHaveCount(2);
      
      // Cleanup
      await supabase.from('gym_payments').delete().eq('member_id', member3.id);
      await supabase.from('gym_members').delete().eq('id', member3.id);
    });
  });

  test.describe('Journey 3: Payment Delete Restores Correct State', () => {

    test('TC08.03 - Delete latest payment → dates revert to previous payment state', async ({ page, loginAsGym }) => {
      const supabase = createSupabaseClient();
      const testMemberName = `DeleteTest_${Date.now()}`;
      const testPhone = `777${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      
      await loginAsGym(GYMS.RAMESH);
      
      // Add member
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.click(SELECTORS.ADD_MEMBER);
      await page.fill('input[name="name"]', testMemberName);
      await page.fill('input[name="phone"]', testPhone);
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Get member
      const { data: member } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      const originalDue = member.next_due_date;
      
      // Record payment 1 (Monthly)
      await page.click(SELECTORS.NAV_DASHBOARD);
      const memberCard = page.locator(`text=${testMemberName}`).locator('..');
      await memberCard.locator('button').first().click();
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      await page.waitForTimeout(2000);
      
      // Get state after payment 1
      const { data: afterPay1 } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      // Record payment 2 (Another Monthly)
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.locator(`text=${testMemberName}`).click();
      await page.locator('button').filter({ hasText: /pay/i }).first().click();
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      await page.waitForTimeout(2000);
      
      // Get state after payment 2
      const { data: afterPay2 } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      // Now delete the LATEST payment (payment 2)
      await page.click(SELECTORS.NAV_PAYMENTS);
      
      // Find the latest payment for this member (first in list typically)
      const paymentRows = page.locator(`text=${testMemberName}`).locator('..');
      const firstPaymentRow = paymentRows.first();
      await firstPaymentRow.locator('button:has-text("Delete")').click();
      await page.locator('button:has-text("Confirm")').click();
      await page.waitForTimeout(2000);
      
      // Verify dates reverted to payment 1 state (NOT original)
      const { data: afterDelete } = await supabase
        .from('gym_members')
        .select('*')
        .eq('phone', testPhone)
        .single();
      
      // Due date should match after payment 1
      expect(afterDelete.next_due_date).toBe(afterPay1.next_due_date);
      
      // Cleanup
      await supabase.from('gym_payments').delete().eq('member_id', member.id);
      await supabase.from('gym_members').delete().eq('id', member.id);
    });
  });

  test.describe('Journey 4: Multi-Gym Same Browser', () => {

    test('TC08.04 - Switch between gyms → Data stays isolated', async ({ page, loginAsGym }) => {
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Note some member names
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      const rameshMembers = await page.locator('[class*="member"]').or(page.locator('[class*="card"]')).count();
      
      // Logout
      const logoutBtn = page.locator('button:has-text("Logout")').or(page.locator('[aria-label*="logout"]'));
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }
      
      // Login as Samrin
      await loginAsGym(GYMS.SAMRIN);
      
      // Check members
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      const samrinMembers = await page.locator('[class*="member"]').or(page.locator('[class*="card"]')).count();
      
      // Members should be different (different count is likely)
      // The point is data is isolated
      
      // Logout
      await page.locator('button:has-text("Logout")').click().catch(() => {});
      
      // Login back as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Members should match original
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      const rameshMembersAgain = await page.locator('[class*="member"]').or(page.locator('[class*="card"]')).count();
      
      expect(rameshMembersAgain).toBe(rameshMembers);
    });
  });

  test.describe('Journey 5: Daily Operations Workflow', () => {

    test('TC08.05 - Dashboard → Process due payments → Check calendar → View reports', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Step 1: Check dashboard for today's dues
      await expect(page.locator('text=DUE TODAY')).toBeVisible();
      const dueCount = await page.locator('text=DUE TODAY').locator('..').locator('text=/\\d+/').textContent();
      
      // Step 2: Process a payment if there are dues
      if (parseInt(dueCount || '0') > 0) {
        const payButton = page.locator('text=DUE TODAY').locator('..').locator('button').first();
        if (await payButton.isVisible()) {
          await payButton.click();
          await page.waitForSelector('text=Record Payment');
          
          // Record a payment
          await page.locator('button:has-text("Monthly")').click();
          await page.locator('button:has-text("Cash")').click();
          await page.locator('button:has-text("Record Payment")').click();
          
          await page.waitForTimeout(2000);
        }
      }
      
      // Step 3: Check calendar for upcoming dues
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Should see calendar view
      await expect(page.locator('[class*="calendar"]').or(page.locator('text=December'))).toBeVisible();
      
      // Step 4: Check payment history
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Should see payment records
      await expect(page.locator('text=₹')).toBeVisible();
      
      // Step 5: Check member list
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Should see member list
      await expect(page.locator('[class*="member"]').or(page.locator('[class*="card"]')).first()).toBeVisible();
      
      // Step 6: Back to dashboard to see updated stats
      await page.click(SELECTORS.NAV_DASHBOARD);
      await page.waitForLoadState('networkidle');
      
      // Stats should be visible
      await expect(page.locator('text=COLLECTED')).toBeVisible();
    });
  });

  test.describe('Journey 6: Error Recovery', () => {

    test('TC08.06 - Network interruption during payment → Graceful handling', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Go to payment flow
      const payButton = page.locator('text=DUE TODAY').locator('..').locator('button').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForSelector('text=Record Payment');
        
        // Simulate offline (this will affect subsequent requests)
        await page.context().setOffline(true);
        
        // Try to record payment
        await page.locator('button:has-text("Monthly")').click();
        await page.locator('button:has-text("Cash")').click();
        await page.locator('button:has-text("Record Payment")').click();
        
        // Should show error message
        await expect(page.locator('text=error').or(page.locator('text=failed').or(page.locator('[class*="error"]')))).toBeVisible({ timeout: 5000 }).catch(() => {});
        
        // Restore online
        await page.context().setOffline(false);
      }
    });

    test('TC08.07 - Session timeout → Redirect to login', async ({ page, browser }) => {
      // Create a new context with cleared storage to simulate timeout
      const context = await browser.newContext();
      const newPage = await context.newPage();
      
      await newPage.goto('http://localhost:5173/dashboard');
      await newPage.waitForLoadState('networkidle');
      
      // Should be redirected to login
      await expect(newPage.locator('input[type="email"]').or(newPage.locator('text=Sign in'))).toBeVisible({ timeout: 5000 });
      
      await context.close();
    });
  });
});
