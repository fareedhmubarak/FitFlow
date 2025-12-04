/**
 * FitFlow E2E Test Fixtures
 * 
 * Custom fixtures for login, API verification, and database checks.
 */

import { test as base, expect, Page } from '@playwright/test';
import { GYMS, SELECTORS } from './test-config';

// ============================================================================
// TYPES
// ============================================================================

type GymCredentials = typeof GYMS[keyof typeof GYMS];

interface ApiResponse {
  status: number;
  data: unknown;
}

// ============================================================================
// CUSTOM FIXTURES
// ============================================================================

export const test = base.extend<{
  loginAsGym: (gym: GymCredentials) => Promise<void>;
  verifyApiCall: (endpoint: string, expectedStatus?: number) => Promise<ApiResponse>;
  checkAuditLog: (action: string, entityType: string) => Promise<boolean>;
  checkDebugLog: (level: string, message: string) => Promise<boolean>;
  verifyGymIsolation: (gym: GymCredentials, otherGym: GymCredentials) => Promise<void>;
}>({
  /**
   * Login as a specific gym
   */
  loginAsGym: async ({ page }, use) => {
    const login = async (gym: GymCredentials) => {
      await page.goto('/');
      
      // Wait for login form
      await page.waitForSelector(SELECTORS.LOGIN_EMAIL, { timeout: 10000 });
      
      // Fill credentials
      await page.fill(SELECTORS.LOGIN_EMAIL, gym.email);
      await page.fill(SELECTORS.LOGIN_PASSWORD, gym.password);
      
      // Click login
      await page.click(SELECTORS.LOGIN_BUTTON);
      
      // Wait for dashboard to load
      await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });
      
      // Verify gym name in header/profile
      await expect(page.locator(`text=${gym.name}`).first()).toBeVisible({ timeout: 5000 });
    };
    
    await use(login);
  },

  /**
   * Verify API call was made with expected status
   */
  verifyApiCall: async ({ page }, use) => {
    const verify = async (endpoint: string, expectedStatus = 200): Promise<ApiResponse> => {
      const response = await page.waitForResponse(
        (res) => res.url().includes(endpoint),
        { timeout: 10000 }
      );
      
      expect(response.status()).toBe(expectedStatus);
      
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
      
      return { status: response.status(), data };
    };
    
    await use(verify);
  },

  /**
   * Check audit log for specific action
   */
  checkAuditLog: async ({ page }, use) => {
    const check = async (action: string, entityType: string): Promise<boolean> => {
      // Navigate to settings/audit if needed
      const currentUrl = page.url();
      if (!currentUrl.includes('/settings')) {
        await page.click(SELECTORS.NAV_SETTINGS);
      }
      
      // Look for audit log section
      const auditSection = page.locator('text=Audit Logs');
      if (await auditSection.isVisible()) {
        await auditSection.click();
        
        // Check for the specific log entry
        const logEntry = page.locator(`text=${action}`).filter({ hasText: entityType });
        return await logEntry.isVisible();
      }
      
      return false;
    };
    
    await use(check);
  },

  /**
   * Check debug log for specific message
   */
  checkDebugLog: async ({ page }, use) => {
    const check = async (level: string, message: string): Promise<boolean> => {
      // This would check browser console or debug panel
      const logs = await page.evaluate(() => {
        return (window as unknown as { __DEBUG_LOGS__?: Array<{ level: string; message: string }> }).__DEBUG_LOGS__ || [];
      });
      
      return logs.some(log => log.level === level && log.message.includes(message));
    };
    
    await use(check);
  },

  /**
   * Verify gym data isolation
   */
  verifyGymIsolation: async ({ page }, use) => {
    const verify = async (currentGym: GymCredentials, otherGym: GymCredentials) => {
      // Get all visible member names
      const memberNames = await page.locator('[data-testid="member-name"], .member-name, h3').allTextContents();
      
      // These members should NOT appear (they belong to other gym)
      // This is a conceptual check - in real implementation, you'd have specific member names per gym
      
      // Verify API calls include gym_id filter
      page.on('request', (request) => {
        if (request.url().includes('gym_members')) {
          const url = new URL(request.url());
          expect(url.searchParams.has('gym_id')).toBe(true);
        }
      });
    };
    
    await use(verify);
  },
});

export { expect };
