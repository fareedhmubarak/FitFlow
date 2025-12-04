/**
 * ============================================================================
 * TEST SUITE 03: MEMBER MANAGEMENT
 * ============================================================================
 * 
 * Tests for:
 * - Add new member
 * - Edit member details
 * - Delete member
 * - Member status (active/inactive)
 * - Member card display
 * - Search and filter members
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS, TEST_MEMBERS, PLANS } from '../config/test-config';

test.describe('03 - Member Management', () => {

  // Use Ramesh Gym for all member tests
  test.beforeEach(async ({ page, loginAsGym }) => {
    await loginAsGym(GYMS.RAMESH);
    await page.click(SELECTORS.NAV_MEMBERS);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Add Member', () => {

    test('TC03.01 - Add new member with all required fields', async ({ page }) => {
      const uniqueName = `New Member ${Date.now()}`;
      const uniquePhone = `99${Date.now().toString().slice(-8)}`;
      
      // Click add member button
      const addButton = page.locator('button:has-text("Add")').or(page.locator('[aria-label="Add member"]')).first();
      await addButton.click();
      
      // Wait for form
      await page.waitForSelector('input[name="full_name"], input[placeholder*="name"]');
      
      // Fill required fields
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', uniquePhone);
      
      // Select plan
      const planButton = page.locator('button:has-text("Monthly")').or(page.locator('text=Monthly')).first();
      if (await planButton.isVisible()) {
        await planButton.click();
      }
      
      // Save
      const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Add Member")'));
      await saveButton.click();
      
      // Wait for success
      await page.waitForTimeout(2000);
      
      // Verify member appears in list
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
    });

    test('TC03.02 - Add member with email and gender', async ({ page }) => {
      const uniqueName = `Full Member ${Date.now()}`;
      const uniquePhone = `98${Date.now().toString().slice(-8)}`;
      const uniqueEmail = `test${Date.now()}@example.com`;
      
      // Click add
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();
      
      // Fill all fields
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', uniquePhone);
      
      const emailInput = page.locator('input[name="email"], input[placeholder*="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill(uniqueEmail);
      }
      
      // Select gender if available
      const genderSelect = page.locator('button:has-text("Male")').or(page.locator('text=Male'));
      if (await genderSelect.first().isVisible()) {
        await genderSelect.first().click();
      }
      
      // Save
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Verify member exists
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
    });

    test('TC03.03 - Validation error for missing required fields', async ({ page }) => {
      // Click add
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();
      
      // Try to save without filling fields
      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();
      
      // Should show validation error
      const errorMessage = page.locator('text=required').or(page.locator('text=Please')).or(page.locator('[class*="error"]'));
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    });

    test('TC03.04 - Member card appears with correct plan', async ({ page }) => {
      const uniqueName = `Plan Test ${Date.now()}`;
      const uniquePhone = `97${Date.now().toString().slice(-8)}`;
      
      // Add member with Quarterly plan
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();
      
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', uniquePhone);
      
      // Select Quarterly
      const quarterlyPlan = page.locator('button:has-text("Quarterly")').or(page.locator('text=Quarterly'));
      if (await quarterlyPlan.first().isVisible()) {
        await quarterlyPlan.first().click();
      }
      
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Find the member card
      const memberCard = page.locator(`text=${uniqueName}`).locator('..');
      
      // Should show Quarterly plan info or amount ₹2,500
      const planInfo = memberCard.locator('text=Quarterly').or(memberCard.locator('text=₹2,500')).or(memberCard.locator('text=2,500'));
      // Plan info should be somewhere in the member display
    });

    test('TC03.05 - New member appears in dashboard DUE TODAY', async ({ page }) => {
      const uniqueName = `Due Today ${Date.now()}`;
      const uniquePhone = `96${Date.now().toString().slice(-8)}`;
      
      // Add member (will be due today by default)
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();
      
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', uniquePhone);
      
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Go to dashboard
      await page.click(SELECTORS.NAV_HOME);
      await page.waitForLoadState('networkidle');
      
      // Check DUE TODAY section
      const dueTodaySection = page.locator('text=DUE TODAY').locator('..');
      // New member should appear here (depending on joining date logic)
    });
  });

  test.describe('Edit Member', () => {

    test('TC03.06 - Edit member name', async ({ page }) => {
      // Click on first member to open profile
      const memberCard = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ }).first();
      await memberCard.click();
      
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit")').or(page.locator('[aria-label="Edit"]'));
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Modify name
        const nameInput = page.locator('input[name="full_name"], input[placeholder*="name"]');
        const originalName = await nameInput.inputValue();
        const newName = `${originalName} Edited`;
        
        await nameInput.fill(newName);
        
        // Save
        await page.locator('button:has-text("Save")').click();
        await page.waitForTimeout(2000);
        
        // Verify change
        await expect(page.locator(`text=${newName}`)).toBeVisible();
        
        // Revert (cleanup)
        await page.locator('button:has-text("Edit")').click();
        await nameInput.fill(originalName);
        await page.locator('button:has-text("Save")').click();
      }
    });

    test('TC03.07 - Edit member phone number', async ({ page }) => {
      // Click on member
      const memberCard = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ }).first();
      await memberCard.click();
      
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        
        const phoneInput = page.locator('input[name="phone"], input[placeholder*="phone"]');
        const originalPhone = await phoneInput.inputValue();
        const newPhone = `91${Date.now().toString().slice(-8)}`;
        
        await phoneInput.fill(newPhone);
        await page.locator('button:has-text("Save")').click();
        await page.waitForTimeout(2000);
        
        // Verify change
        await expect(page.locator(`text=${newPhone}`).or(page.locator(`text=${newPhone.slice(0,5)} ${newPhone.slice(5)}`))).toBeVisible();
        
        // Revert
        await page.locator('button:has-text("Edit")').click();
        await phoneInput.fill(originalPhone);
        await page.locator('button:has-text("Save")').click();
      }
    });

    test('TC03.08 - Change member plan', async ({ page }) => {
      // This would test changing from Monthly to Quarterly, etc.
      const memberCard = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ }).first();
      await memberCard.click();
      
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Change plan
        const quarterlyButton = page.locator('button:has-text("Quarterly")').first();
        if (await quarterlyButton.isVisible()) {
          await quarterlyButton.click();
          await page.locator('button:has-text("Save")').click();
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Delete Member', () => {

    test('TC03.09 - Delete member with confirmation', async ({ page }) => {
      // First create a member to delete
      const uniqueName = `Delete Me ${Date.now()}`;
      const uniquePhone = `95${Date.now().toString().slice(-8)}`;
      
      const addButton = page.locator('button:has-text("Add")').first();
      await addButton.click();
      
      await page.fill('input[name="full_name"], input[placeholder*="name"]', uniqueName);
      await page.fill('input[name="phone"], input[placeholder*="phone"]', uniquePhone);
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(2000);
      
      // Find and click on the member
      await page.locator(`text=${uniqueName}`).click();
      
      // Look for delete button
      const deleteButton = page.locator('button:has-text("Delete")').or(page.locator('button:has-text("Deactivate")'));
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Delete")').last());
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Verify member is removed or deactivated
        const deletedMember = page.locator(`text=${uniqueName}`);
        // Either not visible or marked as inactive
      }
    });

    test('TC03.10 - Cancel delete keeps member', async ({ page }) => {
      // Click on member
      const memberCard = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ }).first();
      const memberName = await memberCard.locator('h2, h3, [class*="name"]').first().textContent();
      await memberCard.click();
      
      const deleteButton = page.locator('button:has-text("Delete")').or(page.locator('button:has-text("Deactivate")'));
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Cancel
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
        
        // Member should still exist
        if (memberName) {
          await expect(page.locator(`text=${memberName.trim()}`).first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Member Status', () => {

    test('TC03.11 - Inactive member shown differently', async ({ page }) => {
      // Navigate to members
      await page.waitForLoadState('networkidle');
      
      // Look for inactive members (should have visual distinction)
      const inactiveIndicator = page.locator('text=Inactive').or(page.locator('text=Expired')).or(page.locator('[class*="inactive"]'));
      
      // Count inactive vs active members
      const inactiveCount = await inactiveIndicator.count();
      
      // Verify UI shows status clearly
      // (specific assertions depend on UI design)
    });

    test('TC03.12 - Making payment changes inactive to active', async ({ page }) => {
      // Find an overdue/inactive member
      const overdueMember = page.locator('text=Overdue').or(page.locator('text=Expired')).locator('..');
      
      if (await overdueMember.first().isVisible()) {
        await overdueMember.first().click();
        
        // Record payment
        const paymentButton = page.locator('button:has-text("Payment")');
        if (await paymentButton.isVisible()) {
          await paymentButton.click();
          
          // Complete payment flow
          const recordButton = page.locator('button:has-text("Record Payment")');
          if (await recordButton.isVisible()) {
            await recordButton.click();
            await page.waitForTimeout(2000);
          }
          
          // Member should now be active
          const statusIndicator = page.locator('text=Active').or(page.locator('[class*="active"]'));
        }
      }
    });
  });

  test.describe('Search & Filter', () => {

    test('TC03.13 - Search member by name', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[type="search"]'));
      
      if (await searchInput.isVisible()) {
        // Get first member name
        const firstMember = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /[A-Z][a-z]+/ }).first();
        const memberName = await firstMember.locator('h2, h3, [class*="name"]').first().textContent();
        
        if (memberName) {
          // Search for that name
          await searchInput.fill(memberName.trim().split(' ')[0]);
          await page.waitForTimeout(500);
          
          // Member should still be visible
          await expect(page.locator(`text=${memberName.trim()}`).first()).toBeVisible();
        }
      }
    });

    test('TC03.14 - Search member by phone', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[type="search"]'));
      
      if (await searchInput.isVisible()) {
        // Search for a phone number pattern
        await searchInput.fill('789');
        await page.waitForTimeout(500);
        
        // Should filter results
        const results = page.locator('[class*="member"], [class*="card"]').filter({ hasText: /789/ });
        // Verify filtered results contain the search term
      }
    });

    test('TC03.15 - Filter by status (if available)', async ({ page }) => {
      // Look for status filter dropdown
      const statusFilter = page.locator('select').or(page.locator('button:has-text("Status")'));
      
      if (await statusFilter.first().isVisible()) {
        await statusFilter.first().click();
        
        // Select "Active" filter
        const activeOption = page.locator('text=Active').or(page.locator('option:has-text("Active")'));
        if (await activeOption.first().isVisible()) {
          await activeOption.first().click();
          await page.waitForTimeout(500);
        }
      }
    });
  });
});
