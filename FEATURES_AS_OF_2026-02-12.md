# Haefit (FitFlow) — Features Document

**Date**: February 12, 2026  
**Version**: Current Production  
**Stack**: React 18 + TypeScript + Vite + Supabase + TailwindCSS + Zustand + TanStack React Query

---

## 1. Authentication & Onboarding

### Login
- Email + password sign-in
- Social login: Google, Facebook, Instagram (OAuth via Supabase)
- "Remember Me" toggle
- Animated glass-morphism UI with floating blobs
- Auto-redirect to dashboard on active session
- Handles `OnboardingRequiredError` → redirects to onboarding if user exists in auth but has no gym record

### Sign Up
- 5 fields: full name, email, phone, password, confirm password
- Password minimum 6 characters, match validation
- Duplicate email detection (via Supabase `identities.length === 0`)
- Email verification flow → `/auth/verify` → `/auth/callback`

### Forgot Password
- Email input → sends password reset link via Supabase
- Success state with instructions to check email

### Reset Password
- Session verification on mount (validates token from email link)
- 3 states: loading, invalid/expired link, password form, success
- Password update via `supabase.auth.updateUser()`
- Show/hide password toggle
- Auto signs out after reset → redirects to login after 2 seconds

### Gym Onboarding (First-Time Setup)
- 3-step wizard: Gym Name → Phone → Timezone + Currency
- 7 timezone options, 7 currency options (INR default)
- Creates `gym_gyms` record + `gym_users` record (role: owner)
- Protected route — requires authentication

### Session Management
- Zustand store persisted to localStorage (user, gym, isAuthenticated)
- Session mismatch detection: if persisted user ≠ Supabase session user, auto-clears stale state
- On logout: clears React Query cache, gym ID cache, signs out of Supabase

---

## 2. Dashboard

### Overview Cards (3 cards)
- **Till Today**: Total amount collected this month + count of members who paid
- **Today**: Members due today + members who already paid today
- **Tomorrow**: Members due tomorrow (preview)

### Due Today Column
- Lists all members whose payment is due today
- Each member shows name, plan, amount due
- WhatsApp shortcut button per member → opens reminder message
- Click member → opens `UnifiedMemberPopup` for full actions

### Overdue Column
- Lists members with past-due payments (separate section, distinct styling)
- Same interaction — click to open member popup

### UX Features
- Time-based greeting: "Good Morning/Afternoon/Evening"
- Animated number counters (800ms, 20-step animation)
- Pull-to-refresh with sparkle animation
- Month navigation (forward/backward)
- Integrated bottom navigation bar

---

## 3. Members Module

### Members List
- **Views**: Card grid view + Table view (toggle)
- **Stats bar**: Active / Inactive / Total member counts
- **Search**: Across name, email, phone, member number
- **Advanced filters**: Status (all/active/inactive/expired), Plan (dynamic from DB), Gender, Joining period (this month/last 3M/last 6M/this year), Sort (name A-Z/Z-A/recent/amount)
- **CSV export** of filtered members

### Add Member — 3-Step Wizard
1. **Step 1**: Photo (mandatory — upload or camera capture with compression), Full Name, Phone
2. **Step 2**: Email, Gender, Height, Weight (all optional)
3. **Step 3**: Membership Plan selection, Amount, Start Date
- Real-time duplicate phone detection (debounced 500ms)
- Plan separation: Regular plans vs Special plans (with bonus months)
- Confetti success animation on creation
- Optimistic cache update

### Edit Member
- Full-page edit form with all member fields
- Photo update support

### Member Card
- Gradient color by plan type
- Plan label shows base + bonus months (e.g., "6 Months + 1 FREE")
- Status badge, next due date, amount
- Click → opens `UnifiedMemberPopup`
- Lazy-loaded images, performance optimized (`React.memo`)

### Phone-Check Rejoin Flow
- When adding a member, if phone already exists for an inactive member:
  - Prompts to rejoin instead of creating duplicate
  - Opens `RejoinMemberModal` with member details pre-filled

---

## 4. Member Actions (UnifiedMemberPopup)

This is the central action hub when clicking any member card anywhere in the app:

### Quick Actions
- **WhatsApp**: Opens `wa.me/91{phone}` with pre-filled reminder message
- **Call**: Opens `tel:{phone}`
- **Payment History**: Navigates to `/payments/records?member={id}&name={name}`

### Record Payment (3-Step Wizard)
1. **Plan Selection**: Shows all available plans with price
2. **Payment Method + Shift Option**: Cash/UPI/Card/Bank Transfer/Other + optional "Shift Payment Cycle" toggle
3. **Confirmation**: Summary with next due date preview
- **7-day payment window**: Only allowed within 7 days before due date
- **Anchor-based billing**: Next due date extends from current due date, NOT from today
- **Shift Payment Cycle**: Allows changing the billing anchor day with custom date picker + calculates new next due date

### Mark Inactive
- Only allowed for expired members (membership end date ≤ today)
- 8 deactivation reasons: Non-payment, Moved away, Health issues, Joined other gym, Financial, Travel, Personal, Other
- Required reason selection + optional notes
- Warning: "To reactivate, you'll need to record a new payment"

### Rejoin Member
- For inactive members — creates new membership period
- Plan selection (regular + special grid)
- Payment method selection
- Start date picker (up to 15 days in the past)
- Next due date preview before confirming

### Track Progress
- **Add Progress** (3-step wizard):
  1. Date & Photos (front/back/left/right — camera or upload)
  2. Core measurements: Weight, Height, Body Fat %
  3. Details: Chest, Waist, Hips, Biceps, Thighs, Calves + Notes
- Camera integration with front/back toggle
- Image compression (800×800, 80% quality)
- BMI auto-calculation with category badge
- 4 entries per month limit (server-validated)

### View Progress History
- Timeline list of all progress entries
- **Detail view**: Full measurements + photos
- **Compare mode**: Select any 2 entries → side-by-side comparison
  - Photos tab: Front/Back/Left/Right with quick-nav thumbnails
  - Measurements tab: Before → After with diff indicators (green = improvement, red = decline)
  - Smart color inversion for metrics where decrease = good (weight, waist, BMI)
- Export to Excel
- Share via WhatsApp (text summary or screenshot capture via `html2canvas`)

### View Membership History
- Vertical timeline with colored event dots
- Event types: Member Created, Status Changed to Inactive, Reactivated, Payment Created
- Summary: Join date + current status
- Data from `gym_membership_periods` + `gym_member_history` tables

---

## 5. Payments Module

### Payment Calendar (Primary — CalendarPage)
- **Full Outlook-style month calendar** with member avatars in day cells
- **6 stats cards** (clickable to filter):
  - Active members | Paid this month | 3/6/12-Month plan members
  - Left (inactive) | Unpaid (Active − MultiMonth − Paid) | Joined this month
- **Avatar rings**: Green = Paid, Red = Overdue, Amber = Due Today
- **Event deduplication**: Per member per day, priority: payment > due today > upcoming > overdue
- **Two view modes**: Calendar (avatar grid) / List (full table)
- **Advanced filters**: Status, Plan Duration, Gender, Payment Status
- **Sort**: Date asc/desc, Amount desc
- **Month navigation**: Can't go past current month (future blocked)
- **Day click**: Popup with member list → click member → full member popup
- **CSV export** (filter-aware filename)

### Payment Records
- Month-by-month payment history
- 4 stat cards: Total, Collected, Pending, Overdue
- Filter by specific member (via URL params)
- Advanced filters: status, payment method, amount range, time period
- Delete payment with confirmation
- First-payment deletion logic: marks member as inactive (not deleted)
- CSV export

### Payment Business Logic
- **Anchor-based due dates**: Extends from previous due date, not payment date
  - Example: Due Dec 1, paid Dec 7 → next due Jan 1 (not Jan 7)
- **Shift payment cycle**: For overdue members to reset billing anchor
- **Plan discounts**: Supports percentage and flat discount, shows original strikethrough price
- **Payment methods**: Cash, UPI, Card, Bank Transfer, Other
- **Statuses**: Paid, Pending, Overdue, Failed

---

## 6. Calendar Page

- Full month grid with 6×7 day layout
- Avatar-based day cells showing member photos
- Stats cards that double as filters (click to toggle)
- Animated number counters on stats
- List view alternative with sortable columns
- Filter dialog with pill-button selectors
- Export functionality

---

## 7. Membership Plans

### Plan Management (Settings → Plans)
- **Create/Edit/Delete** plans
- **Fields**: Name, Description, Base Duration (months), Bonus Months, Base Price, Discount Type (none/percentage/flat), Discount Value, Final Price (auto-calculated), Promo Description, Banner Text
- **Promo display**: Gradient banner, strikethrough original price, percentage OFF badge
- **Duration preview**: "Pay for X months, Get Y FREE!"
- **Active/Inactive** sections
- **Delete safety**: "Members using this plan won't be affected"
- **Price calculation**: Percentage → `base × (1 − discount/100)`, Flat → `base − discount`
- Discount capped at 100% or base price

---

## 8. Check-In System

### Manual Check-In
- Search by name, email, or phone
- Top 5 results displayed
- Select member → confirm check-in
- Duplicate check-in prevention

### Stats Dashboard
- Today's total check-ins
- Currently inside (members who checked in but haven't checked out)
- Average duration (in minutes)

### Recent Activity
- Last 10 check-ins with timestamp
- Method badge: 📷 QR / ✍️ Manual
- 30-second auto-refresh

### QR Code
- QR generation per member with JSON payload
- Scan tab exists (camera not yet implemented)

---

## 9. Staff Management

- **Table view** with role-based badges: Owner (purple), Manager (blue), Trainer (green), Receptionist (yellow)
- **Stats**: Total Staff, Trainers, Receptionists, Managers
- **Add Staff**: Creates Supabase auth user + `gym_users` record, sends password reset email
- **Edit Staff**: Update name, phone, role, hire date (email locked)
- **Deactivate**: Confirmation modal, removes system access
- **Role-based permissions**: 11 granular permissions (manage_members, manage_payments, manage_plans, view_reports, manage_staff, manage_settings, check_in_members, manage_classes, manage_leads, view_dashboard, manage_gym)

---

## 10. Leads Management

- **6 pipeline stages**: New → Contacted → Qualified → Negotiation → Converted → Lost
- **Stats**: Total, New, Contacted, Qualified, Conversion Rate %
- **Add Lead**: First name, Last name, Phone, Email, Source (walk-in/referral/social media/website/google ads/other), Interested In, Notes
- **Inline status change**: Dropdown per lead to move through pipeline
- **Follow-up tracking**

---

## 11. Reports & Analytics

### Revenue Tab
- Bar chart visualization
- Monthly revenue from `gym_payments` (real Supabase data)
- Growth rate calculation: `((current − previous) / previous) × 100`
- Loading states

### Membership Tab
- Monthly table: New members, Active members, Churned members
- Data from `gym_members` queries

### Attendance Tab
- Monthly table: Total check-ins, Unique members
- Data from `gym_check_ins` queries

### Class Utilization Tab
- Placeholder (for future Classes feature)

---

## 12. Settings

### Profile Tab
- User avatar, email, gym name, role badge
- Sign Out button

### Install App (PWA)
- Platform detection: iOS / Android / Desktop
- iOS: Step-by-step instructions (Share → Add to Home Screen)
- Android/Desktop: Native install prompt via `beforeinstallprompt` event
- Already installed detection
- Benefits grid explaining why to install

### Gym Profile
- Logo upload (Supabase Storage)
- Edit: Gym name, email, phone, timezone, address, city, state, pincode

### Membership Plans
- Full CRUD (see Section 7 above)

### Theme
- 10 complete themes (each with 20+ CSS variables)
- Per-gym persistence in localStorage
- Updates: backgrounds, cards, text, blobs, glass effects, navigation, iOS status bar

### Notifications
- Email / SMS / WhatsApp toggles
- Visual-only (no backend persistence yet)

---

## 13. PWA (Progressive Web App)

- **Installable** on iOS, Android, Desktop
- **Service Worker**: Network-first strategy with cache fallback
- **Offline support**: Cached assets served when network unavailable
- **Cache versioning**: `haefit-v2`, auto-cleans old caches
- **Push notifications**: Handler registered (backend trigger not yet implemented)
- **Icons**: 192px + 512px (regular + maskable)
- **Standalone mode**: Full-screen app experience without browser chrome
- **Splash screen**: Animated logo → expand → exit with pulsing rings and loading dots

---

## 14. Multi-Tenant Architecture

- Every database query scoped by `gym_id`
- `getCurrentGymId()` with 5-minute memoization cache
- Cache cleared on logout to prevent data leakage between accounts
- Gym-specific theme storage
- Isolation across: members, payments, plans, staff, leads, check-ins, audit logs

---

## 15. Multi-Language Support (i18n)

- **4 languages configured**: English (en), Telugu (te), Tamil (ta), Hindi (hi)
- Browser language auto-detection with localStorage cache
- Translation hook: `useTranslation()`
- Currently used in ClassesList; most other UI is English-only (partial adoption)

---

## 16. Communication Integrations

### WhatsApp
- One-tap from dashboard (due today cards), member popup, progress sharing
- Pre-filled message: `wa.me/91{phone}?text={reminder}`
- Template-based reminders for payment due

### Phone Call
- One-tap `tel:{phone}` from member popup

### Export & Sharing
- CSV/Excel export for members, payments, calendar, progress
- BOM-encoded for Excel compatibility
- Screenshot capture via `html2canvas` for WhatsApp sharing
- Progress comparison text generation for sharing

---

## 17. Audit & Compliance (Internal)

### Audit Logging
- 40+ action types tracked
- Queue-based with 3-second flush intervals
- `beforeunload` handler ensures unflushed logs are sent
- PII sanitization: email/phone stripped from logged payloads
- Disabled in development mode

### Compliance Framework
- GDPR, CCPA, SOX, HIPAA monitoring
- Anomaly detection with 5-minute intervals
- Severity levels: low, medium, high, critical
- Rate-limited notifications to `audit_anomalies` table

### Debug Dashboard (Dev Only)
- Real-time log monitoring via Supabase channel subscription
- Recharts: Event type distribution pie chart, API response time bar chart
- 6 stat cards, 4 tabs (Overview, Audit Logs, API Calls, Sessions)
- CSV export of last 1000 audit logs

---

## 18. Edge Cases Handled

### Payment Edge Cases
1. Payment only within 7-day window before due date
2. Anchor-based billing preserves due date continuity regardless of actual payment date
3. Shift payment cycle for overdue members to reset anchor
4. First payment deletion → auto-deactivates member (not deleted from system)
5. Plan price shows final discounted price, not base price

### Member Lifecycle Edge Cases
1. Duplicate phone detection during add (prevents duplicate records)
2. Inactive marking restricted to expired memberships only
3. Rejoin flow: creates new period, allows backdating up to 15 days
4. 8 distinct deactivation reasons tracked for analytics
5. Photo required during wizard flow (with compression to reduce storage)
6. Progress tracking limited to 4 entries/month (prevents abuse)
7. Reactivation requires new payment (enforces revenue continuity)

### Calendar Edge Cases
1. Event deduplication: same member, same day → highest priority event shown
2. Priority: payment > due today > upcoming > overdue
3. Future months blocked in navigation
4. Unpaid = Active − MultiMonth − Paid (derived, not stored)
5. Stats cards double as toggleable filters

### Session Edge Cases
1. Persisted auth state validated against actual Supabase session on every protected route
2. Stale state auto-cleared on mismatch
3. Gym ID cache cleared on logout (prevents cross-account data leakage)

---

## 19. Database Tables (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `gym_gyms` | Gym profiles (name, timezone, currency, settings) |
| `gym_users` | Staff/owner accounts linked to auth + gym |
| `gym_members` | Member records with plan, status, dates |
| `gym_payments` | Payment transactions with method, amount, status |
| `gym_payment_schedule` | Scheduled/due payment entries |
| `gym_membership_plans` | Plan definitions with pricing and promo |
| `gym_membership_periods` | Member enrollment periods (rejoin history) |
| `gym_member_history` | Lifecycle events (created, deactivated, reactivated) |
| `gym_check_ins` | Check-in records with method and timestamps |
| `gym_leads` | Lead pipeline with source and status |
| `gym_member_progress` | Body measurements and photos |
| `gym_settings` | Gym configuration and feature flags |
| `gym_audit_logs` | Audit trail for all actions |
| `gym_api_logs` | API call tracking with response times |
| `audit_anomalies` | Compliance anomaly detection records |

### Key Database Features
- **RPC functions**: `rpc_create_member_with_payment` (atomic member + payment creation)
- **Triggers**: Auto-calculate next due date, membership end date on payment insert
- **RLS (Row Level Security)**: Multi-tenant isolation by `gym_id`
- **Storage buckets**: `member-photos`, `images` (fallback), `gym-logos`

---

## 20. Performance Optimizations

1. `React.memo` on MemberCard (prevents unnecessary re-renders)
2. CSS animations for background blobs (not JS-driven)
3. Lazy-loaded member images (`loading="lazy"`)
4. 5-minute memoization on `getCurrentGymId()` (reduces DB calls)
5. `staleTime: 0` + `refetchOnMount: 'always'` on calendar (data freshness)
6. Removed `backdrop-blur` from stats cards (perf improvement)
7. Removed `AnimatePresence` from card lists
8. Debounced search (500ms) on member/phone lookups

---

*This document represents the complete feature set of the Haefit gym management application as of February 12, 2026. All features listed above are implemented and functional in the current codebase unless explicitly noted otherwise.*
