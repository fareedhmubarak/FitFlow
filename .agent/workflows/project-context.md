---
description: FitFlow Gym Management System - Complete Project Context & Knowledge Base
---

# 💪 FitFlow - Complete Project Context

**Last Updated:** 2025-12-12
**Version:** 1.1 (Added Security Architecture, Audit Logging, Known Issues)

---

## 🎯 Project Overview

FitFlow is a **modern, mobile-first gym management application** built specifically for local gyms in India to replace paper-based payment tracking systems. It's a PWA (Progressive Web App) designed to work seamlessly on mobile devices.

### Target Users
- **Primary:** Gym owners and staff in India
- **Secondary:** Small to medium fitness centers

### Core Value Proposition
- Replace manual paper-based payment tracking
- Visual payment calendar grouped by member joining date
- Multi-language support for Indian regional languages
- Mobile-first, touch-friendly design
- Works on low-bandwidth networks

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Library | 19 |
| TypeScript | Type Safety | Latest |
| Vite | Build Tool | Latest |
| Tailwind CSS | Styling | v4 |
| Framer Motion | Animations | Latest |
| React Query (@tanstack/react-query) | Data Fetching & Caching | Latest |
| Zustand | State Management | Latest |
| React Router | Navigation | v6 |
| react-i18next | Internationalization | Latest |
| react-hot-toast | Notifications | Latest |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL Database + Auth |
| Row Level Security (RLS) | Multi-tenant Data Isolation |
| Database Functions | Business Logic at DB level |
| Supabase Storage | Image/File Storage |

### UI Components
| Library | Purpose |
|---------|---------|
| shadcn/ui | Base Component Library |
| Lucide React | Icons |
| React Hook Form | Form Management |
| Zod | Schema Validation |
| date-fns | Date Utilities |

---

## 📁 Project Structure

```
fitflow/
├── src/
│   ├── components/           # Reusable components
│   │   ├── auth/            # Authentication (ProtectedRoute)
│   │   ├── common/          # Shared UI (UnifiedMemberPopup, ConfirmModal, etc.)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── layout/          # Layout components (BottomNavigation, MobileLayout)
│   │   ├── members/         # Member components (16 files including MemberForm, PhotoPicker, Progress)
│   │   ├── payments/        # Payment components
│   │   ├── settings/        # ThemeSelector
│   │   └── ui/              # shadcn/ui components (24 files)
│   ├── pages/               # Page components
│   │   ├── auth/            # Login, Signup, ForgotPassword, GymOnboarding, etc.
│   │   ├── calendar/        # CalendarPage - Visual payment calendar
│   │   ├── checkin/         # CheckIn - QR/Manual check-in
│   │   ├── classes/         # ClassesList, ClassSchedule
│   │   ├── dashboard/       # Dashboard - Main landing page
│   │   ├── debug/           # DebugDashboard (dev only)
│   │   ├── leads/           # LeadsList - Lead management
│   │   ├── members/         # MembersList, MemberDetails, AddMember, EditMember
│   │   ├── payments/        # PaymentCalendar, PaymentRecords, PaymentsList
│   │   ├── plans/           # PlansPage - Membership plans management
│   │   ├── reports/         # ReportsDashboard
│   │   ├── settings/        # Settings (comprehensive settings page)
│   │   └── staff/           # StaffList
│   ├── hooks/               # Custom React hooks (13 files)
│   │   ├── useCheckIn.ts
│   │   ├── useClasses.ts
│   │   ├── useComplianceLogger.ts
│   │   ├── useCreateMember.ts
│   │   ├── useCreatePayment.ts
│   │   ├── useDebugLogger.ts
│   │   ├── useLeads.ts
│   │   ├── useMembers.ts
│   │   ├── useMembershipPlans.ts
│   │   ├── usePayments.ts
│   │   ├── useSettings.ts
│   │   ├── useStaff.ts
│   │   └── useUpdateMember.ts
│   ├── lib/                 # Utility libraries (18 files)
│   │   ├── supabase.ts      # Supabase client with API tracking
│   │   ├── membershipService.ts # Core membership business logic (~1300 lines)
│   │   ├── gymService.ts    # Gym operations & dashboard stats (~960 lines)
│   │   ├── progressService.ts # Member body progress tracking
│   │   ├── settingsService.ts # Settings management
│   │   ├── themes.ts        # Theme definitions
│   │   ├── auditLogger.ts   # Audit logging
│   │   ├── exportService.ts # CSV/PDF export
│   │   └── ...more utilities
│   ├── contexts/            # React Contexts
│   │   ├── ThemeContext.tsx # Multi-theme support (10 themes!)
│   │   └── AppReadyContext.tsx # Splash screen orchestration
│   ├── stores/              # Zustand stores
│   │   └── authStore.ts     # Authentication state (persisted)
│   ├── i18n/                # Internationalization
│   │   ├── config.ts
│   │   └── locales/         # en, te, ta, hi translations
│   ├── types/               # TypeScript types
│   │   └── database.ts      # All database types & interfaces
│   ├── router/              # React Router configuration
│   └── main.tsx             # App entry point
├── supabase/                # Database migrations (6 SQL files)
├── public/                  # Static assets (PWA manifest, icons)
├── e2e/                     # E2E test plans
└── package.json
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `gym_gyms` | Master tenant table | name, email, phone, language, settings |
| `gym_users` | Staff & admins | gym_id, auth_user_id, role (owner/staff) |
| `gym_members` | Gym members | gym_id, full_name, phone, joining_date, membership_plan, plan_amount, status |
| `gym_payments` | Payment records | gym_id, member_id, amount, payment_method, payment_date, due_date, days_late |
| `gym_payment_schedule` | Pre-calculated schedule | gym_id, member_id, due_date, amount_due, status |
| `gym_membership_plans` | Plan configurations | gym_id, name, duration_months, price, features, promo fields |
| `gym_membership_periods` | Rejoin/renewal tracking | member_id, period_number, plan snapshot, dates |
| `gym_member_progress` | Body measurements | member_id, weight, height, BMI, body_fat, photos, measurements |
| `gym_receipts` | Payment receipts | payment_id, receipt_number, amounts, valid_from/until |
| `gym_member_history` | Change tracking | member_id, change_type, old_value, new_value |

### Notification Tables
| Table | Purpose |
|-------|---------|
| `gym_notification_settings` | Gym-level notification config |
| `gym_notification_templates` | Message templates |
| `gym_notifications` | Notification queue & history |

### Audit/Logging Tables
| Table | Purpose |
|-------|---------|
| `gym_sessions` | User session tracking |
| `gym_audit_logs` | Comprehensive audit trail |
| `gym_api_logs` | API call logging |
| `gym_error_logs` | Error tracking |
| `gym_click_logs` | User interaction tracking |
| `gym_navigation_logs` | Page navigation history |
| `gym_performance_logs` | Performance metrics |
| `record_versions` | Change tracking for all tables |

### Key Database Functions
- `get_dashboard_stats(p_gym_id, p_date)` - Dashboard statistics
- `get_calendar_data(p_gym_id, p_year, p_month)` - Calendar view data
- `generate_payment_schedule(p_member_id, p_months_ahead)` - Future schedules
- `get_current_gym_id()` - Helper for RLS policies

---

## ✨ Features Implemented

### 🏠 Dashboard
- Real-time animated stats (due today, overdue, active members, revenue)
- Expiring this week section with member cards
- Overdue payments section
- Pull-to-refresh functionality
- Bottom navigation for mobile

### 👥 Members Management
- **List View:**
  - Animated member cards with avatars
  - Filter by: status, plan, gender, joining period
  - Sort by: name, joining date
  - Search functionality
  - Export to CSV
  - Pull-to-refresh
- **Add Member:**
  - Photo capture (camera/gallery)
  - Full member details form
  - Plan selection with price
  - Payment on joining
- **Member Popup (UnifiedMemberPopup):**
  - Quick actions: WhatsApp, Call, Record Payment
  - View membership history
  - Track progress
  - Mark inactive/Reactivate
- **Progress Tracking:**
  - Weight, height, BMI, body fat
  - Body measurements (chest, waist, hips, biceps, thighs, calves)
  - Before/after photos (front, back, left, right)
  - Progress comparison with visual charts
  - Social media export feature

### 📅 Payment Calendar (Signature Feature)
- **Visual Calendar View:**
  - Members grouped by JOINING DATE (not payment date)
  - Color coding: Green (Paid), Yellow (Due Today), Red (Overdue), Blue (Upcoming)
  - Member avatars on each date
  - Click to expand and see member details
- **List View:**
  - Filterable by status, plan, gender, payment status
  - Export to CSV
- **Due Date Logic (CRITICAL):**
  - Joining date = anchor for ALL future due dates
  - Even if payment is late, next due follows original cycle
  - Days late is tracked automatically

### 💰 Payments
- Record payment with method selection
- Automatic receipt generation (receipt_number)
- Payment history per member
- Delete/revert payment (with member deletion if needed)

### 📊 Reports Dashboard
- Revenue reports
- Member statistics
- Export capabilities (planned)

### ⚙️ Settings
- **Gym Profile:** Name, email, phone, logo upload
- **Membership Plans:** Create, edit, delete, toggle active
- **Theme Selection:** 10 beautiful themes (light & dark)
- **Language Selection:** English, Telugu, Tamil, Hindi
- **PWA Install:** In-app installation prompt
- **Logout**

### 🎨 Theme System (10 Themes)
| Theme | Description | Dark? |
|-------|-------------|-------|
| default (Sky Fresh) | Light & refreshing with emerald accents | No |
| mocha | Warm & cozy with earthy tones | No |
| instagram | Vibrant gradient like Instagram | No |
| twitter | Clean & modern Twitter blue | No |
| spotify | Energetic green like Spotify | Yes |
| tiktok | Trendy cyan & pink like TikTok | Yes |
| pearl | Clean & futuristic with cool tones | No |
| ocean | Deep & professional with cyan glow | Yes |
| aurora | Vibrant & creative with purple magic | Yes |
| amoled | True black for battery saving | Yes |

### 🌍 Multi-Language Support
| Language | Code | Status |
|----------|------|--------|
| English | en | ✅ Complete |
| Telugu | te | ✅ Complete |
| Tamil | ta | ✅ Complete |
| Hindi | hi | ✅ Complete |

### 📱 PWA Features
- Installable as app
- Offline-ready (service worker)
- Push notifications (planned)
- Mobile-optimized UI

### 🔒 Security & Multi-Tenancy
- Row Level Security (RLS) ensures data isolation
- Each gym can only see their own data
- Secure authentication via Supabase Auth

---

## 🎯 Key User Flows

### 1. New Member Signup
1. Click "Add Member" → Form opens
2. Fill details (name, phone, photo, plan)
3. Submit → Member created with payment schedule
4. First payment recorded automatically

### 2. Record Payment
1. Click member in dashboard/calendar
2. Unified popup opens
3. Click "Record Payment"
4. Select plan, amount, method
5. Submit → Payment recorded, dates updated

### 3. Member Rejoin (After Inactivity)
1. Click inactive member
2. Click "Activate Member"
3. Rejoin modal opens with plan selection
4. Select new plan, start date, payment
5. Submit → New membership period created

### 4. Progress Tracking
1. Click member → "Track Progress"
2. Add new progress entry
3. Enter measurements, upload photos
4. Save → View progress history
5. Compare two dates → See visual changes

---

## 🔧 Development Notes

### Important Files to Know
- `src/lib/membershipService.ts` - Core business logic
- `src/lib/gymService.ts` - Dashboard & calendar data
- `src/pages/members/MembersList.tsx` - Largest page (~2200 lines)
- `src/components/common/UnifiedMemberPopup.tsx` - Key member interaction
- `src/contexts/ThemeContext.tsx` - Theme management

### State Management Pattern
- **Global Auth:** Zustand with localStorage persistence
- **Server State:** React Query with caching
- **Local UI State:** React useState/useReducer

### API Pattern
- All DB calls go through Supabase client
- Services (gymService, membershipService) wrap complex operations
- API calls are tracked in dev mode for debugging

---

## 🚀 Future Roadmap (From README)

### Phase 2 (Planned)
- [ ] WhatsApp payment reminders
- [ ] SMS notifications
- [ ] Email receipts
- [ ] Member mobile app
- [ ] Export reports (PDF/CSV)
- [ ] Payment gateway (Razorpay)
- [ ] Attendance tracking (QR code)

### Phase 3 (Planned)
- [ ] Class scheduling
- [ ] Personal training sessions
- [ ] Nutrition plans
- [ ] Body measurements tracking (✅ DONE)
- [ ] Mobile app (React Native)

---

## 📝 Recent Changes Log

### December 2025
- Fixed mobile status bar theme issues
- Added comprehensive progress tracking with social media export
- Fixed duplicate detection in PowerApps (related project)
- Fixed rejection comments popup issues
- UI overhaul with premium dark theme tokens
- Added member progress photos with before/after comparison

---

## 🔄 Feature Change Log

*This section will be updated as new features are implemented*

| Date | Feature | Description |
|------|---------|-------------|
| 2025-12-12 | Context Documentation | Created comprehensive project knowledge base |
| 2025-12-12 | Payment Cycle Shift | Admin can shift a member's payment base date when they take a break and return. Shows overdue warning, toggle switch, visual comparison of old vs new cycle, and confirmation dialog. |
| 2025-12-12 | Delete First Payment → Inactive | When deleting the first/only payment, member is now marked INACTIVE (not deleted). Preserves member data for audit trail. Can be reactivated via Rejoin flow. |
| 2025-12-12 | Rejoin History Enhancement | Enhanced rejoinMember() to log complete audit trail including old/new joining_date (base day), deactivation date, and new membership end date. |

---

## 📌 Notes for Future Implementation

1. **Always use joining_date as anchor** for payment due date calculations
2. **Payment allowed 7 days before due date** - don't allow early payments beyond that
3. **Mark Inactive only for expired members** - active members with valid memberships cannot be deactivated
4. **Theme persisted per gym** - stored in localStorage with gym ID
5. **RLS is critical** - all queries automatically filter by gym_id
6. **Payment Cycle Shift** - Available in UnifiedMemberPopup payment view when payment is overdue. Changes member's joining_date to new base day. Logged in gym_member_history with change_type 'base_date_shifted'.
7. **First Payment Deletion** - No longer deletes member. Marks as inactive with deactivation_reason 'initial_payment_reversed'. Logged in gym_member_history. Can rejoin normally.
8. **Rejoin Member** - Updates joining_date to new start date. New base day becomes the anchor for future payments. Complete audit trail in gym_member_history with change_type 'member_reactivated' showing old/new joining_date, base_day, and membership_end_date.

---

## 🔒 Security Architecture

### Multi-Tenant Data Isolation

FitFlow is a **multi-tenant SaaS** where multiple gyms share the same database. Security is implemented at **3 levels**:

#### Level 1: Database RLS (Row Level Security)
Every table has RLS policies that automatically filter data:

```sql
-- Example policy on gym_members
CREATE POLICY "gym_members_select_own_gym"
  ON gym_members FOR SELECT
  USING (gym_id = get_current_gym_id());
```

**Tables with RLS:**
- `gym_members`, `gym_payments`, `gym_payment_schedule`
- `gym_membership_plans`, `gym_membership_periods`
- `gym_member_progress`, `gym_member_history`
- `gym_notifications`, `gym_notification_settings`
- `gym_audit_logs`, `gym_sessions`, `gym_error_logs`
- All 20+ tables in the system

#### Level 2: Database Function
```sql
CREATE FUNCTION get_current_gym_id() RETURNS UUID AS $$
  SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
```
This identifies the current user's gym from their auth session.

#### Level 3: Application-Level Filtering
Every service function uses `getCurrentGymId()`:
```typescript
const gymId = await getCurrentGymId();
const { data } = await supabase
  .from('gym_members')
  .select('*')
  .eq('gym_id', gymId);  // Explicit filter
```

### Security Guarantees
| Operation | Protection |
|-----------|------------|
| SELECT | Can only see own gym's data |
| INSERT | Can only insert into own gym |
| UPDATE | Can only update own gym's data |
| DELETE | Can only delete own gym's data |

**Even if frontend code has bugs, RLS prevents cross-gym access at the database level.**

---

## 📋 Audit & Traceability

### Logging Tables Overview

| Table | Purpose | Log Type |
|-------|---------|----------|
| `gym_audit_logs` | Business actions | Explicit (app logs) |
| `gym_member_history` | Member timeline | Explicit (app logs) |
| `record_versions` | All DB changes | Automatic (trigger) |
| `gym_error_logs` | Errors | Explicit (on error) |
| `gym_api_logs` | API calls | Automatic (interceptor) |
| `gym_sessions` | User sessions | Automatic |
| `gym_navigation_logs` | Page views | Automatic |
| `gym_click_logs` | UI interactions | Automatic |
| `gym_performance_logs` | Metrics | Automatic |

### Business Actions Logged (gym_audit_logs)

**Member Actions:**
- `member_created`, `member_updated`, `member_deleted`
- `member_status_changed` (active/inactive)
- `member_rejoined`, `member_photo_uploaded`
- `member_progress_recorded`

**Payment Actions:**
- `payment_created`, `payment_deleted`

**Other Actions:**
- `plan_created`, `plan_updated`, `plan_deleted`
- `lead_created`, `lead_updated`, `lead_converted`, `lead_deleted`
- `notification_sent`, `receipt_generated`
- `user_login`, `user_logout`

### Member History (gym_member_history)

Per-member timeline with change_types:
- `member_reactivated` - Rejoin with old/new joining_date
- `initial_payment_reversed` - First payment deleted
- `base_date_shifted` - Payment cycle shifted
- `marked_inactive` - Member deactivated

### Database Version Control (record_versions)

Automatic trigger logs every INSERT/UPDATE/DELETE:
```sql
record_versions (
  table_name, record_id, operation,
  old_data, new_data,  -- Full JSONB snapshots
  changed_fields,      -- Which fields changed
  changed_by,          -- User who made change
  created_at
)
```

### Debugging Workflow

When a gym reports an issue:

1. **Check Audit Log:**
```sql
SELECT * FROM gym_audit_logs 
WHERE gym_id = '...' AND resource_type = 'member'
ORDER BY created_at DESC LIMIT 10;
```

2. **Check Member History:**
```sql
SELECT * FROM gym_member_history 
WHERE member_id = '...'
ORDER BY created_at DESC;
```

3. **Check Record Versions (detailed):**
```sql
SELECT * FROM record_versions 
WHERE table_name = 'gym_members' AND record_id = '...'
ORDER BY created_at DESC;
```

4. **Check Errors:**
```sql
SELECT * FROM gym_error_logs 
WHERE gym_id = '...'
ORDER BY created_at DESC LIMIT 10;
```

---

## ⚠️ Known Issues & Workarounds

### iPhone Notch/Status Bar Issue
- **Problem:** Black status bar on iPhone Safari/PWA
- **Status:** Ongoing investigation
- **Location:** `index.html`, `manifest.json`, Dashboard.tsx
- **Attempted Fixes:** Meta tags, theme-color, viewport settings
- **Notes:** May require iOS-specific CSS with `env(safe-area-inset-top)`

---

## 🔧 Key Service Files

| File | Purpose |
|------|---------|
| `membershipService.ts` | All member CRUD, payments, rejoin |
| `gymService.ts` | Gym settings, plans, receipts |
| `settingsService.ts` | App settings, themes |
| `progressService.ts` | Member progress tracking |
| `auditLogger.ts` | Business action logging |
| `supabase.ts` | DB client, getCurrentGymId() |

---

## 📱 PWA Configuration

| File | Purpose |
|------|---------|
| `manifest.json` | PWA manifest, app icons |
| `index.html` | Meta tags, viewport, theme-color |
| `vite.config.ts` | PWA plugin config |

---

## ⚡ Performance Optimizations (2025-12-12)

### Problem Identified
- Users on iPhone 15 Pro Max and mid-range Android phones experienced:
  - Laggy typing in Add Member form
  - Choppy scrolling
  - Slow page transitions
- iPhone 16 Pro Max was unaffected (A18 Pro GPU)

### Root Causes
1. **Heavy `backdrop-blur`** - 190+ elements with blur effects across 40+ files
2. **Repeating Framer Motion animations** - `repeat: Infinity` on icons
3. **AnimatePresence + layout** on every list item
4. **Spring physics animations** - computationally expensive

### Fixes Applied

#### Global CSS Fixes (index.css)
These apply to the **entire app automatically**:

1. **Mobile Blur Reduction** - On screens ≤768px:
   - `backdrop-blur-xl/2xl/3xl` → reduced to `blur(4px)`
   - `backdrop-blur-md/lg` → reduced to `blur(2px)`
   - `backdrop-blur-sm` → disabled entirely
   
2. **iOS Safari Optimization** - Using `@supports (-webkit-touch-callout: none)`
   
3. **GPU Acceleration Classes**:
   - `.blur-optimized` - Forces GPU layer
   - `.input-fast` - Solid background for typing performance
   - `.scroll-optimized` - Smooth scrolling with GPU hints
   - `.framer-motion-optimized` - GPU hints for animated elements

4. **Blob Animations** - Changed `translate()` to `translate3d()` for GPU acceleration

5. **Reduced Motion Support** - Respects `prefers-reduced-motion` preference

#### Component-Specific Fixes (MembersList.tsx)
1. Wrapped `MemberCard` with `React.memo`
2. Removed `backdrop-blur` from cards/table
3. Replaced `AnimatePresence` with CSS transitions
4. Removed repeating icon animations
5. Added `loading="lazy"` to images

### Performance Best Practices for FitFlow
- **Avoid `backdrop-blur`** on lists and scrolling containers
- **Use CSS transitions** instead of Framer Motion for simple effects
- **Use `React.memo`** for list item components
- **Limit `repeat: Infinity`** animations to small, non-scrolling elements
- **Add `loading="lazy"`** to list images
- **Use `.scroll-optimized`** class on scrollable containers

### Files with backdrop-blur (for future reference)
Total: 40+ files including:
- Dashboard.tsx (9 uses)
- UnifiedMemberPopup.tsx (20 uses)
- PaymentRecords.tsx (12 uses)
- CheckIn.tsx (10 uses)
- All pages and most components

**Note:** All these are now automatically optimized by the global CSS media queries.

---

*Last Updated: 2025-12-12 - Added security audit, traceability docs, known issues, comprehensive performance optimizations*
