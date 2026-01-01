# FitFlow - Complete Project Overview

## 📋 Table of Contents
1. [Project Architecture](#project-architecture)
2. [Database Configuration (Dev vs Production)](#database-configuration)
3. [Four Main Screens](#four-main-screens)
   - [Dashboard](#1-dashboard)
   - [Members](#2-members)
   - [Calendar](#3-calendar)
   - [Payments](#4-payments)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Key Services & Hooks](#key-services--hooks)

---

## Project Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Framer Motion
- **State Management**: Zustand + React Query (TanStack Query)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Routing**: React Router v7

### Project Structure
```
src/
├── pages/           # Main screen components
│   ├── dashboard/   # Dashboard page
│   ├── members/    # Members list & management
│   ├── calendar/    # Calendar view
│   └── payments/    # Payment calendar
├── components/      # Reusable UI components
├── lib/            # Core services & utilities
│   ├── supabase.ts  # Database client
│   ├── gymService.ts # Business logic service
│   └── membershipService.ts # Member operations
├── hooks/          # Custom React hooks
├── stores/         # Zustand state management
└── router/         # Route configuration
```

---

## Database Configuration

### Dev vs Production Setup

The project connects to **two separate Supabase databases**:

#### 1. **Development Database**
- **URL**: `https://qvszzwfvkvjxpkkiilyv.supabase.co`
- **Purpose**: Testing, development, and staging
- **Configuration**: Set via `.env` file:
  ```env
  VITE_SUPABASE_URL=https://qvszzwfvkvjxpkkiilyv.supabase.co
  VITE_SUPABASE_ANON_KEY=<dev_anon_key>
  ```

#### 2. **Production Database**
- **URL**: `https://dbtdarmxvgbxeinwcxka.supabase.co`
- **Purpose**: Live production data
- **Configuration**: Set via environment variables in deployment (Vercel)

### How Database Switching Works

**Location**: `src/lib/supabase.ts`

```typescript
// Environment variables determine which database to use
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Single client instance created at module load
export const supabase = createTrackedClient();
```

**Key Points**:
- The app uses **one database at a time** based on environment variables
- No runtime switching - determined at build time
- Development mode has API call logging enabled
- Production mode has logging disabled for performance

### Data Sync Between Databases

**Location**: `migrations/sync_prod_to_dev.js`

The project includes a script to sync production data to development:
- Copies all gym data (gyms, users, members, payments, schedules)
- Useful for testing with real production data
- Requires service role keys for both databases

---

## Four Main Screens

### 1. Dashboard

**File**: `src/pages/dashboard/Dashboard.tsx`

#### Purpose
Central hub showing real-time statistics and payment reminders.

#### Data Flow

1. **Initial Load**:
   ```typescript
   // Fetches two main data sources
   const [statsData, eventsData] = await Promise.all([
     gymService.getEnhancedDashboardStats(),
     gymService.getCalendarEvents(monthStart, monthEnd)
   ]);
   ```

2. **Data Sources**:
   - **Stats**: `gymService.getEnhancedDashboardStats()`
     - Queries `gym_members` table
     - Queries `gym_payments` table
     - Calculates: today's collections, overdue payments, active members
   
   - **Events**: `gymService.getCalendarEvents()`
     - Queries payment schedule and member expiry dates
     - Returns calendar events for the selected month

3. **Key Metrics Displayed**:
   - **Till Today**: Total collected + pending (with progress bar)
   - **Today**: Collections today (amount + count)
   - **Tomorrow**: Members due tomorrow (amount + count)
   - **Due Today**: List of members with payments due today
   - **Overdue**: List of members with overdue payments

4. **Data Updates**:
   - Pull-to-refresh functionality
   - React Query cache invalidation on member updates
   - Real-time updates when payments are recorded

#### Database Queries
- `gym_members` - Filtered by `gym_id`, status, dates
- `gym_payments` - Filtered by `gym_id`, payment_date
- `gym_payment_schedule` - For upcoming due dates

---

### 2. Members

**File**: `src/pages/members/MembersList.tsx`

#### Purpose
Complete member management: view, add, edit, filter, and search members.

#### Data Flow

1. **Initial Load**:
   ```typescript
   // Uses React Query hook
   const { data: members } = useQuery({
     queryKey: ['members-with-due'],
     queryFn: async () => {
       return await membershipService.getMembersWithDueInfo();
     }
   });
   ```

2. **Data Source**: `membershipService.getMembersWithDueInfo()`
   - Queries `gym_members` with joins to payment schedule
   - Calculates: `next_due_date`, `days_until_due`, `is_overdue`
   - Returns enriched member data with payment status

3. **Key Features**:
   - **Search**: Client-side filtering by name/phone
   - **Filters**: Status, Plan, Gender, Joining Date, Sort
   - **View Modes**: Card view (grid) or Table view
   - **Add Member**: Multi-step wizard (3 steps)
   - **Edit Member**: Inline editing with photo upload
   - **Rejoin Flow**: Detects inactive members by phone

4. **Member Creation Flow**:
   ```
   Step 1: Photo + Basic Info (Name, Phone)
   Step 2: Additional Details (Email, Gender, Height, Weight)
   Step 3: Membership Plan Selection + Joining Date
   → Creates member in gym_members table
   → Triggers payment schedule generation
   ```

5. **Data Updates**:
   - Optimistic updates for instant UI feedback
   - Background refresh after mutations
   - Cache invalidation across related queries

#### Database Operations
- **Read**: `gym_members` (with payment schedule joins)
- **Create**: `gym_members` insert → triggers payment schedule
- **Update**: `gym_members` update (photo, details, plan)
- **Photo Storage**: Supabase Storage (`images` or `member-photos` bucket)

---

### 3. Calendar

**File**: `src/pages/calendar/CalendarPage.tsx`

#### Purpose
Visual calendar view showing payment due dates, payments, and member events.

#### Data Flow

1. **Initial Load**:
   ```typescript
   const { data: events } = useQuery({
     queryKey: ['calendar-events', format(currentMonth, 'yyyy-MM')],
     queryFn: () => gymService.getCalendarEvents(monthStart, monthEnd)
   });
   ```

2. **Data Source**: `gymService.getCalendarEvents()`
   - Queries multiple sources:
     - `gym_payment_schedule` - For due dates
     - `gym_payments` - For payment records
     - `gym_members` - For member details and expiry dates
   - Combines into unified `CalendarEvent[]` array
   - Categorizes by urgency: `overdue`, `today`, `upcoming`, `future`

3. **Two View Modes**:

   **A. Calendar View**:
   - Grid layout showing full month
   - Each day shows member avatars with status indicators
   - Color coding:
     - 🟢 Green ring = Paid
     - 🔴 Red ring = Overdue
     - 🟡 Amber ring = Due Today
   - Click day → Shows popup with all events for that date

   **B. List View**:
   - Table format with sortable columns
   - Shows: Date, Member, Plan, Amount, Status
   - Filterable by payment status

4. **Stats Cards** (Clickable Filters):
   - Active Members
   - Paid This Month
   - Multi-Month Plans (3/6/12M)
   - Left/Inactive
   - Unpaid
   - Joined This Month

5. **Data Updates**:
   - Refetches on month navigation
   - Invalidates cache on payment/member changes
   - Always refetches on mount (staleTime: 0)

#### Database Queries
- `gym_payment_schedule` - Filtered by `due_date` range
- `gym_payments` - Filtered by `payment_date` range
- `gym_members` - For member details and expiry calculations

---

### 4. Payments

**File**: `src/pages/payments/PaymentCalendar.tsx`

#### Purpose
Payment-focused calendar showing due dates, payment status, and collection tracking.

#### Data Flow

1. **Initial Load**:
   ```typescript
   const { data: calendarData } = useQuery({
     queryKey: ["calendarData", year, month],
     queryFn: async () => {
       const { data } = await supabase.rpc("get_calendar_data", {
         p_gym_id: gymId,
         p_year: year,
         p_month: month,
       });
       return data;
     }
   });
   ```

2. **Data Source**: Database Function `get_calendar_data()`
   - **PostgreSQL Function** (not client-side query)
   - Aggregates payment schedule data
   - Returns: `due_date`, `member_id`, `amount_due`, `payment_status`
   - Calculates: `days_overdue`, payment status categories

3. **Key Features**:
   - **Stats Cards**: Members, Collected, Pending, Progress %
   - **Calendar Grid**: Shows members due on each day
   - **Status Colors**:
     - Red border = Overdue
     - Amber border = Due Today
     - Green border = All Paid
     - Blue border = Upcoming
   - **Date Modal**: Click day → Shows detailed member list

4. **Payment Status Categories**:
   - `paid` - Payment recorded
   - `overdue` - Past due date, not paid
   - `overdue_multiple` - Multiple periods overdue
   - `due_today` - Due today, not yet paid
   - `upcoming` - Future due date

5. **Data Updates**:
   - Refetches on month change
   - Invalidates on payment creation/update
   - Uses database function for optimized queries

#### Database Operations
- **Read**: `get_calendar_data()` RPC function
- **Payment Recording**: `gym_payments` insert (via MemberActionDialog)
- **Schedule Updates**: Automatic via triggers

---

## Data Flow Architecture

### High-Level Flow

```
User Action
    ↓
React Component (Page)
    ↓
Custom Hook / Service Method
    ↓
Supabase Client (supabase.ts)
    ↓
Supabase Database (Dev or Prod)
    ↓
Row Level Security (RLS) Policies
    ↓
Data Returned (Filtered by gym_id)
    ↓
React Query Cache
    ↓
Component Re-render
```

### Multi-Tenant Isolation

**Key Mechanism**: Row Level Security (RLS)

Every query automatically filters by `gym_id`:
```typescript
// Example from useMembers hook
const { data } = await supabase
  .from('gym_members')
  .select('*')
  .eq('gym_id', gymId)  // ← Always filters by current gym
```

**Gym ID Resolution**:
1. Gets current authenticated user
2. Queries `gym_users` table
3. Returns associated `gym_id`
4. Cached for 5 minutes (performance optimization)

### Data Services

#### 1. `gymService` (Singleton)
**Location**: `src/lib/gymService.ts`

**Methods**:
- `getEnhancedDashboardStats()` - Aggregated dashboard metrics
- `getCalendarEvents()` - Unified calendar events
- `getMembershipPlans()` - Available membership plans
- `getExpiringMembers()` - Members expiring soon

**Pattern**: Direct Supabase queries with business logic

#### 2. `membershipService`
**Location**: `src/lib/membershipService.ts`

**Methods**:
- `getMembersWithDueInfo()` - Members with payment status
- `createMember()` - Create new member + payment schedule
- `rejoinMember()` - Reactivate inactive member
- `checkMemberByPhone()` - Duplicate detection

**Pattern**: Higher-level operations combining multiple queries

#### 3. React Query Hooks
**Location**: `src/hooks/`

**Examples**:
- `useMembers()` - Member list with filters
- `usePayments()` - Payment records
- `useMember()` - Single member details

**Pattern**: Declarative data fetching with caching

---

## Key Database Tables

### 1. `gym_gyms`
Master table for gyms (multi-tenant root)
- `id` (UUID, Primary Key)
- `name`, `email`, `phone`
- `language` (en/te/ta/hi)

### 2. `gym_users`
Staff and owners linked to gyms
- `id` (UUID)
- `gym_id` (FK → gym_gyms)
- `auth_user_id` (FK → auth.users)
- `role` (owner/staff)

### 3. `gym_members`
Member records
- `id` (UUID)
- `gym_id` (FK → gym_gyms)
- `full_name`, `phone`, `email`
- `joining_date` ⚠️ **CRITICAL** - Base for all calculations
- `membership_plan`, `plan_amount`
- `status` (active/inactive)
- `membership_end_date`, `next_payment_due_date`

### 4. `gym_payments`
Payment records
- `id` (UUID)
- `gym_id`, `member_id`
- `amount`, `payment_method`
- `payment_date`, `due_date`
- `days_late` (auto-calculated)
- `receipt_number` (auto-generated)

### 5. `gym_payment_schedule`
Pre-calculated payment schedule
- `id` (UUID)
- `gym_id`, `member_id`
- `due_date`, `amount_due`
- `status` (pending/paid/overdue)
- `paid_payment_id` (FK → gym_payments)

---

## Environment Variables

### Development
```env
VITE_SUPABASE_URL=https://qvszzwfvkvjxpkkiilyv.supabase.co
VITE_SUPABASE_ANON_KEY=<dev_anon_key>
```

### Production
```env
VITE_SUPABASE_URL=https://dbtdarmxvgbxeinwcxka.supabase.co
VITE_SUPABASE_ANON_KEY=<prod_anon_key>
```

**Note**: Environment variables are set at build time. The app connects to one database per build.

---

## Data Synchronization

### Production → Development Sync

**Script**: `migrations/sync_prod_to_dev.js`

**Process**:
1. Connects to both databases using service role keys
2. Clears existing dev data for target gym
3. Copies data in order:
   - `gym_gyms`
   - `gym_users`
   - `gym_membership_plans`
   - `gym_members`
   - `gym_payments`
   - `gym_payment_schedule`

**Usage**:
```bash
PROD_SUPABASE_SERVICE_KEY=xxx DEV_SUPABASE_SERVICE_KEY=yyy node migrations/sync_prod_to_dev.js
```

---

## Key Design Patterns

### 1. **Singleton Services**
- `gymService.getInstance()` - Single instance for app lifecycle

### 2. **React Query Caching**
- Automatic caching with smart invalidation
- Background refetching
- Optimistic updates

### 3. **Multi-Step Forms**
- Wizard pattern for complex forms (Add Member)
- Step validation before progression

### 4. **Unified Member Popup**
- Single component (`UnifiedMemberPopup`) used across screens
- Consistent member actions (pay, deactivate, edit)

### 5. **Optimistic UI Updates**
- Instant feedback before server confirmation
- Background sync after mutations

---

## Summary

### Data Flow Summary

1. **Dashboard**: Real-time stats + payment reminders
   - Queries: members, payments, payment schedule
   - Updates: On payment/member changes

2. **Members**: Complete CRUD operations
   - Queries: members with payment info
   - Mutations: Create, Update, Reactivate
   - Features: Search, Filter, Export

3. **Calendar**: Visual event timeline
   - Queries: Unified calendar events
   - Views: Calendar grid + List table
   - Features: Filter by stats cards, export CSV

4. **Payments**: Payment-focused calendar
   - Queries: Database function for optimized data
   - Features: Status tracking, collection metrics

### Database Connection

- **Single connection** per build (dev OR prod)
- **Environment variables** determine which database
- **RLS policies** ensure multi-tenant isolation
- **Service layer** abstracts database operations
- **React Query** handles caching and synchronization

---

## Next Steps for Understanding

1. **Explore Database Schema**: Check `supabase/production_migration_01_schema.sql`
2. **Review RLS Policies**: Check `supabase/production_migration_04_rls.sql`
3. **Understand Triggers**: Check `supabase/production_migration_03_triggers.sql`
4. **Test Data Sync**: Run sync script to see data flow
5. **Check Environment**: Verify `.env` file has correct database URLs

---

*Last Updated: Based on codebase analysis*

