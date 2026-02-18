# Haefit (FitFlow) — Complete Features Document

**Date**: February 18, 2026  
**Version**: Current Production  
**Stack**: React 18 + TypeScript + Vite + Supabase + TailwindCSS + Zustand + TanStack React Query  
**Deployment**: Vercel (auto-deploy from `dev` branch)

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Dashboard](#2-dashboard)
3. [Members Module](#3-members-module)
4. [Member Actions (Unified Popup)](#4-member-actions-unified-popup)
5. [Membership Freeze / Unfreeze](#5-membership-freeze--unfreeze)
6. [Payments Module](#6-payments-module)
7. [Installment Plans](#7-installment-plans)
8. [Calendar Page](#8-calendar-page)
9. [Membership Plans](#9-membership-plans)
10. [Expenses & Profit/Loss Tracking](#10-expenses--profitloss-tracking)
11. [Diet Plans](#11-diet-plans)
12. [Workout Plans](#12-workout-plans)
13. [Check-In System](#13-check-in-system)
14. [Staff Management](#14-staff-management)
15. [Leads Management](#15-leads-management)
16. [Reports & Analytics](#16-reports--analytics)
17. [Admin Tools](#17-admin-tools)
18. [Settings](#18-settings)
19. [Communication & Sharing](#19-communication--sharing)
20. [Receipts](#20-receipts)
21. [Progress Tracking](#21-progress-tracking)
22. [PWA (Progressive Web App)](#22-pwa-progressive-web-app)
23. [Themes](#23-themes)
24. [Multi-Tenant Architecture](#24-multi-tenant-architecture)
25. [Multi-Language Support (i18n)](#25-multi-language-support-i18n)
26. [Audit & Compliance](#26-audit--compliance)
27. [Milestone Celebrations](#27-milestone-celebrations)
28. [Navigation & App Layout](#28-navigation--app-layout)
29. [Database Tables](#29-database-tables)
30. [Edge Cases Handled](#30-edge-cases-handled)
31. [Performance Optimizations](#31-performance-optimizations)

---

## 1. Authentication & Onboarding

### How to Access
Open the app → you'll see the Login page at `/login`.

### Login
- **Email + password** sign-in
- **Social login**: Google, Facebook, Instagram (OAuth via Supabase)
- "Remember Me" toggle
- Animated glass-morphism UI with floating blobs
- Auto-redirect to dashboard if already logged in
- Handles `OnboardingRequiredError` → redirects to onboarding if user exists in auth but has no gym record

### Sign Up (`/signup`)
- 5 fields: Full Name, Email, Phone, Password, Confirm Password
- Password minimum 6 characters, match validation
- Duplicate email detection (via Supabase `identities.length === 0`)
- Email verification flow → `/auth/verify` → `/auth/callback`

### Forgot Password (`/forgot-password`)
- Enter email → sends password reset link via Supabase
- Success state with instructions to check email

### Reset Password (`/reset-password`)
- Session verification on mount (validates token from email link)
- 3 states: loading → invalid/expired link → password form → success
- Password update via `supabase.auth.updateUser()`
- Show/hide password toggle
- Auto signs out after reset → redirects to login after 2 seconds

### Gym Onboarding — First-Time Setup (`/onboarding`)
- **When**: Triggered automatically after first login if no gym exists
- **3-step wizard**:
  1. **Gym Name** — enter your gym's name
  2. **Phone** — gym contact number
  3. **Timezone + Currency** — 7 timezone options, 7 currency options (INR default)
- Creates `gym_gyms` record + `gym_users` record (role: owner)

### Session Management
- Auth state persisted to localStorage via Zustand
- Session mismatch detection: if persisted user ≠ Supabase session user, auto-clears stale state
- On logout: clears React Query cache, gym ID cache, signs out of Supabase

---

## 2. Dashboard

### How to Access
- Bottom nav → **Dashboard** tab (home icon)
- Route: `/` or `/dashboard`

### Overview Cards (3 cards at top)
| Card | What It Shows |
|------|--------------|
| **Till Today** | Total amount collected this month + count of members who paid |
| **Today** | Members due today + members who already paid today |
| **Tomorrow** | Members due tomorrow (preview) |

### Due Today Section
- Lists all members whose payment is due today
- Each member shows: name, plan, amount due
- **WhatsApp button** per member → opens pre-filled reminder message
- **Tap member** → opens full Member Action Popup

### Overdue Section
- Lists members with past-due payments (separate section, red styling)
- Same interaction — tap to open member popup

### UX Features
- Time-based greeting: "Good Morning / Afternoon / Evening"
- Animated number counters (smooth count-up animation)
- Pull-to-refresh with sparkle animation
- Month navigation (forward/backward arrows)
- Milestone celebration alerts (see [Section 27](#27-milestone-celebrations))

---

## 3. Members Module

### How to Access
- Bottom nav → **Members** tab
- Route: `/members`

### Members List
- **Two views**: Card grid view (2-3 columns) and Table view — toggle with icons at top
- **Stats bar**: Active / Inactive / Frozen / Total member counts with animated counters
- **Search**: Across name, email, phone, member number
- **Advanced filters** (filter icon → dialog):
  - Status: All / Active / Inactive / Frozen
  - Plan: Dynamic from your actual plans in DB (shows duration like 1M, 3M, 6M, 12M)
  - Gender: All / Male / Female / Other
  - Joining period: This Month / Last 30 Days / Last 3 Months / Last 6 Months / This Year
  - Sort: Name A-Z / Z-A / Recent / Amount
- **CSV export** button — exports filtered members to CSV file
- **Tap any member** → opens the [Unified Member Popup](#4-member-actions-unified-popup)

### Add Member (`/members/new`) — 3-Step Wizard
**How to access**: Members page → "+" button (top right)

1. **Step 1 — Identity**: Photo (mandatory — upload from gallery or take with camera, auto-compressed), Full Name, Phone
2. **Step 2 — Details**: Email, Gender, Height, Weight (all optional)
3. **Step 3 — Membership**: Plan selection (from your configured plans), Amount (auto-filled from plan), Start Date
- **Duplicate phone detection**: If a phone number already exists for an inactive member, prompts to rejoin instead of creating a duplicate
- **Confetti animation** on successful creation
- **Plan display**: Shows base + bonus months (e.g., "6 Months + 1 FREE")

### Edit Member (`/members/:id/edit`)
**How to access**: Member popup → Edit button, or Member Details → Edit

- Full form with all member fields
- Photo update support
- Status dropdown: Active / Inactive / Frozen
- Cannot change member number or gym ID

### Member Details (`/members/:id`)
**How to access**: Members list → tap a member → "View Full Profile" in popup

- Full profile view with photo, all personal info, membership info
- Payment history
- Progress history
- Action buttons for quick operations

### Member Card (in list)
- Gradient color by plan type (purple=monthly, green=quarterly, blue=half-yearly, amber=annual)
- Plan label with bonus months
- Status badge, next due date, amount
- Lazy-loaded images for performance

---

## 4. Member Actions (Unified Popup)

### How to Access
Tap any member card anywhere in the app (Dashboard, Members list, Calendar). A bottom-sheet popup slides up with all available actions.

### Quick Actions (top row)
| Action | What It Does |
|--------|-------------|
| **WhatsApp** | Opens WhatsApp with pre-filled payment reminder to member's phone |
| **Call** | Opens dialer with member's phone number |
| **Payment History** | Navigates to payment records filtered for this member |
| **Edit** | Opens the edit member page |

### Record Payment (3-Step Wizard)
**When to use**: When a member makes a payment

1. **Step 1 — Plan Selection**: Shows all your configured membership plans with prices
2. **Step 2 — Payment Method + Shift**: Choose Cash / UPI / Card / Bank Transfer / Other. Optional "Shift Payment Cycle" toggle (for overdue members to reset billing anchor)
3. **Step 3 — Confirmation**: Summary showing amount, plan, next due date preview

**Important rules**:
- Payment only allowed within **7 days before** the due date
- Next due date extends from the **current due date**, NOT from today (anchor-based billing)
- "Shift Payment Cycle" lets overdue members pick a new billing anchor date

### Mark Inactive
**When to use**: When a member stops coming and their membership has expired

- Only available for members whose membership end date ≤ today
- Choose from 8 deactivation reasons: Non-payment, Moved away, Health issues, Joined other gym, Financial, Travel, Personal, Other
- Required reason + optional notes
- Warning: "To reactivate, you'll need to record a new payment"

### Rejoin Member
**When to use**: When an inactive member wants to restart their membership

- Appears only for **inactive** members
- Select new plan, payment method, start date
- Start date can be backdated up to 15 days
- Shows next due date preview before confirming

### Freeze / Unfreeze Membership
See [Section 5](#5-membership-freeze--unfreeze) for full details.

### Installment Plan
**When to use**: When a member wants to pay in multiple installments

- **Create Installment Plan** button → opens installment creation modal
- **Track Installments** button → opens tracker to view and pay existing installments
- See [Section 7](#7-installment-plans) for full details

### Track Progress
See [Section 21](#21-progress-tracking) for full details.

### View Membership History
- Shows a vertical timeline of the member's lifecycle
- Event types: Member Created, Status Changed to Inactive, Reactivated, Payment Created
- Summary with join date + current status

---

## 5. Membership Freeze / Unfreeze

### What It Is
Temporarily pause a member's membership (e.g., for travel, injury, personal reasons). While frozen, the member's subscription clock stops. When unfrozen, the end date and next due date are extended by the number of frozen days.

### How to Freeze
1. Open any member's popup (tap their card)
2. Tap the **❄️ Freeze** button (snowflake icon)
3. In the Freeze modal:
   - **Freeze Start Date**: Defaults to today, can be changed
   - **Reason** (optional): e.g., "Travel", "Injury", "Personal"
4. Tap **Freeze Membership**

### What Happens on Freeze
- Member status changes to **"Frozen"**
- A freeze record is created storing the original end date and due date
- Member appears with frozen badge in all lists
- Member cannot be charged payments while frozen

### How to Unfreeze
1. Open the frozen member's popup (tap their card)
2. Tap the **Unfreeze** button
3. Membership automatically resumes

### What Happens on Unfreeze
- The system calculates how many days the membership was frozen
- Both `membership_end_date` and `next_payment_due_date` are extended by the freeze duration
- Example: Frozen for 10 days → membership and due date pushed forward by 10 days
- Status changes back to **"Active"**

### Where Frozen Members Appear
- Members list → Filter by "Frozen" status
- Member cards show frozen badge
- Dashboard stats include frozen count

### Database Table
`gym_membership_freezes` — stores freeze_start, freeze_end, freeze_days, original dates, extended dates, reason

---

## 6. Payments Module

### How to Access
- Bottom nav → **Payments** tab
- Route: `/payments/records`

### Payment Records (`/payments/records`)
- Month-by-month payment history with navigation
- **4 stat cards**: Total, Collected, Pending, Overdue
- **Filter by member**: Via URL params (auto-set when opening from member popup)
- **Advanced filters**: Status, Payment Method, Amount Range, Time Period
- **Delete payment**: With confirmation dialog
  - Deleting a member's first/only payment marks them as inactive
- **CSV export**: Filter-aware filename

### Payment Calendar (`/payments`)
- Full Outlook-style **month calendar** with member avatars in day cells
- **6 stats cards** (clickable to filter):
  - Active Members | Paid This Month | 3/6/12-Month Plan Members
  - Left (Inactive) | Unpaid | Joined This Month
- **Avatar rings**: Green = Paid, Red = Overdue, Amber = Due Today
- **Two views**: Calendar (avatar grid) / List (full table)
- **Day click**: Shows member list popup for that day
- **Month navigation**: Can't go past current month
- **CSV export** (filter-aware)

### Payment Business Logic
| Rule | Description |
|------|-------------|
| **Anchor-based billing** | Next due date extends from current due date, NOT from payment date. Example: Due Dec 1, paid Dec 7 → next due Jan 1 (not Jan 7) |
| **7-day payment window** | Payments only allowed within 7 days before the due date |
| **Shift payment cycle** | For overdue members — reset the billing anchor to a new date |
| **Discounts** | Plans support percentage and flat discount, shows original strikethrough price |
| **Payment methods** | Cash, UPI, Card, Bank Transfer, Other |
| **Statuses** | Paid, Pending, Overdue, Failed |

---

## 7. Installment Plans

### What It Is
Allow members to pay their membership fee in multiple installments instead of one lump sum. The system tracks each installment with its own due date and payment status.

### How to Create an Installment Plan
1. Open any member's popup
2. Tap **Installment Plan** button
3. In the modal:
   - **Total Amount**: The full membership fee
   - **Number of Installments**: 2 or more
   - **Frequency**: Every 15 days or every 30 days
   - **First Payment Method**: Cash / UPI / Card / Bank Transfer / Other
4. Confirm → system creates all installment records automatically

### What Happens
- **First installment** is marked as paid immediately and activates the membership
- Remaining installments are scheduled with future due dates
- Each installment amount is calculated automatically (last one absorbs rounding remainder)
- The membership plan is activated on first payment (same as regular payment flow)

### How to Track & Pay Installments
1. Open the member's popup
2. Tap **Track Installments** button
3. See all installment plans with their statuses
4. Each pending/overdue installment has a **Pay** button
5. Select payment method and pay

### Installment Statuses
| Status | Meaning |
|--------|---------|
| **Pending** | Not yet due or due but not paid |
| **Paid** | Payment completed |
| **Overdue** | Due date passed without payment |
| **Waived** | Forgiven (when plan is cancelled) |

### Plan Statuses
| Status | Meaning |
|--------|---------|
| **Active** | Has pending installments |
| **Completed** | All installments paid |
| **Cancelled** | Plan cancelled, pending installments waived |
| **Defaulted** | Too many missed payments |

### Where Installments Appear
- **Member popup**: Installment Plan + Track buttons
- **Dashboard**: Pending installments included in daily summary
- **Owner WhatsApp summary**: Due installments listed with member details

---

## 8. Calendar Page

### How to Access
- Bottom nav → **Calendar** tab
- Route: `/calendar`

### What It Shows
- Full month grid (6×7 day layout) with member avatars in each day
- Each avatar has a colored ring: Green = Paid, Red = Overdue, Amber = Due Today
- Stats cards at top that double as toggleable filters (tap to filter the calendar)
- **Event priority per day**: Payment > Due Today > Upcoming > Overdue (only highest priority shown per member per day)

### Views
- **Calendar view**: Avatar grid inside date cells
- **List view**: Sortable column table with all events

### Actions
- **Tap a day cell**: Opens popup with member list for that day
- **Tap a member**: Opens full member popup
- **Export**: CSV of all visible calendar data

---

## 9. Membership Plans

### How to Access
- More → **Plans**, or Settings → **Membership Plans** tab
- Route: `/plans`

### What You Can Do
- **Create** / **Edit** / **Delete** membership plans
- **Fields per plan**:
  - Name, Description
  - Base Duration (months)
  - Bonus Months (free months on top)
  - Base Price
  - Discount Type: None / Percentage / Flat
  - Discount Value
  - Final Price (auto-calculated)
  - Promo Description
  - Banner Text (displayed on plan cards)

### Plan Display
- Gradient banner card for each plan
- Strikethrough original price with discount badge (e.g., "20% OFF")
- Duration preview: "Pay for 6 months, Get 1 FREE!"
- Plans split into **Active** and **Inactive** sections

### Safety
- Delete confirmation: "Members using this plan won't be affected"
- Discount capped at 100% or base price (cannot create negative-price plan)

---

## 10. Expenses & Profit/Loss Tracking

### How to Access
- Bottom nav → **More** → **Expenses**
- Route: `/expenses`

### What It Does
Track your gym's monthly expenses and see a real-time Profit/Loss breakdown against your payment income.

### Expense Page Layout
1. **Header**: Month navigator (← Jan 2026 →)
2. **P&L Summary** (3 boxes):
   - 💰 **Income** (green): Total payments collected this month
   - 💸 **Expenses** (red): Total expenses recorded this month
   - 📊 **Profit/Loss**: Income minus Expenses (green if profit, red if loss)
3. **Category Breakdown**: Animated horizontal bars showing spend per category with percentages
4. **Transaction List**: Each expense card shows emoji icon, description, date, payment method, amount, and delete button

### How to Add an Expense
1. Tap the **+** button (green floating button, bottom right)
2. In the modal:
   - **Category** (required): Choose from 8 categories (see below)
   - **Amount** (required): Enter the expense amount
   - **Description**: What was the expense for
   - **Date**: When the expense occurred (defaults to today)
   - **Payment Method**: Cash / UPI / Bank Transfer
   - **Notes**: Any additional details
3. Tap **Add Expense**

### 8 Expense Categories
| Category | Emoji | Example |
|----------|-------|---------|
| Rent | 🏠 | Monthly shop rent |
| Electricity | ⚡ | Power bill |
| Salary | 💰 | Staff salaries |
| Equipment | 🏋️ | New dumbbells, machines |
| Maintenance | 🔧 | Repairs, cleaning |
| Marketing | 📱 | Social media ads, posters |
| Supplements | 💊 | Protein powder for sale |
| Other | 📦 | Anything else |

### How to Delete an Expense
- Tap the trash icon on any expense card → confirms and deletes

---

## 11. Diet Plans

### How to Access
- Bottom nav → **More** → **Diet Plans**
- Route: `/diet-plans`

### What It Does
Create, browse, and share customized diet plans for gym members. Comes pre-loaded with **10 Indian diet templates**.

### Diet Plans List Page
- **Search bar**: Search by plan name
- **Goal filter** (horizontal pills): All / Weight Loss / Muscle Gain / Maintenance / General Fitness / Toning
- **Diet type filter**: All Types / 🥬 Vegetarian / 🍗 Non-Vegetarian / 🥚 Eggetarian
- **Plan cards** show: Name, Template badge, Goal tag (color-coded), Type tag (with emoji), Target Calories, Meal Count, Protein Grams

### Plan Detail Page (`/diet-plans/:id`)
**How to access**: Tap any plan card

Shows:
1. **Plan Info**: Description, Goal badge, Diet Type badge
2. **Macro Targets** (4 boxes): 🔥 Calories, 💪 Protein, 🌾 Carbs, 🫒 Fat
3. **Meals**: Each meal card with name, time, calorie count, and itemized food list
4. **Notes**: Any additional plan notes

### How to Share a Diet Plan
1. Open a diet plan detail page
2. Tap **Share on WhatsApp** (green button at bottom)
3. Opens WhatsApp with a formatted text message containing:
   - Plan name, goal, type
   - All meals with items
   - Macro targets
   - Falls back to clipboard copy if sharing not supported

### How to Delete a Diet Plan
- Open plan detail → Tap trash icon (top right)
- Only available for non-template plans (template plans cannot be deleted)

### How to Assign a Diet Plan to a Member
- Open the member's popup → the assignment is handled through the service layer
- Currently available via `dietPlanService.assignDietPlan(memberId, planId)` — this deactivates any existing assignment and creates a new one

### Pre-loaded Templates (10 Indian Diet Plans)
Weight Loss Veg, Muscle Gain Non-Veg, Budget Protein, Diabetic-Friendly, and 6 more — all with Indian cuisine items, macro breakdowns, and meal schedules.

---

## 12. Workout Plans

### How to Access
- Bottom nav → **More** → **Workouts**
- Route: `/workout-plans`

### What It Does
Create, browse, and share structured workout plans with per-day exercise breakdowns. Comes pre-loaded with **10 workout templates**.

### Workout Plans List Page
- **Search bar**: Search by plan name
- **Goal filter** (horizontal scroll pills): All Goals / 💪 Strength / 🏋️ Hypertrophy / 🔥 Fat Loss / 🏃 Endurance / ⚡ General Fitness
- **Level filter**: All Levels / Beginner / Intermediate / Advanced
- **Plan cards** show: Name, Goal badge (color-coded), Description, Days/Week, Level (with emoji), Total Exercise Count

### Plan Detail Page (`/workout-plans/:id`)
**How to access**: Tap any plan card

Shows:
1. **Plan Info**: Description, Goal badge, Level badge
2. **Stats** (3 boxes): Days/Week, Total Exercises, Duration (weeks)
3. **Day-by-Day Breakdown**: Each day shows:
   - Day name (e.g., "Day 1 — Push Day")
   - Muscle group badges (with emoji: 🏋️ Chest, 💪 Arms, etc.)
   - Exercise list with: Name, Sets × Reps (e.g., "4×12"), Rest time, Notes
4. **Notes**: Additional plan notes

### How to Share a Workout Plan
1. Open a workout plan detail page
2. Tap **Share on WhatsApp** (green button at bottom)
3. Opens WhatsApp with formatted text containing all exercises, sets, reps, rest times per day

### How to Delete a Workout Plan
- Open plan detail → Tap trash icon (top right)
- Only available for non-template plans

### How to Assign a Workout Plan to a Member
- Via `workoutPlanService.assignWorkoutPlan(memberId, planId)` — deactivates existing assignment, creates new one

### 8 Muscle Groups Tracked
Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Cardio — each with emoji + color coding

### Pre-loaded Templates (10 Workout Plans)
Beginner Full Body, Bro Split, PPL 6-Day, Upper/Lower, Circuit Training, Women's Toning, Home Workout, 5×5 Strength, Abs Add-On, Beginner PPL — all with full exercise details.

---

## 13. Check-In System

### How to Access
- More → **Check-in**
- Route: `/checkin`

### Manual Check-In
1. Type member name, email, or phone in the search bar
2. Select from top 5 results
3. Confirm check-in
4. **Success animation**: Member photo slides up with confetti burst, "Checked In! 💪" message, auto-dismisses after 2.2 seconds
- Duplicate check-in prevention (can't check in same member twice)

### Stats Dashboard
| Stat | Description |
|------|-------------|
| **Today's Check-ins** | Total check-ins today |
| **Currently Inside** | Members checked in but not checked out |
| **Avg Duration** | Average time spent (in minutes) |

### Recent Activity
- Last 10 check-ins with timestamp
- Method badge: 📷 QR / ✍️ Manual
- Auto-refreshes every 30 seconds

### QR Code Check-In
- QR generation per member with JSON payload containing: `{ type, memberId, gymId, timestamp }`
- QR can be downloaded as image
- Scan tab available (camera implementation pending)

---

## 14. Staff Management

### How to Access
- More → **Staff**
- Route: `/staff`

### Staff List
- Table view with role-based color badges:
  - 🟣 Owner (purple), 🔵 Manager (blue), 🟢 Trainer (green), 🟡 Receptionist (yellow)
- Stats: Total Staff, Trainers, Receptionists, Managers

### How to Add Staff
1. Tap "+" button
2. Fill: Name, Email, Phone, Role, Hire Date
3. System creates a Supabase auth user + gym_users record
4. Sends password reset email so the staff member can set their password

### How to Edit Staff
- Tap a staff row → Edit modal
- Update name, phone, role, hire date (email is locked)

### How to Deactivate Staff
- Tap deactivate → confirmation dialog
- Removes system access

### Role-Based Permissions (11 Permissions)
| Permission | Description |
|-----------|-------------|
| `manage_members` | Add, edit, deactivate members |
| `manage_payments` | Record and manage payments |
| `manage_plans` | Create and edit membership plans |
| `view_reports` | Access reports & analytics |
| `manage_staff` | Add, edit, deactivate staff |
| `manage_settings` | Change gym settings |
| `check_in_members` | Perform member check-ins |
| `manage_classes` | Manage class schedules |
| `manage_leads` | Handle lead pipeline |
| `view_dashboard` | Access the dashboard |
| `manage_gym` | Full gym admin access |

---

## 15. Leads Management

### How to Access
- More → **Leads**
- Route: `/leads`

### What It Does
Track potential members through a sales pipeline from first contact to conversion.

### 6 Pipeline Stages
New → Contacted → Qualified → Negotiation → Converted → Lost

### Stats
- Total Leads, New, Contacted, Qualified, Conversion Rate %

### How to Add a Lead
1. Tap "+" button
2. Fill: First Name, Last Name, Phone, Email
3. Select **Source**: Walk-in / Referral / Social Media / Website / Google Ads / Other
4. **Interested In**: What plan/service they're interested in
5. **Notes**: Any follow-up details

### How to Update Lead Status
- Each lead has an inline status dropdown
- Change status to move them through the pipeline

---

## 16. Reports & Analytics

### How to Access
- More → **Reports**
- Route: `/reports`

### Revenue Tab
- Bar chart visualization of monthly revenue
- Growth rate calculation: `((current − previous) / previous) × 100`
- Data from actual `gym_payments` table

### Membership Tab
- Monthly table: New Members, Active Members, Churned Members
- Data from `gym_members` queries

### Attendance Tab
- Monthly table: Total Check-ins, Unique Members
- Data from `gym_check_ins` queries

### Class Utilization Tab
- Placeholder (for future Classes feature)

---

## 17. Admin Tools

### Payment Audit (`/settings/payment-audit`)
**How to access**: Settings → (scroll down or admin section)

**What It Does**: Auditing tool that replays the Supabase trigger logic client-side to verify that every member's stored `next_payment_due_date` matches what it should be. Finds data inconsistencies.

**Layout**:
- 3 stat cards: Total Members / Correct / Mismatch
- Search + Filter tabs: All / Mismatch / Correct
- Card view or Table view toggle
- Each member shows: Stored due date vs Expected due date, with ✅ or ❌

**How to Use**:
1. Navigate to the audit page
2. Wait for it to load all member + payment data
3. Review mismatches (highlighted in red)
4. Filter to "Mismatch" tab to see only issues
5. Export CSV for records

### Monthly Overview (`/admin/monthly-overview`)
**How to access**: Settings → Monthly Overview link

**What It Does**: A comprehensive admin dashboard showing all member activity for any month — joins, departures, payments, unpaid, overdue, due date issues.

**Layout**:
- Month selector with navigation arrows
- 6 stat cards: Active, Collected ($), Paid, Unpaid, Overdue, No Plan
- 7 category tabs: All / New / Left / Paid / Unpaid / Due Issues / Overdue
- Card view or Table view
- **Detail popup** per member with: full profile, membership info grid, due date audit (stored vs expected + recommended action), payment history (last 10)

**How to Use**:
1. Navigate to Monthly Overview
2. Select the month you want to review
3. Use tabs to filter by category
4. Tap any member for full details
5. Check "Due Issues" tab for discrepancies
6. Export CSV for reporting

### Member Categories in Monthly Overview
| Category | Meaning |
|----------|---------|
| `new_join` | Joined this month |
| `inactive` | Became inactive this month |
| `reactivated` | Came back from inactive this month |
| `paid` | Made a payment this month |
| `unpaid` | Active but no payment this month |
| `due_date_issue` | Stored due date doesn't match expected |
| `no_plan` | No membership plan assigned |
| `overdue` | Payment overdue |

---

## 18. Settings

### How to Access
- More → **Settings** (first card)
- Route: `/settings`

### 6 Settings Tabs

#### My Profile
- User avatar, email, gym name, role badge
- **Sign Out** button

#### Install App (PWA)
- Detects your platform: iOS / Android / Desktop
- **iOS**: Step-by-step instructions with screenshots (Share → Add to Home Screen)
- **Android/Desktop**: Native install button using browser's install prompt
- Already installed detection
- Benefits grid explaining why to install

#### Gym Profile
- **Logo**: Upload your gym's logo (stored in Supabase)
- **Edit fields**: Gym Name, Email, Phone, Timezone, Address, City, State, Pincode

#### Membership Plans
- Full Create / Edit / Delete (see [Section 9](#9-membership-plans))

#### Theme
- 11 beautiful themes to choose from (see [Section 23](#23-themes))
- One-tap to switch — changes apply instantly
- Persisted per gym

#### Notifications
- Toggle switches for: Email / SMS / WhatsApp notifications
- Visual toggles (backend persistence coming soon)

### Feature Toggles (in Settings)
Toggle switches for future features: Biometric Access, Class Booking, Personal Training, POS, Nutrition Tracking, Lead Management, SMS Notifications, Email Marketing

---

## 19. Communication & Sharing

### WhatsApp Integration
Available from multiple places in the app:

| Where | What Gets Sent |
|-------|---------------|
| **Dashboard** (due-today cards) | Payment reminder with member name + amount |
| **Member Popup** | Quick WhatsApp open to member's number |
| **Diet Plan Detail** | Full diet plan with meals + macros |
| **Workout Plan Detail** | Full workout plan with exercises per day |
| **Progress Compare** | Before/after measurement comparison text |
| **Receipt** | Formatted payment receipt |
| **Owner Daily Summary** | Full daily business summary with stats, collections, due members, installments |

All WhatsApp messages open `wa.me/91{phone}?text={encoded_message}` with pre-formatted text including emojis.

### Phone Call
One-tap `tel:{phone}` from member popup.

### Export & Sharing
| Export Type | Format | Available From |
|------------|--------|---------------|
| Members list | CSV | Members page |
| Payment records | CSV | Payment Records page |
| Calendar data | CSV | Calendar page |
| Progress history | Excel (XLSX) | Progress view in member popup |
| Audit data | CSV | Payment Audit page, Monthly Overview |
| Screenshots | PNG | Progress comparison (via html2canvas) |

All CSV exports use UTF-8 BOM encoding for Excel compatibility.

---

## 20. Receipts

### What It Is
Generate professional payment receipts as PDF downloads or WhatsApp-shareable text.

### How to Generate a Receipt
After recording a payment, the receipt can be generated from the payment record.

### Receipt Formats
- **PDF Download**: 80×180mm thermal-style receipt with gym branding, member info, payment details, date, receipt number
- **WhatsApp Share**: Opens WhatsApp with formatted text containing all receipt details
- **Web Share / Clipboard**: Uses the browser's native share API, falls back to clipboard copy

### Receipt Contents
- Gym name and branding
- Member name
- Payment amount (Indian locale formatting: ₹1,000)
- Payment method
- Payment date
- Plan details
- Receipt number

---

## 21. Progress Tracking

### How to Access
- Open any member's popup → "Track Progress" section

### Add Progress (3-Step Wizard)
1. **Step 1 — Photos**: 4 photo slots (Front / Back / Left / Right) — capture with camera or upload
2. **Step 2 — Core Measurements**: Weight (kg), Height (cm), Body Fat %
3. **Step 3 — Body Measurements**: Chest, Waist, Hips, Biceps, Thighs, Calves (all in cm), Notes

### Photos
- Camera integration with front/back camera toggle
- Auto-compression (800×800, 80% quality)
- Stored in Supabase storage

### Auto-Calculations
- **BMI**: Calculated automatically from weight and height
- **BMI Category badge**: Underweight / Normal / Overweight / Obese (color-coded)

### Monthly Limit
- Maximum **4 progress entries per month** per member (server-validated)

### View Progress History
- Timeline list of all progress entries with dates
- Tap any entry for full detail view (all measurements + photos)

### Compare Progress
1. From progress history, select **2 entries** to compare
2. Side-by-side comparison opens with:
   - **Photos tab**: Front / Back / Left / Right with quick-nav thumbnails
   - **Measurements tab**: Before → After with difference indicators
   - Green = improvement, Red = decline
   - Smart color inversion for metrics where decrease is good (weight, waist, BMI)
3. **Export**: Download as Excel
4. **Share**: Send comparison via WhatsApp (text summary or screenshot)

---

## 22. PWA (Progressive Web App)

### What It Is
The app can be installed on your phone or computer as a standalone app — works like a native app from your home screen.

### How to Install
- **iOS**: Open in Safari → Share button → "Add to Home Screen"
- **Android**: Banner prompt appears automatically, or Menu → "Install App"
- **Desktop**: Chrome address bar shows install icon, or Settings → Install App tab

### PWA Features
| Feature | Description |
|---------|-------------|
| **Installable** | Works as standalone app from home screen |
| **Offline support** | Previously cached pages work without internet |
| **Fast loading** | Cached HTML served instantly, updates in background |
| **Full-screen** | No browser chrome — pure app experience |
| **Splash screen** | Animated logo on launch |
| **Icons** | 192px + 512px (regular + maskable) |
| **Push notifications** | Handler registered (backend triggers coming) |

### Technical Details
- Service Worker with stale-while-revalidate strategy for navigation
- Navigation Preload API for fast cold starts
- Cache versioning with auto-cleanup
- `skipWaiting()` + `clients.claim()` for instant updates

---

## 23. Themes

### How to Access
Settings → **Theme** tab

### 11 Available Themes

| # | Theme Name | Type | Vibe |
|---|-----------|------|------|
| 1 | **Fresh Mint** | Light | Default — clean green/white |
| 2 | **Mocha Mousse** | Light | Warm brown tones |
| 3 | **Midnight Ocean** | Dark | Deep blue oceanic |
| 4 | **Aurora Purple** | Dark | Purple northern lights |
| 5 | **Pure AMOLED** | Dark | True black for OLED screens |
| 6 | **Instagram Sunset** | Light | Warm gradient inspired by IG |
| 7 | **Twitter Sky** | Light | Clean blue (X/Twitter inspired) |
| 8 | **Spotify Pulse** | Dark | Dark green (Spotify inspired) |
| 9 | **TikTok Vibe** | Dark | Dark with accent colors |
| 10 | **Frosted Pearl** | Light | Elegant pearlescent white |
| 11 | **Liquid Glass** | Light | Apple-style frosted glass effects |

### How to Change Theme
1. Go to Settings → Theme tab
2. Tap any theme card to preview and apply
3. Theme persists across sessions (stored per gym in localStorage)

### What Changes
Each theme updates 28+ CSS variables affecting: backgrounds, floating blobs, card surfaces, primary accent color, text colors, status indicators, sidebar, input fields, icon backgrounds, glass effects, navigation bar.

---

## 24. Multi-Tenant Architecture

### What It Means
Every gym's data is completely isolated. If you have multiple gyms, each sees only its own members, payments, plans, staff, etc.

### How It Works
- Every database query is scoped by `gym_id`
- `getCurrentGymId()` retrieves your gym ID with 5-minute caching
- Cache cleared on logout (prevents data leakage between accounts)
- Row Level Security (RLS) on all tables in Supabase
- Gym-specific theme and settings storage

---

## 25. Multi-Language Support (i18n)

### Available Languages
| Code | Language |
|------|----------|
| `en` | English |
| `te` | Telugu (తెలుగు) |
| `ta` | Tamil (தமிழ்) |
| `hi` | Hindi (हिन्दी) |

### How It Works
- Browser language auto-detection on first visit
- Language preference cached in localStorage
- Can be changed in Settings → Gym Profile → Preferred Language
- Translation coverage: Partial — most core UI is English, with key labels translated

---

## 26. Audit & Compliance

### Audit Logging (Automatic — No User Action Needed)
Every important action in the app is automatically logged for security and accountability:

| Category | Actions Tracked |
|----------|----------------|
| **Members** | Created, updated, deleted, status changed |
| **Payments** | Created, updated, deleted |
| **Plans** | Created, updated, deleted |
| **Staff** | Created, updated, deactivated |
| **Leads** | Created, updated |
| **Settings** | Changed |
| **Check-ins** | Created |
| **Expenses** | Created, updated, deleted |
| **Membership Freeze** | Frozen, unfrozen |
| **Diet Plans** | Created, deleted, assigned, shared |
| **Workout Plans** | Created, deleted, assigned, shared |

### Audit System Features
- Queue-based with 3-second flush intervals (batches writes for performance)
- `beforeunload` handler ensures unflushed logs are sent before page closes
- PII sanitization: email/phone stripped from logged payloads
- 40+ action types tracked

### Compliance Framework
- GDPR, CCPA, SOX, HIPAA monitoring
- Anomaly detection with 5-minute scan intervals
- Severity levels: Low / Medium / High / Critical
- Rate-limited notifications to `audit_anomalies` table

### Debug Dashboard (Development Only)
- Route: `/debug` (only accessible in dev mode)
- Real-time log monitoring via Supabase channel subscription
- Charts: Event type distribution pie chart, API response time bar chart
- 6 stat cards, 4 tabs (Overview, Audit Logs, API Calls, Sessions)
- CSV export of last 1000 audit logs

---

## 27. Milestone Celebrations

### What It Is
Automatic celebrations when your gym hits key milestones — full-screen confetti animation with a trophy, auto-dismisses after 3.2 seconds.

### Member Milestones
Triggered at: **25, 50, 100, 200, 500, 1000** total members

### Revenue Milestones
Triggered at: **₹10K, ₹50K, ₹1 Lakh, ₹5 Lakh, ₹10 Lakh** total revenue

### What Happens
- Full-screen overlay with 32-particle confetti rain
- 🏆 Trophy icon with milestone text
- Haptic feedback on mobile
- Auto-dismisses — no action needed from you

---

## 28. Navigation & App Layout

### Bottom Navigation Bar (5 Tabs)
| Tab | Route | Icon | What It Opens |
|-----|-------|------|--------------|
| **Dashboard** | `/` | Home | Main dashboard with stats + due members |
| **Members** | `/members` | Users | Full member list with search/filter |
| **Calendar** | `/calendar` | Calendar | Month view with member avatars |
| **Payments** | `/payments/records` | Receipt | Payment records and history |
| **More** | `/more` | Grid | Hub page with 10 feature links |

### More Page — Feature Hub
The "More" tab opens a grid of 10 feature cards:

| Card | Goes To |
|------|---------|
| ⚙️ Settings | `/settings` |
| 💰 Expenses | `/expenses` |
| 🍽️ Diet Plans | `/diet-plans` |
| 🏋️ Workouts | `/workout-plans` |
| 📊 Reports | `/reports` |
| 👥 Staff | `/staff` |
| 📋 Leads | `/leads` |
| 📱 Check-in | `/checkin` |
| 📖 Plans | `/plans` |
| 📅 Classes | `/classes` |

### Navigation Features
- Smooth page transitions (Framer Motion fade + slide)
- Glass/blur navigation bar with themed styling
- Haptic feedback on tab taps (mobile)
- Safe area inset support (notch/home indicator)

---

## 29. Database Tables (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `gym_gyms` | Gym profiles (name, timezone, currency, settings, logo) |
| `gym_users` | Staff/owner accounts linked to auth + gym |
| `gym_members` | Member records with plan, status, dates, photo |
| `gym_payments` | Payment transactions (method, amount, status, dates) |
| `gym_payment_schedule` | Scheduled/due payment entries |
| `gym_membership_plans` | Plan definitions (pricing, duration, bonus, promo) |
| `gym_membership_periods` | Member enrollment periods (rejoin history) |
| `gym_member_history` | Lifecycle events (created, deactivated, reactivated) |
| `gym_member_progress` | Body measurements and photos |
| `gym_check_ins` | Check-in records (method, timestamps) |
| `gym_leads` | Lead pipeline (source, status, follow-up) |
| `gym_expenses` | Expense records (category, amount, method, date) |
| `gym_membership_freezes` | Freeze records (start, end, days, original/extended dates) |
| `gym_diet_plans` | Diet plans (meals, macros, goal, type, template flag) |
| `gym_member_diet_assignments` | Member-to-diet-plan assignments |
| `gym_workout_plans` | Workout plans (days, exercises, goal, level, template flag) |
| `gym_member_workout_assignments` | Member-to-workout-plan assignments |
| `gym_settings` | Gym configuration and feature flags |
| `gym_audit_logs` | Audit trail for all actions |
| `gym_api_logs` | API call tracking with response times |
| `audit_anomalies` | Compliance anomaly detection records |

### Key Database Features
- **RPC functions**: `rpc_create_member_with_payment` (atomic member + payment creation)
- **Triggers**: Auto-calculate next due date, membership end date on payment insert
- **RLS (Row Level Security)**: Every table protected — users can only see their gym's data
- **Storage buckets**: `member-photos`, `images`, `gym-logos`

---

## 30. Edge Cases Handled

### Payment Edge Cases
1. Payment only allowed within 7-day window before due date
2. Anchor-based billing preserves due date continuity regardless of actual payment date
3. Shift payment cycle available for overdue members to reset billing anchor
4. First payment deletion → auto-deactivates member (not deleted from system)
5. Plan price shows final discounted price, not base price
6. Installment payments don't re-extend membership dates (only first payment activates)

### Member Lifecycle Edge Cases
1. Duplicate phone detection during add (prevents duplicate records)
2. Inactive marking restricted to expired memberships only
3. Rejoin flow: creates new period, allows backdating up to 15 days
4. 8 distinct deactivation reasons tracked for analytics
5. Photo required during wizard flow (with compression to reduce storage)
6. Progress tracking limited to 4 entries/month
7. Reactivation requires new payment (enforces revenue continuity)
8. Frozen members cannot receive payments — must unfreeze first
9. Freeze extends both end date and due date by exact freeze duration

### Calendar Edge Cases
1. Event deduplication: same member, same day → highest priority event shown
2. Priority: payment > due today > upcoming > overdue
3. Future months blocked in navigation
4. Unpaid = Active − MultiMonth − Paid (derived, not stored)

### Session Edge Cases
1. Persisted auth state validated against actual Supabase session on every protected route
2. Stale state auto-cleared on mismatch
3. Gym ID cache cleared on logout
4. Back-forward cache handled (forces reload on `pageshow` if `persisted`)

---

## 31. Performance Optimizations

| Optimization | Where |
|-------------|-------|
| `React.memo` on MemberCard | Prevents unnecessary re-renders in member list |
| CSS-only blob animations | Background blobs use CSS, not JS |
| Lazy image loading | `loading="lazy"` on all member photos |
| 5-minute gym ID cache | `getCurrentGymId()` reduces DB lookups |
| Code splitting | All secondary pages lazy-loaded with `React.lazy()` |
| Deferred tool loading | Components load on navigation, not upfront |
| Debounced search | 500ms debounce on member/phone lookups |
| Audit log batching | Queue + 3-second flush interval |
| Removed expensive effects | No `backdrop-blur` on stats cards, no `AnimatePresence` on card lists |
| Optimistic cache updates | Member creation reflects instantly before server confirms |

---

## Quick Reference — All Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/signup` | Sign Up | Public |
| `/forgot-password` | Forgot Password | Public |
| `/reset-password` | Reset Password | Via email link |
| `/auth/verify` | Verify Email | Via email link |
| `/auth/callback` | Auth Callback | Automatic |
| `/` | Dashboard | Bottom nav — Dashboard |
| `/members` | Members List | Bottom nav — Members |
| `/members/new` | Add Member | Members → + button |
| `/members/:id` | Member Details | Member popup → View Profile |
| `/members/:id/edit` | Edit Member | Member popup → Edit |
| `/calendar` | Calendar | Bottom nav — Calendar |
| `/payments/records` | Payment Records | Bottom nav — Payments |
| `/payments` | Payment Calendar | Payments → Calendar view |
| `/more` | More (Feature Hub) | Bottom nav — More |
| `/expenses` | Expenses & P/L | More → Expenses |
| `/diet-plans` | Diet Plans List | More → Diet Plans |
| `/diet-plans/:id` | Diet Plan Detail | Tap a diet plan |
| `/workout-plans` | Workout Plans List | More → Workouts |
| `/workout-plans/:id` | Workout Plan Detail | Tap a workout plan |
| `/plans` | Membership Plans | More → Plans |
| `/checkin` | Check-In | More → Check-in |
| `/staff` | Staff Management | More → Staff |
| `/leads` | Leads Pipeline | More → Leads |
| `/reports` | Reports & Analytics | More → Reports |
| `/classes` | Classes List | More → Classes |
| `/settings` | Settings (6 tabs) | More → Settings |
| `/settings/payment-audit` | Payment Audit | Settings → admin |
| `/admin/monthly-overview` | Monthly Overview | Settings → admin |
| `/onboarding` | Gym Onboarding | Auto (first login) |
| `/debug` | Debug Dashboard | Dev mode only |

---

*This document represents the complete feature set of the Haefit (FitFlow) gym management application as of February 18, 2026. All features listed above are implemented and functional in the current codebase unless explicitly noted otherwise. This document supersedes the previous version dated February 12, 2026.*
