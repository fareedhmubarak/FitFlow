/**
 * ============================================================================
 * TEST SUITE 01: AUTHENTICATION & LOGIN
 * ============================================================================
 * 
 * Tests for:
 * - Login flow for each gym
 * - Session persistence
 * - Logout functionality
 * - Invalid credentials handling
 * - Gym-specific dashboard after login
 */

import { test, expect } from '../config/fixtures';
import { GYMS, SELECTORS } from '../config/test-config';

test.describe('01 - Authentication & Login', () => {
  
  test.describe('Login Flow', () => {
    
    test('TC01.01 - Ramesh Gym can login successfully', async ({ page }) => {
      await page.goto('/');
      
      // Wait for login form
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      // Fill credentials
      await page.fill(SELECTORS.LOGIN_EMAIL, GYMS.RAMESH.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, GYMS.RAMESH.password);
      
      // Click login
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      // Verify redirect to dashboard
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
      
      // Verify gym name is visible (profile area)
      // await expect(page.locator(`text=${GYMS.RAMESH.name}`)).toBeVisible();
    });

    test('TC01.02 - Samrin Gym can login successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      await page.fill(SELECTORS.LOGIN_EMAIL, GYMS.SAMRIN.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, GYMS.SAMRIN.password);
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('TC01.03 - Ithris Gym can login successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      await page.fill(SELECTORS.LOGIN_EMAIL, GYMS.ITHRIS.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, GYMS.ITHRIS.password);
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('TC01.04 - Nizam Gym can login successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      await page.fill(SELECTORS.LOGIN_EMAIL, GYMS.NIZAM.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, GYMS.NIZAM.password);
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });
  });

  test.describe('Invalid Credentials', () => {
    
    test('TC01.05 - Show error for wrong password', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      await page.fill(SELECTORS.LOGIN_EMAIL, GYMS.RAMESH.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, 'WrongPassword123');
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      // Should show error message
      await expect(page.locator('text=Invalid').or(page.locator('text=error')).or(page.locator('text=incorrect'))).toBeVisible({ timeout: 5000 });
      
      // Should stay on login page
      await expect(page.locator(SELECTORS.LOGIN_EMAIL)).toBeVisible();
    });

    test('TC01.06 - Show error for non-existent email', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      await page.fill(SELECTORS.LOGIN_EMAIL, 'nonexistent@fitflow.demo');
      await page.fill(SELECTORS.LOGIN_PASSWORD, 'Demo@123');
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      // Should show error
      await expect(page.locator('text=Invalid').or(page.locator('text=error')).or(page.locator('text=not found'))).toBeVisible({ timeout: 5000 });
    });

    test('TC01.07 - Validate required fields', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL);
      
      // Try to login with empty fields
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      // Should show validation error or not proceed
      const emailInput = page.locator(SELECTORS.LOGIN_EMAIL);
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Session & Logout', () => {
    
    test('TC01.08 - Session persists on page refresh', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Refresh page
      await page.reload();
      
      // Should still be on dashboard
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('TC01.09 - Logout redirects to login page', async ({ page, loginAsGym }) => {
      await loginAsGym(GYMS.RAMESH);
      
      // Find and click logout (may be in dropdown)
      const profileButton = page.locator('button').filter({ hasText: /^[A-Z]$/ }).first();
      if (await profileButton.isVisible()) {
        await profileButton.click();
      }
      
      // Click logout
      const logoutButton = page.locator('text=Logout').or(page.locator('text=Sign Out'));
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        
        // Should redirect to login
        await expect(page.locator(SELECTORS.LOGIN_EMAIL)).toBeVisible({ timeout: 5000 });
      }
    });

    test('TC01.10 - Cannot access protected routes without login', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();
      
      // Try to access members page directly
      await page.goto('/members');
      
      // Should redirect to login or show auth required
      await expect(page.locator(SELECTORS.LOGIN_EMAIL).or(page.locator('text=Sign In'))).toBeVisible({ timeout: 5000 });
    });
  });
});
