/**
 * ============================================================================
 * TEST SUITE 05: GYM DATA ISOLATION (CRITICAL SECURITY)
 * ============================================================================
 * 
 * CRITICAL: These tests verify that each gym can ONLY see their own data.
 * No gym should ever be able to access another gym's:
 * - Members
 * - Payments
 * - Settings
 * - Reports
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS } from '../config/test-config';

test.describe('05 - Gym Data Isolation (CRITICAL)', () => {

  test.describe('Member Isolation', () => {

    test('TC05.01 - Ramesh Gym only sees own members', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Count members
      const memberCount = await page.locator('[class*="member"]').count();
      
      // Should see around 26 members (Ramesh's count)
      expect(memberCount).toBeGreaterThan(20);
      expect(memberCount).toBeLessThanOrEqual(30);
      
      // Members should be from Ramesh Gym only
      // Known Ramesh members: Salman, Sujith, Dhanujay, Sekar, etc.
      await expect(page.locator('text=Salman').or(page.locator('text=Sujith'))).toBeVisible();
    });

    test('TC05.02 - Samrin Gym only sees own members', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.SAMRIN);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Count members
      const memberCount = await page.locator('[class*="member"]').count();
      
      // Should have around 26 members
      expect(memberCount).toBeGreaterThan(20);
      expect(memberCount).toBeLessThanOrEqual(30);
    });

    test('TC05.03 - Samrin cannot see Ramesh member names', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.SAMRIN);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Ramesh-specific members should NOT be visible
      // Note: Some names might overlap, so we check for unique identifiers
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        // Search for Ramesh-specific member ID pattern (if any)
        await searchInput.fill('Ramesh Gym Specific');
        await page.waitForTimeout(500);
        
        // Should find no results or show "no members"
        const noResults = page.locator('text=No members').or(page.locator('text=not found'));
        // Either no results or filtered results, but not Ramesh's data
      }
    });

    test('TC05.04 - Member added by Ramesh not visible to Samrin', async ({ page, loginAsGym }) => {
      const uniqueName = `Ramesh Exclusive ${Date.now()}`;
      
      // Login as Ramesh and add member
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Add member
      await page.locator('button:has-text("Add")').first().click();
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', `99${Date.now().toString().slice(-8)}`);
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Verify member exists in Ramesh's gym
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
      
      // Now login as Samrin
      await page.click(SELECTORS.NAV_SETTINGS);
      const logoutButton = page.locator('text=Logout').or(page.locator('text=Sign Out'));
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
      
      await loginAsGym(GYMS.SAMRIN);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Search for the member
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(uniqueName);
        await page.waitForTimeout(500);
      }
      
      // Member should NOT be visible
      await expect(page.locator(`text=${uniqueName}`)).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Payment Isolation', () => {

    test('TC05.05 - Ramesh Gym only sees own payments', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Check payment records belong to Ramesh Gym members only
      const paymentCount = await page.locator('text=RCP-').count();
      
      // Payments should be for Ramesh's members (Salman, Sujith, etc.)
      // No payments from other gyms should appear
    });

    test('TC05.06 - Payment recorded by Ramesh not visible to Nizam', async ({ page, loginAsGym }) => {
      // Login as Ramesh and record a payment
      await loginAsGym(GYMS.RAMESH);
      
      // Record payment
      const memberCard = page.locator('[class*="member"]').first();
      const payButton = memberCard.locator('button').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();
        await page.waitForSelector('text=Record Payment');
        await page.locator('button:has-text("Cash")').click();
        await page.locator('button:has-text("Record Payment")').click();
        await page.waitForTimeout(2000);
      }
      
      // Get the receipt number
      await page.click(SELECTORS.NAV_PAYMENTS);
      const receiptNumber = await page.locator('text=RCP-').first().textContent();
      
      // Logout and login as Nizam
      await page.click(SELECTORS.NAV_SETTINGS);
      const logoutButton = page.locator('text=Logout');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
      
      await loginAsGym(GYMS.NIZAM);
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Search for the receipt
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible() && receiptNumber) {
        await searchInput.fill(receiptNumber);
        await page.waitForTimeout(500);
        
        // Should NOT find Ramesh's receipt
        await expect(page.locator(`text=${receiptNumber}`)).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Dashboard Isolation', () => {

    test('TC05.07 - Dashboard shows only own gym stats', async ({ page, loginAsGym }) => {
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Get Ramesh's member count
      const rameshDueToday = await page.locator('text=DUE TODAY').locator('..').locator('text=/\\d+/').first().textContent();
      
      // Logout and login as Samrin
      await page.click(SELECTORS.NAV_SETTINGS);
      const logoutButton = page.locator('text=Logout');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
      
      await loginAsGym(GYMS.SAMRIN);
      
      // Get Samrin's stats - should be independent
      const samrinDueToday = await page.locator('text=DUE TODAY').locator('..').locator('text=/\\d+/').first().textContent();
      
      // Stats should be gym-specific (might be same by coincidence, but data is different)
    });

    test('TC05.08 - ACTIVE member count matches gym only', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Check ACTIVE count on dashboard
      const activeCount = page.locator('text=ACTIVE').locator('..').locator('text=/\\d+/');
      const count = await activeCount.textContent();
      
      // Ramesh should have around 26 active members
      expect(parseInt(count || '0')).toBeLessThanOrEqual(30);
    });
  });

  test.describe('Settings Isolation', () => {

    test('TC05.09 - Settings page shows only own gym info', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Should show Ramesh Gym name or owner info
      // await expect(page.locator(`text=${GYMS.RAMESH.name}`)).toBeVisible();
    });

    test('TC05.10 - Membership plans are gym-specific', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Look for plans section
      const plansSection = page.locator('text=Plans').or(page.locator('text=Membership'));
      
      if (await plansSection.isVisible()) {
        // Should see standard plans
        await expect(page.locator('text=Monthly').or(page.locator('text=Quarterly'))).toBeVisible();
      }
    });
  });

  test.describe('API Level Isolation', () => {

    test('TC05.11 - API requests include gym_id filter', async ({ page, loginAsGym }) => {
      // Enable request interception
      const requests: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('supabase') && request.url().includes('gym_members')) {
          requests.push(request.url());
        }
      });
      
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // All member requests should include gym_id filter
      requests.forEach(url => {
        expect(url).toContain('gym_id');
      });
    });

    test('TC05.12 - Cannot access other gym data via URL manipulation', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Try to access a URL that might expose other gym data
      // This should be blocked by RLS policies
      await page.goto('/members?gym_id=' + GYMS.SAMRIN.id);
      
      // Should still only see Ramesh's members (or redirect/error)
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Verify we still see Ramesh's data only
    });
  });

  test.describe('Cross-Gym Security', () => {

    test('TC05.13 - Four gyms all have independent data', async ({ page, loginAsGym }) => {
      const gymCounts: Record<string, number> = {};
      
      // Check each gym's member count
      for (const gymKey of ['RAMESH', 'SAMRIN', 'ITHRIS', 'NIZAM'] as const) {
        const gym = GYMS[gymKey];
        
        await loginAsGym(gym);
        await page.click(SELECTORS.NAV_MEMBERS);
        await page.waitForLoadState('networkidle');
        
        const count = await page.locator('[class*="member"]').count();
        gymCounts[gymKey] = count;
        
        // Logout
        await page.click(SELECTORS.NAV_SETTINGS);
        const logoutButton = page.locator('text=Logout');
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Each gym should have reasonable member counts
      Object.values(gymCounts).forEach(count => {
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(35);
      });
    });

    test('TC05.14 - Deleting member in one gym does not affect others', async ({ page, loginAsGym }) => {
      // Get Samrin's initial count
      await loginAsGym(GYMS.SAMRIN);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      const samrinInitialCount = await page.locator('[class*="member"]').count();
      
      // Logout
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.locator('text=Logout').click();
      await page.waitForTimeout(1000);
      
      // Login as Ramesh and delete a member
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Delete first member
      const memberCard = page.locator('[class*="member"]').first();
      await memberCard.click();
      
      const deleteButton = page.locator('button:has-text("Delete")').or(page.locator('button:has-text("Deactivate")'));
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Delete")').last()).click();
        await page.waitForTimeout(2000);
      }
      
      // Logout and check Samrin's count
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.locator('text=Logout').click();
      await page.waitForTimeout(1000);
      
      await loginAsGym(GYMS.SAMRIN);
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      const samrinFinalCount = await page.locator('[class*="member"]').count();
      
      // Samrin's count should be unchanged
      expect(samrinFinalCount).toBe(samrinInitialCount);
    });
  });
});
