# FitFlow E2E Test Plan

## Overview

This document outlines the comprehensive Playwright End-to-End (E2E) test plan for FitFlow gym management application.

## Test Structure

```
e2e/
├── config/
│   ├── fixtures.ts       # Test fixtures & helpers
│   └── test-config.ts    # Configuration (gyms, plans, selectors)
├── tests/
│   ├── 01-authentication.spec.ts    # Login/Logout tests
│   ├── 02-gym-isolation.spec.ts     # Basic isolation (legacy)
│   ├── 03-member-management.spec.ts # Member CRUD
│   ├── 04-payment-management.spec.ts # Payment record & delete ✨
│   ├── 05-gym-isolation.spec.ts     # Comprehensive isolation ✨
│   ├── 06-dashboard-calendar.spec.ts # Dashboard & Calendar ✨
│   ├── 07-settings-plans.spec.ts    # Settings & Plans ✨
│   └── 08-user-journeys.spec.ts     # Complete user flows ✨
└── playwright.config.ts
```

✨ = Newly created test files

---

## Test Suites Summary

### Suite 01: Authentication
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC01.01 | Login page loads | Critical |
| TC01.02 | Invalid credentials show error | High |
| TC01.03 | Valid login redirects to dashboard | Critical |
| TC01.04 | Logout clears session | Critical |
| TC01.05 | Protected routes redirect to login | High |
| TC01.06 | Session persists on reload | Medium |
| TC01.07 | Multi-gym login isolation | Critical |

### Suite 03: Member Management
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC03.01 | Add member with valid data | Critical |
| TC03.02 | Member appears in list | Critical |
| TC03.03 | Edit member details | High |
| TC03.04 | Search member by name | High |
| TC03.05 | Filter members by status | Medium |
| TC03.06 | Member card shows correct info | High |
| TC03.07 | Delete member | Medium |
| TC03.08 | Validation errors for empty fields | Medium |
| TC03.09 | Duplicate phone number rejected | High |

### Suite 04: Payment Management ⭐
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC04.01 | Record Monthly payment | Critical |
| TC04.02 | Record Quarterly payment | Critical |
| TC04.03 | Record Half-Yearly payment | High |
| TC04.04 | Record Yearly payment | High |
| TC04.05 | Payment updates member dates | Critical |
| TC04.06 | Payment appears in history | Critical |
| TC04.07 | Delete button visible | Critical |
| TC04.08 | Delete confirmation modal | Critical |
| TC04.09 | Delete reverts dates correctly | Critical |
| TC04.10 | Dashboard updates after delete | Critical |
| TC04.11 | Audit log created on delete | High |
| TC04.12 | Multi-payment delete behavior | High |

### Suite 05: Gym Data Isolation ⭐⭐ (CRITICAL)
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC05.01 | Gym A cannot see Gym B members | Critical |
| TC05.02 | Gym A cannot see Gym B payments | Critical |
| TC05.03 | Gym A cannot see Gym B settings | Critical |
| TC05.04 | Member IDs isolated | Critical |
| TC05.05 | Payment records isolated | Critical |
| TC05.06 | Statistics per-gym only | Critical |
| TC05.07 | Calendar shows own members only | Critical |
| TC05.08 | Search limited to own gym | Critical |
| TC05.09 | API calls filtered by gym_id | Critical |
| TC05.10 | Cross-gym data injection prevented | Critical |

### Suite 06: Dashboard & Calendar
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC06.01 | COLLECTED amount displays | High |
| TC06.02 | PENDING amount displays | High |
| TC06.03 | ACTIVE member count | High |
| TC06.04 | Stats update after payment | High |
| TC06.05 | DUE TODAY section visible | Critical |
| TC06.06 | DUE TODAY member count | High |
| TC06.07 | DUE TODAY amount | High |
| TC06.08 | DUE TODAY cards clickable | Medium |
| TC06.09 | Pay button from DUE TODAY | Critical |
| TC06.10 | Member moves out after payment | Critical |
| TC06.11 | OVERDUE section visible | High |
| TC06.12 | OVERDUE member count | High |
| TC06.13 | OVERDUE shows days info | Medium |
| TC06.14 | Overdue payment works | High |
| TC06.15 | Navigate to calendar | Medium |
| TC06.16 | Calendar shows current month | Medium |
| TC06.17 | Calendar dates clickable | Medium |
| TC06.18 | Calendar navigation | Medium |

### Suite 07: Settings & Plans
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC07.01 | Navigate to settings | High |
| TC07.02 | Gym name visible | High |
| TC07.03 | Plans section visible | High |
| TC07.04-07 | All plans displayed | High |
| TC07.08 | Plan duration info | Medium |
| TC07.09 | Add plan button | High |
| TC07.10 | Add plan modal | High |
| TC07.11 | Create custom plan | High |
| TC07.12-13 | Plan validation | Medium |
| TC07.14-16 | Edit plan | Medium |
| TC07.17-20 | Delete plan | Medium |
| TC07.21-22 | Plan isolation | Critical |

### Suite 08: Complete User Journeys ⭐
| Test ID | Description | Priority |
|---------|-------------|----------|
| TC08.01 | Full member lifecycle | Critical |
| TC08.02 | Multiple payments & extensions | Critical |
| TC08.03 | Delete restores correct state | Critical |
| TC08.04 | Multi-gym same browser | Critical |
| TC08.05 | Daily operations workflow | High |
| TC08.06 | Network error recovery | Medium |
| TC08.07 | Session timeout handling | Medium |

---

## Critical Test Scenarios

### 1. Payment Delete & Date Reversion
```
SCENARIO: Member has payment deleted
GIVEN: Member "Salman" with due date Dec 4, 2025
WHEN: Quarterly payment recorded (₹2,500)
THEN: Due date becomes March 4, 2026
WHEN: Payment is deleted
THEN: Due date reverts to Dec 4, 2025
AND: Member appears in DUE TODAY
AND: Audit log entry created
```

### 2. Gym Data Isolation
```
SCENARIO: Gym A cannot access Gym B data
GIVEN: Ramesh Gym logged in
WHEN: Viewing member list
THEN: Only Ramesh Gym members visible
WHEN: Samrin Gym logs in
THEN: Only Samrin Gym members visible
AND: Ramesh members NOT visible
AND: Cross-gym queries return empty
```

### 3. Complete Member Lifecycle
```
SCENARIO: New member from add to payment
GIVEN: Logged in to gym
WHEN: Add new member with name, phone, plan
THEN: Member appears in DUE TODAY
WHEN: Record payment
THEN: Member dates updated
AND: Member moves to ACTIVE
WHEN: Payment deleted
THEN: Member returns to DUE TODAY
```

---

## Test Execution

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Suite
```bash
npx playwright test 04-payment-management
npx playwright test 05-gym-isolation
```

### Run Critical Tests Only
```bash
npx playwright test --grep @critical
```

### Debug Mode
```bash
npx playwright test --debug
```

### Generate Report
```bash
npx playwright show-report
```

---

## Test Data

### Demo Gyms
| Gym | Email | Password | ID |
|-----|-------|----------|-------|
| Ramesh Gym | ramesh@demo.com | demo123 | 22222222-2222-2222-2222-222222222222 |
| Samrin Gym | samrin@demo.com | demo123 | 33333333-3333-3333-3333-333333333333 |
| Ithris Gym | ithris@demo.com | demo123 | 44444444-4444-4444-4444-444444444444 |
| Nizam Gym | nizam@demo.com | demo123 | 55555555-5555-5555-5555-555555555555 |
| Sheik Gym | sheik@demo.com | demo123 | 66666666-6666-6666-6666-666666666666 |

### Membership Plans
| Plan | Price (₹) | Duration |
|------|-----------|----------|
| Monthly | 1,000 | 1 month |
| Quarterly | 2,500 | 3 months |
| Half-Yearly | 4,500 | 6 months |
| Yearly | 8,000 | 12 months |

---

## Test Coverage Matrix

| Feature | Unit | E2E | Priority |
|---------|------|-----|----------|
| Authentication | ✅ | ✅ | Critical |
| Member CRUD | ✅ | ✅ | Critical |
| Payment Record | ✅ | ✅ | Critical |
| Payment Delete | ✅ | ✅ | Critical |
| Date Reversion | ✅ | ✅ | Critical |
| Gym Isolation | ✅ | ✅ | Critical |
| Dashboard Stats | ⚪ | ✅ | High |
| Calendar View | ⚪ | ✅ | Medium |
| Settings/Plans | ⚪ | ✅ | High |
| User Journeys | ⚪ | ✅ | Critical |

✅ = Covered | ⚪ = Not applicable

---

## Notes

1. **Sequential Execution**: Tests run sequentially (1 worker) to avoid database conflicts
2. **Test Isolation**: Each test cleans up its own data
3. **Database Verification**: Critical tests verify database state directly
4. **UI Resilience**: Tests use multiple selector strategies for robustness
5. **Wait Strategies**: Proper waits for network and state changes

## Version
- Created: December 4, 2024
- Last Updated: December 4, 2024
- Total Test Cases: 100+
