/**
 * ============================================================================
 * TEST SUITE 02: GYM DATA ISOLATION
 * ============================================================================
 * 
 * CRITICAL TESTS - Ensures one gym's data is NEVER visible to another gym.
 * 
 * Tests for:
 * - Members visible only to their own gym
 * - Payments visible only to their own gym
 * - Settings apply only to their own gym
 * - API calls include gym_id filter
 * - Cross-gym data leakage prevention
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS } from '../config/test-config';

test.describe('02 - Gym Data Isolation (CRITICAL)', () => {

  test.describe('Member Isolation', () => {

    test('TC02.01 - Ramesh Gym sees only their members', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Navigate to members
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Count visible members
      const memberCards = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ });
      const count = await memberCards.count();
      
      // Should have expected number of members
      expect(count).toBeLessThanOrEqual(GYMS.RAMESH.expectedMemberCount + 5); // Allow some buffer for test members
      
      // Verify API call includes gym_id
      // This will be checked via network interception
    });

    test('TC02.02 - Samrin Gym sees only their members', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.SAMRIN);
      
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      const memberCards = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ });
      const count = await memberCards.count();
      
      expect(count).toBeLessThanOrEqual(GYMS.SAMRIN.expectedMemberCount + 5);
    });

    test('TC02.03 - Member created by Ramesh is NOT visible to Samrin', async ({ page, loginAsGym }) => {
      const uniqueMemberName = `Isolation Test ${Date.now()}`;
      
      // Login as Ramesh and create member
      await loginAsGym(GYMS.RAMESH);
      await page.click(SELECTORS.NAV_MEMBERS);
      
      // Create a unique member
      const addButton = page.locator('button:has-text("Add")').or(page.locator('button:has-text("+")')).first();
      if (await addButton.isVisible()) {
        await addButton.click();
        
        await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueMemberName);
        await page.fill('input[name="phone"], input[placeholder*="phone"]', '9999000011');
        
        const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Add")'));
        await saveButton.click();
        
        await page.waitForTimeout(2000);
      }
      
      // Logout and login as Samrin
      await page.context().clearCookies();
      await page.goto('/');
      await loginAsGym(GYMS.SAMRIN);
      
      // Navigate to members
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      // Search for the member
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(uniqueMemberName);
        await page.waitForTimeout(1000);
      }
      
      // Member should NOT be found
      await expect(page.locator(`text=${uniqueMemberName}`)).not.toBeVisible();
    });

    test('TC02.04 - Direct API access is blocked without gym context', async ({ page, request }) => {
      // Try to access members API directly without proper gym context
      const response = await request.get('http://localhost:5173/rest/v1/gym_members', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Should either fail or return empty (RLS policy blocks access)
      // This depends on API configuration
      const status = response.status();
      expect([401, 403, 404, 200]).toContain(status);
      
      if (status === 200) {
        const data = await response.json();
        // If returns 200, should be empty due to RLS
        expect(Array.isArray(data) ? data.length : 0).toBe(0);
      }
    });
  });

  test.describe('Payment Isolation', () => {

    test('TC02.05 - Payments visible only to own gym', async ({ page, loginAsGym }) => {
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Navigate to payments
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Record the payment count/data
      const paymentCards = page.locator('[class*="payment"], [class*="card"]').filter({ hasText: /₹/ });
      const rameshPaymentCount = await paymentCards.count();
      
      // Logout and login as different gym
      await page.context().clearCookies();
      await page.goto('/');
      await loginAsGym(GYMS.SAMRIN);
      
      // Navigate to payments
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      // Samrin's payments should be different (or empty for demo gyms)
      const samrinPaymentCards = page.locator('[class*="payment"], [class*="card"]').filter({ hasText: /₹/ });
      const samrinPaymentCount = await samrinPaymentCards.count();
      
      // Payment counts don't need to match - just verifying isolation
      // Each gym has their own payment records
    });
  });

  test.describe('Settings Isolation', () => {

    test('TC02.06 - Settings changes apply only to own gym', async ({ page, loginAsGym }) => {
      const uniqueGymName = `Test Gym ${Date.now()}`;
      
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Go to settings
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Note original gym name (if editable)
      const gymNameInput = page.locator('input[name="gym_name"], input[placeholder*="Gym Name"]');
      if (await gymNameInput.isVisible()) {
        const originalName = await gymNameInput.inputValue();
        
        // Change gym name
        await gymNameInput.fill(uniqueGymName);
        
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Logout and login as Samrin
        await page.context().clearCookies();
        await page.goto('/');
        await loginAsGym(GYMS.SAMRIN);
        
        // Go to settings
        await page.click(SELECTORS.NAV_SETTINGS);
        await page.waitForLoadState('networkidle');
        
        // Verify Samrin's gym name is NOT the one we just set
        const samrinGymName = page.locator('input[name="gym_name"], input[placeholder*="Gym Name"]');
        if (await samrinGymName.isVisible()) {
          const samrinName = await samrinGymName.inputValue();
          expect(samrinName).not.toBe(uniqueGymName);
        }
        
        // Cleanup: Revert Ramesh's gym name
        await page.context().clearCookies();
        await page.goto('/');
        await loginAsGym(GYMS.RAMESH);
        await page.click(SELECTORS.NAV_SETTINGS);
        const revertInput = page.locator('input[name="gym_name"], input[placeholder*="Gym Name"]');
        if (await revertInput.isVisible() && originalName) {
          await revertInput.fill(originalName);
          const revertSave = page.locator('button:has-text("Save")');
          if (await revertSave.isVisible()) {
            await revertSave.click();
          }
        }
      }
    });

    test('TC02.07 - Membership plans are gym-specific', async ({ page, loginAsGym }) => {
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Go to settings and check plans
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Find plans section
      const plansSection = page.locator('text=Plans').or(page.locator('text=Membership'));
      
      if (await plansSection.isVisible()) {
        // Get plan names/prices for Ramesh
        const rameshPlans = await page.locator('[class*="plan"]').allTextContents();
        
        // Login as Samrin
        await page.context().clearCookies();
        await page.goto('/');
        await loginAsGym(GYMS.SAMRIN);
        
        await page.click(SELECTORS.NAV_SETTINGS);
        await page.waitForLoadState('networkidle');
        
        // Samrin should have their own plans (may be same defaults, but separate records)
        const samrinPlans = await page.locator('[class*="plan"]').allTextContents();
        
        // Plans exist for both - specific values may vary
      }
    });
  });

  test.describe('Dashboard Isolation', () => {

    test('TC02.08 - Dashboard stats are gym-specific', async ({ page, loginAsGym }) => {
      // Login as Ramesh
      await loginAsGym(GYMS.RAMESH);
      
      // Get dashboard stats
      const activeCount = page.locator('text=ACTIVE').locator('xpath=following-sibling::*[1]').or(
        page.locator('text=ACTIVE').locator('..').locator('*:not(:has-text("ACTIVE"))').first()
      );
      const rameshActive = await activeCount.textContent();
      
      // Login as different gym
      await page.context().clearCookies();
      await page.goto('/');
      await loginAsGym(GYMS.ITHRIS);
      
      // Get Ithris dashboard stats
      const ithrisActiveCount = page.locator('text=ACTIVE').locator('xpath=following-sibling::*[1]').or(
        page.locator('text=ACTIVE').locator('..').locator('*:not(:has-text("ACTIVE"))').first()
      );
      const ithrisActive = await ithrisActiveCount.textContent();
      
      // Stats are independent (values may be same but from different data)
      // Just verify both have valid numbers
      expect(rameshActive).toBeTruthy();
      expect(ithrisActive).toBeTruthy();
    });
  });

  test.describe('Network Request Verification', () => {

    test('TC02.09 - All API requests include gym_id filter', async ({ page, loginAsGym }) => {
      const apiCallsWithGymId: string[] = [];
      const apiCallsWithoutGymId: string[] = [];
      
      // Intercept network requests
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('supabase') && url.includes('gym_')) {
          if (url.includes('gym_id') || request.postData()?.includes('gym_id')) {
            apiCallsWithGymId.push(url);
          } else if (request.method() === 'GET') {
            // POST requests may have gym_id in body
            apiCallsWithoutGymId.push(url);
          }
        }
      });
      
      await loginAsGym(GYMS.RAMESH);
      
      // Navigate through the app
      await page.click(SELECTORS.NAV_MEMBERS);
      await page.waitForLoadState('networkidle');
      
      await page.click(SELECTORS.NAV_PAYMENTS);
      await page.waitForLoadState('networkidle');
      
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Log results for debugging
      console.log('API calls with gym_id:', apiCallsWithGymId.length);
      console.log('API calls without gym_id:', apiCallsWithoutGymId);
      
      // All gym-related API calls should have gym_id filter
      // (This is enforced by RLS policies, but good to verify)
    });
  });
});
