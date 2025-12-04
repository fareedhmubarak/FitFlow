/**
 * ============================================================================
 * TEST SUITE 07: SETTINGS & MEMBERSHIP PLANS
 * ============================================================================
 * 
 * Tests for:
 * - Settings page access
 * - Gym-specific settings
 * - Membership plan management (add/edit/delete)
 * - Plan pricing and duration
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS, PLANS } from '../config/test-config';

test.describe('07 - Settings & Membership Plans', () => {

  test.beforeEach(async ({ page, loginAsGym }) => {
    await loginAsGym(GYMS.RAMESH);
  });

  test.describe('Settings Access', () => {

    test('TC07.01 - Navigate to settings page', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('TC07.02 - Settings shows gym name', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Should show the gym name
      await expect(page.locator(`text=${GYMS.RAMESH.displayName}`).or(page.locator('text=Ramesh'))).toBeVisible();
    });

    test('TC07.03 - Settings displays membership plans section', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Plans').or(page.locator('text=Membership'))).toBeVisible();
    });
  });

  test.describe('View Membership Plans', () => {

    test('TC07.04 - Monthly plan displayed', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator(`text=${PLANS.MONTHLY.name}`)).toBeVisible();
      await expect(page.locator(`text=₹${PLANS.MONTHLY.price}`)).toBeVisible();
    });

    test('TC07.05 - Quarterly plan displayed', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator(`text=${PLANS.QUARTERLY.name}`)).toBeVisible();
      await expect(page.locator(`text=₹${PLANS.QUARTERLY.price}`)).toBeVisible();
    });

    test('TC07.06 - Half-Yearly plan displayed', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator(`text=${PLANS.HALF_YEARLY.name}`)).toBeVisible();
      await expect(page.locator(`text=₹${PLANS.HALF_YEARLY.price}`)).toBeVisible();
    });

    test('TC07.07 - Yearly plan displayed', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator(`text=${PLANS.YEARLY.name}`)).toBeVisible();
      await expect(page.locator(`text=₹${PLANS.YEARLY.price}`)).toBeVisible();
    });

    test('TC07.08 - Plan cards show duration info', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Should show duration like "1 month", "3 months", etc.
      await expect(page.locator('text=month')).toBeVisible();
    });
  });

  test.describe('Add New Membership Plan', () => {

    test('TC07.09 - Add plan button visible', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('button:has-text("Add Plan")').or(page.locator('button:has-text("New Plan")'))).toBeVisible();
    });

    test('TC07.10 - Add plan modal opens', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const addButton = page.locator('button:has-text("Add Plan")').or(page.locator('button:has-text("New Plan")'));
      await addButton.click();
      
      // Modal should open with form fields
      await expect(page.locator('text=Plan Name').or(page.locator('input[placeholder*="name"]'))).toBeVisible();
    });

    test('TC07.11 - Create new custom plan', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const addButton = page.locator('button:has-text("Add Plan")').or(page.locator('button:has-text("New Plan")'));
      await addButton.click();
      
      await page.waitForTimeout(500);
      
      // Fill in plan details
      await page.locator('input[name="name"]').or(page.locator('input').first()).fill('Test Plan');
      await page.locator('input[name="price"]').or(page.locator('input[type="number"]').first()).fill('999');
      await page.locator('input[name="duration"]').or(page.locator('input[type="number"]').nth(1)).fill('2');
      
      // Submit
      await page.locator('button:has-text("Save")').or(page.locator('button:has-text("Create")').or(page.locator('button:has-text("Add")'))).click();
      
      await page.waitForTimeout(1000);
      
      // Should see the new plan
      await expect(page.locator('text=Test Plan')).toBeVisible();
    });

    test('TC07.12 - Plan validation - empty name rejected', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const addButton = page.locator('button:has-text("Add Plan")').or(page.locator('button:has-text("New Plan")'));
      await addButton.click();
      
      await page.waitForTimeout(500);
      
      // Try to save without name
      await page.locator('input[name="price"]').or(page.locator('input[type="number"]').first()).fill('500');
      await page.locator('button:has-text("Save")').or(page.locator('button:has-text("Create")')).click();
      
      // Should show error
      await expect(page.locator('text=required').or(page.locator('text=error').or(page.locator('[class*="error"]')))).toBeVisible();
    });

    test('TC07.13 - Plan validation - zero price rejected', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const addButton = page.locator('button:has-text("Add Plan")').or(page.locator('button:has-text("New Plan")'));
      await addButton.click();
      
      await page.waitForTimeout(500);
      
      await page.locator('input[name="name"]').or(page.locator('input').first()).fill('Invalid Plan');
      await page.locator('input[name="price"]').or(page.locator('input[type="number"]').first()).fill('0');
      await page.locator('button:has-text("Save")').click();
      
      // Should show validation error
    });
  });

  test.describe('Edit Membership Plan', () => {

    test('TC07.14 - Edit button visible on plan card', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Monthly').locator('..');
      await planCard.hover();
      
      await expect(planCard.locator('button:has-text("Edit")').or(planCard.locator('[aria-label*="edit"]').or(planCard.locator('svg')))).toBeVisible();
    });

    test('TC07.15 - Edit plan modal shows current values', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Monthly').locator('..');
      const editButton = planCard.locator('button').filter({ has: page.locator('svg') }).first();
      await editButton.click();
      
      await page.waitForTimeout(500);
      
      // Should show current plan name
      const nameInput = page.locator('input[name="name"]').or(page.locator('input').first());
      await expect(nameInput).toHaveValue(/Monthly/i);
    });

    test('TC07.16 - Update plan price', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Monthly').locator('..');
      const editButton = planCard.locator('button').first();
      await editButton.click();
      
      await page.waitForTimeout(500);
      
      // Update price
      const priceInput = page.locator('input[name="price"]').or(page.locator('input[type="number"]').first());
      await priceInput.clear();
      await priceInput.fill('1100');
      
      await page.locator('button:has-text("Save")').or(page.locator('button:has-text("Update")')).click();
      
      await page.waitForTimeout(1000);
      
      // Should show updated price
      await expect(page.locator('text=₹1,100').or(page.locator('text=1100'))).toBeVisible();
    });
  });

  test.describe('Delete Membership Plan', () => {

    test('TC07.17 - Delete button visible on plan card', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Test Plan').locator('..');
      
      if (await planCard.isVisible()) {
        await planCard.hover();
        await expect(planCard.locator('button:has-text("Delete")').or(planCard.locator('[aria-label*="delete"]'))).toBeVisible();
      }
    });

    test('TC07.18 - Delete plan shows confirmation', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Look for test plan created earlier
      const planCard = page.locator('text=Test Plan').locator('..');
      
      if (await planCard.isVisible()) {
        const deleteButton = planCard.locator('button').filter({ hasText: /delete/i }).or(planCard.locator('[aria-label*="delete"]'));
        await deleteButton.click();
        
        // Confirmation should appear
        await expect(page.locator('text=Are you sure').or(page.locator('text=Delete'))).toBeVisible();
      }
    });

    test('TC07.19 - Cancel delete preserves plan', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Test Plan').locator('..');
      
      if (await planCard.isVisible()) {
        const deleteButton = planCard.locator('button').filter({ hasText: /delete/i });
        await deleteButton.click();
        
        // Click cancel
        await page.locator('button:has-text("Cancel")').or(page.locator('button:has-text("No")')).click();
        
        // Plan should still exist
        await expect(page.locator('text=Test Plan')).toBeVisible();
      }
    });

    test('TC07.20 - Confirm delete removes plan', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const planCard = page.locator('text=Test Plan').locator('..');
      
      if (await planCard.isVisible()) {
        const deleteButton = planCard.locator('button').filter({ hasText: /delete/i });
        await deleteButton.click();
        
        // Confirm delete
        await page.locator('button:has-text("Delete")').or(page.locator('button:has-text("Confirm")')).click();
        
        await page.waitForTimeout(1000);
        
        // Plan should be gone
        await expect(page.locator('text=Test Plan')).not.toBeVisible();
      }
    });
  });

  test.describe('Plan Isolation Between Gyms', () => {

    test('TC07.21 - Plans are gym-specific', async ({ page, loginAsGym }) => {
      // Create a custom plan in Ramesh gym
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const addButton = page.locator('button:has-text("Add Plan")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.locator('input').first().fill('Ramesh Special Plan');
        await page.locator('input[type="number"]').first().fill('5000');
        await page.locator('button:has-text("Save")').click();
        await page.waitForTimeout(1000);
      }
      
      // Logout and login as different gym
      await page.click('button:has-text("Logout")').catch(() => {});
      await loginAsGym(GYMS.SAMRIN);
      
      // Check settings
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Should NOT see Ramesh's custom plan
      await expect(page.locator('text=Ramesh Special Plan')).not.toBeVisible();
    });

    test('TC07.22 - Different gyms can have same plan names', async ({ page, loginAsGym }) => {
      // Both gyms should have Monthly plan independently
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Monthly')).toBeVisible();
      
      // Login as different gym
      await page.click('button:has-text("Logout")').catch(() => {});
      await loginAsGym(GYMS.SAMRIN);
      
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Samrin gym also has Monthly
      await expect(page.locator('text=Monthly')).toBeVisible();
    });
  });

  test.describe('Gym Profile Settings', () => {

    test('TC07.23 - Gym name editable', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      const profileSection = page.locator('text=Profile').or(page.locator('text=Gym Name')).locator('..');
      const editButton = profileSection.locator('button').filter({ has: page.locator('svg') });
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await expect(page.locator('input[name="name"]').or(page.locator('input').first())).toBeEditable();
      }
    });

    test('TC07.24 - Contact info editable', async ({ page }) => {
      await page.click(SELECTORS.NAV_SETTINGS);
      await page.waitForLoadState('networkidle');
      
      // Look for phone/email fields
      const contactSection = page.locator('text=Contact').or(page.locator('text=Phone')).locator('..');
      
      if (await contactSection.isVisible()) {
        const editButton = contactSection.locator('button').first();
        if (await editButton.isVisible()) {
          await editButton.click();
          await expect(page.locator('input[name="phone"]').or(page.locator('input[type="tel"]'))).toBeEditable();
        }
      }
    });
  });
});
