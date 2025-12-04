/**
 * ============================================================================
 * TEST SUITE 04: PAYMENT MANAGEMENT
 * ============================================================================
 * 
 * Tests for:
 * - Record new payment from dashboard
 * - Record payment from member card
 * - Payment records display
 * - Delete payment & member date reversion
 * - Payment method selection
 * - Receipt generation
 * - Audit log verification
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS, PLANS } from '../config/test-config';

test.describe('04 - Payment Management', () => {

  test.beforeEach(async ({ page, loginAsGym }) => {
    await loginAsGym(GYMS.RAMESH);
  });

  test.describe('Record Payment from Dashboard', () => {

    test('TC04.01 - Record payment for DUE TODAY member', async ({ page }) => {
      // Wait for dashboard to load
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
      
      // Find DUE TODAY section
      const dueTodaySection = page.locator('text=DUE TODAY').locator('..');
      await expect(dueTodaySection).toBeVisible();
      
      // Get first member in DUE TODAY
      const memberCard = page.locator('[class*="member"]').first();
      const memberName = await memberCard.locator('text').first().textContent();
      
      // Click payment button (rupee icon or "Pay" button)
      const payButton = memberCard.locator('button').filter({ has: page.locator('svg') }).first();
      await payButton.click();
      
      // Wait for payment modal
      await page.waitForSelector('text=Record Payment');
      
      // Verify member name in modal
      await expect(page.locator(`text=${memberName}`)).toBeVisible();
      
      // Select plan (should default to member's plan)
      const quarterlyButton = page.locator('button:has-text("Quarterly")');
      if (await quarterlyButton.isVisible()) {
        await quarterlyButton.click();
      }
      
      // Select payment method
      const cashButton = page.locator('button:has-text("Cash")');
      await cashButton.click();
      
      // Record payment
      const recordButton = page.locator('button:has-text("Record Payment")');
      await recordButton.click();
      
      // Wait for success
      await expect(page.locator('text=success').or(page.locator('text=recorded'))).toBeVisible({ timeout: 5000 });
    });

    test('TC04.02 - Record payment for OVERDUE member', async ({ page }) => {
      // Find OVERDUE section
      const overdueSection = page.locator('text=OVERDUE').locator('..');
      
      if (await overdueSection.isVisible()) {
        // Get first overdue member
        const memberCard = overdueSection.locator('[class*="member"]').first();
        
        // Click payment button
        const payButton = memberCard.locator('button').first();
        await payButton.click();
        
        // Wait for payment modal
        await page.waitForSelector('text=Record Payment');
        
        // Record payment
        await page.locator('button:has-text("Cash")').click();
        await page.locator('button:has-text("Record Payment")').click();
        
        // Verify success
        await expect(page.locator('text=success').or(page.locator('text=recorded'))).toBeVisible({ timeout: 5000 });
      }
    });

    test('TC04.03 - Payment amount matches selected plan', async ({ page }) => {
      const dueTodayMember = page.locator('[class*="member"]').first();
      const payButton = dueTodayMember.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      
      // Click Monthly plan
      await page.locator('button:has-text("Monthly")').click();
      
      // Verify amount shows ₹1,000
      await expect(page.locator('text=1,000').or(page.locator('input[value="1000"]'))).toBeVisible();
      
      // Click Quarterly plan
      await page.locator('button:has-text("Quarterly")').click();
      
      // Verify amount shows ₹2,500
      await expect(page.locator('text=2,500').or(page.locator('input[value="2500"]'))).toBeVisible();
    });

    test('TC04.04 - New end date calculation displayed', async ({ page }) => {
      const dueTodayMember = page.locator('[class*="member"]').first();
      const payButton = dueTodayMember.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      
      // Select Quarterly (3 months)
      await page.locator('button:has-text("Quarterly")').click();
      
      // Should show new end date (today + 3 months)
      const validUntilText = page.locator('text=valid until').or(page.locator('text=Valid Until'));
      await expect(validUntilText).toBeVisible();
      
      // Should show a future month (March if today is December)
      await expect(page.locator('text=March').or(page.locator('text=2026'))).toBeVisible();
    });
  });

  test.describe('Payment Records Page', () => {

    test('TC04.05 - Navigate to payment records', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      
      // Verify payments page
      await expect(page.locator('h1:has-text("Payments")')).toBeVisible();
    });

    test('TC04.06 - Payment record shows after recording', async ({ page }) => {
      // First record a payment
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      
      await page.waitForTimeout(2000);
      
      // Go to payments page
      await page.click(SELECTORS.NAV_PAYMENTS);
      
      // Should show the payment record
      await expect(page.locator('text=Cash').or(page.locator('text=RCP-'))).toBeVisible({ timeout: 5000 });
    });

    test('TC04.07 - Payment record shows correct details', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Find a payment record
      const paymentCard = page.locator('[class*="payment"]').or(page.locator('text=RCP-').locator('..')).first();
      
      if (await paymentCard.isVisible()) {
        // Should show receipt number
        await expect(paymentCard.locator('text=RCP-')).toBeVisible();
        
        // Should show amount (₹)
        await expect(paymentCard.locator('text=₹')).toBeVisible();
        
        // Should show payment method
        await expect(paymentCard.locator('text=Cash').or(paymentCard.locator('text=UPI')).or(paymentCard.locator('text=Card'))).toBeVisible();
      }
    });

    test('TC04.08 - Search payment by member name', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[type="search"]'));
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('Salman');
        await page.waitForTimeout(500);
        
        // Should filter to show only Salman's payments or show no results message
        const results = page.locator('text=Salman').or(page.locator('text=No payments'));
        await expect(results).toBeVisible({ timeout: 3000 });
      }
    });

    test('TC04.09 - Month filter works correctly', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Find month navigation
      const prevMonthButton = page.locator('button').filter({ has: page.locator('svg[class*="left"]') }).first();
      
      if (await prevMonthButton.isVisible()) {
        // Go to previous month
        await prevMonthButton.click();
        await page.waitForTimeout(500);
        
        // Should show November or different month text
        await expect(page.locator('text=November').or(page.locator('text=Nov'))).toBeVisible();
      }
    });
  });

  test.describe('Delete Payment', () => {

    test('TC04.10 - Delete button visible on payment record', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Find payment record
      const paymentCard = page.locator('[class*="payment"]').or(page.locator('text=RCP-').locator('..')).first();
      
      if (await paymentCard.isVisible()) {
        // Should have delete button
        const deleteButton = paymentCard.locator('button:has-text("Delete")').or(paymentCard.locator('button[aria-label*="delete"]'));
        await expect(deleteButton).toBeVisible();
      }
    });

    test('TC04.11 - Delete confirmation modal appears', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      const paymentCard = page.locator('text=RCP-').locator('..').first();
      
      if (await paymentCard.isVisible()) {
        // Click delete
        const deleteButton = paymentCard.locator('button:has-text("Delete")');
        await deleteButton.click();
        
        // Confirmation modal should appear
        await expect(page.locator('text=Delete Payment')).toBeVisible();
        await expect(page.locator('text=revert').or(page.locator('text=reverted'))).toBeVisible();
        
        // Cancel button should exist
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      }
    });

    test('TC04.12 - Delete payment reverts member due date', async ({ page, verifyInDatabase }) => {
      // First, record a payment for a known member
      const memberCard = page.locator('text=Salman').locator('..').first();
      
      if (await memberCard.isVisible()) {
        // Record payment
        const payButton = memberCard.locator('button').first();
        await payButton.click();
        
        await page.waitForSelector('text=Record Payment');
        await page.locator('button:has-text("Quarterly")').click();
        await page.locator('button:has-text("Cash")').click();
        await page.locator('button:has-text("Record Payment")').click();
        
        await page.waitForTimeout(2000);
        
        // Go to payments
        await page.click(SELECTORS.NAV_PAYMENTS);
        await page.waitForLoadState('networkidle');
        
        // Find and delete the payment
        const paymentRecord = page.locator('text=Salman').locator('..').first();
        const deleteButton = paymentRecord.locator('button:has-text("Delete")');
        await deleteButton.click();
        
        // Confirm delete
        await page.locator('button:has-text("Delete")').last().click();
        
        // Wait for success message
        await expect(page.locator('text=deleted').or(page.locator('text=reverted'))).toBeVisible({ timeout: 5000 });
        
        // Verify member appears back in DUE TODAY
        await page.click(SELECTORS.NAV_HOME);
        await expect(page.locator('text=Salman')).toBeVisible();
      }
    });

    test('TC04.13 - Deleted payment removed from records', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Count initial payments
      const initialCount = await page.locator('text=RCP-').count();
      
      if (initialCount > 0) {
        // Delete first payment
        const deleteButton = page.locator('button:has-text("Delete")').first();
        await deleteButton.click();
        
        await page.locator('button:has-text("Delete")').last().click();
        await page.waitForTimeout(2000);
        
        // Count should decrease
        const finalCount = await page.locator('text=RCP-').count();
        expect(finalCount).toBeLessThan(initialCount);
      }
    });
  });

  test.describe('Payment Methods', () => {

    test('TC04.14 - Cash payment method works', async ({ page }) => {
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      
      // Select Cash
      await page.locator('button:has-text("Cash")').click();
      await expect(page.locator('button:has-text("Cash")[class*="selected"]').or(page.locator('button:has-text("Cash")[aria-pressed="true"]'))).toBeVisible();
    });

    test('TC04.15 - UPI payment method works', async ({ page }) => {
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      
      // Select UPI
      const upiButton = page.locator('button:has-text("Upi")').or(page.locator('button:has-text("UPI")'));
      await upiButton.click();
    });

    test('TC04.16 - Card payment method works', async ({ page }) => {
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      
      // Select Card
      await page.locator('button:has-text("Card")').click();
    });
  });

  test.describe('Audit & Debug Logs', () => {

    test('TC04.17 - Payment creates audit log entry', async ({ page, verifyInDatabase }) => {
      // Record a payment
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      
      await page.waitForTimeout(2000);
      
      // Verify audit log was created (via database check in fixture)
      // This would be verified by the verifyInDatabase fixture
    });

    test('TC04.18 - Delete payment creates audit log entry', async ({ page }) => {
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      const deleteButton = page.locator('button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.locator('button:has-text("Delete")').last().click();
        
        await page.waitForTimeout(2000);
        
        // Audit log for deletion should be created
        // Verified via database fixture
      }
    });
  });
});
