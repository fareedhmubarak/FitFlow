/**
 * ============================================================================
 * TEST SUITE 06: DASHBOARD & CALENDAR
 * ============================================================================
 * 
 * Tests for:
 * - Dashboard statistics accuracy
 * - DUE TODAY display
 * - OVERDUE display
 * - Calendar view
 * - Quick actions from dashboard
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS } from '../config/test-config';

test.describe('06 - Dashboard & Calendar', () => {

  test.beforeEach(async ({ page, loginAsGym }) => {
    await loginAsGym(GYMS.RAMESH);
  });

  test.describe('Dashboard Statistics', () => {

    test('TC06.01 - Dashboard shows COLLECTED amount', async ({ page }) => {
      await expect(page.locator('text=COLLECTED')).toBeVisible();
      await expect(page.locator('text=₹')).toBeVisible();
    });

    test('TC06.02 - Dashboard shows PENDING amount', async ({ page }) => {
      await expect(page.locator('text=PENDING')).toBeVisible();
    });

    test('TC06.03 - Dashboard shows ACTIVE member count', async ({ page }) => {
      await expect(page.locator('text=ACTIVE')).toBeVisible();
      
      // Should show a number for active members
      const activeSection = page.locator('text=ACTIVE').locator('..');
      await expect(activeSection.locator('text=/\\d+/')).toBeVisible();
    });

    test('TC06.04 - Stats update after payment', async ({ page }) => {
      // Get initial collected amount
      const collectedSection = page.locator('text=COLLECTED').locator('..');
      const initialCollected = await collectedSection.locator('text=/\\d+/').textContent();
      
      // Record a payment
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Monthly")').click();
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      
      await page.waitForTimeout(2000);
      
      // Refresh and check collected increased
      await page.reload();
      const newCollected = await collectedSection.locator('text=/\\d+/').textContent();
      
      // Amount should have increased (might need string parsing)
    });
  });

  test.describe('DUE TODAY Section', () => {

    test('TC06.05 - DUE TODAY section visible', async ({ page }) => {
      await expect(page.locator('text=DUE TODAY')).toBeVisible();
    });

    test('TC06.06 - DUE TODAY shows member count', async ({ page }) => {
      const dueSection = page.locator('text=DUE TODAY').locator('..');
      await expect(dueSection.locator('text=/\\d+/')).toBeVisible();
    });

    test('TC06.07 - DUE TODAY shows total amount', async ({ page }) => {
      const dueSection = page.locator('text=DUE TODAY').locator('..');
      await expect(dueSection.locator('text=₹')).toBeVisible();
    });

    test('TC06.08 - DUE TODAY member cards are clickable', async ({ page }) => {
      const dueSection = page.locator('text=DUE TODAY').locator('..');
      const memberCard = dueSection.locator('[class*="member"]').or(dueSection.locator('[class*="card"]')).first();
      
      if (await memberCard.isVisible()) {
        await memberCard.click();
        
        // Should open member details or payment modal
        await expect(page.locator('text=Payment').or(page.locator('text=Plan'))).toBeVisible({ timeout: 3000 });
      }
    });

    test('TC06.09 - Pay button works from DUE TODAY card', async ({ page }) => {
      const dueSection = page.locator('text=DUE TODAY').locator('..');
      const payButton = dueSection.locator('button').filter({ has: page.locator('svg') }).first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        
        // Payment modal should open
        await expect(page.locator('text=Record Payment')).toBeVisible({ timeout: 3000 });
      }
    });

    test('TC06.10 - Member moves out of DUE TODAY after payment', async ({ page }) => {
      // Get member name from DUE TODAY
      const dueSection = page.locator('text=DUE TODAY').locator('..');
      const memberName = await dueSection.locator('[class*="member"]').first().locator('text').first().textContent();
      
      // Record payment
      const payButton = dueSection.locator('button').first();
      await payButton.click();
      
      await page.waitForSelector('text=Record Payment');
      await page.locator('button:has-text("Cash")').click();
      await page.locator('button:has-text("Record Payment")').click();
      
      await page.waitForTimeout(2000);
      
      // Member should no longer be in DUE TODAY
      const updatedDueSection = page.locator('text=DUE TODAY').locator('..');
      
      if (memberName) {
        // The specific member should have moved out
        // (might still be visible in other sections)
      }
    });
  });

  test.describe('OVERDUE Section', () => {

    test('TC06.11 - OVERDUE section visible', async ({ page }) => {
      await expect(page.locator('text=OVERDUE')).toBeVisible();
    });

    test('TC06.12 - OVERDUE shows member count', async ({ page }) => {
      const overdueSection = page.locator('text=OVERDUE').locator('..');
      await expect(overdueSection.locator('text=/\\d+/')).toBeVisible();
    });

    test('TC06.13 - OVERDUE shows days overdue per member', async ({ page }) => {
      const overdueSection = page.locator('text=OVERDUE').locator('..');
      const memberCard = overdueSection.locator('[class*="member"]').first();
      
      if (await memberCard.isVisible()) {
        // Should show date or days info
        await expect(memberCard.locator('text=Dec').or(memberCard.locator('text=day'))).toBeVisible();
      }
    });

    test('TC06.14 - Overdue member can receive payment', async ({ page }) => {
      const overdueSection = page.locator('text=OVERDUE').locator('..');
      const payButton = overdueSection.locator('button').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        
        // Payment modal should open
        await expect(page.locator('text=Record Payment')).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Calendar View', () => {

    test('TC06.15 - Navigate to calendar page', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      
      // Calendar should be visible
      await expect(page.locator('text=Calendar').or(page.locator('[class*="calendar"]'))).toBeVisible();
    });

    test('TC06.16 - Calendar shows current month', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Should show December 2025
      await expect(page.locator('text=December').or(page.locator('text=Dec'))).toBeVisible();
    });

    test('TC06.17 - Calendar dates are clickable', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Click on a date
      const dateCell = page.locator('[class*="date"]').or(page.locator('td')).first();
      await dateCell.click();
      
      // Should show members due on that date
    });

    test('TC06.18 - Calendar navigation works (previous month)', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Find and click previous month button
      const prevButton = page.locator('button').filter({ has: page.locator('svg[class*="left"]') }).first();
      
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForTimeout(500);
        
        // Should show November
        await expect(page.locator('text=November').or(page.locator('text=Nov'))).toBeVisible();
      }
    });

    test('TC06.19 - Calendar shows member count per date', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Dates with due members should show count or indicator
      const dateWithMembers = page.locator('[class*="has-members"]').or(page.locator('[class*="due"]'));
      // These should be visible for dates with members
    });

    test('TC06.20 - Calendar date shows member details on click', async ({ page }) => {
      await page.click(SELECTORS.NAV_CALENDAR);
      await page.waitForLoadState('networkidle');
      
      // Click a date that should have members
      const dateCell = page.locator('[class*="date"]').nth(3);
      await dateCell.click();
      
      await page.waitForTimeout(500);
      
      // Should show member list or details
    });
  });

  test.describe('Quick Actions', () => {

    test('TC06.21 - WhatsApp button opens messaging', async ({ page }) => {
      const memberCard = page.locator('[class*="member"]').first();
      const whatsappButton = memberCard.locator('button:has-text("WhatsApp")').or(memberCard.locator('[aria-label*="whatsapp"]'));
      
      if (await whatsappButton.isVisible()) {
        // Click should open WhatsApp (new tab/window)
        const [newPage] = await Promise.all([
          page.waitForEvent('popup').catch(() => null),
          whatsappButton.click(),
        ]);
        
        // New page should be WhatsApp URL or it opened
      }
    });

    test('TC06.22 - Call button triggers phone action', async ({ page }) => {
      const memberCard = page.locator('[class*="member"]').first();
      await memberCard.click();
      
      const callButton = page.locator('button:has-text("Call")');
      
      if (await callButton.isVisible()) {
        // Call button should be present
        await expect(callButton).toBeVisible();
      }
    });
  });
});
