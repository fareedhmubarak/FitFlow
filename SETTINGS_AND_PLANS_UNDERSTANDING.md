# Settings Page & Membership Plans - Complete Understanding

## 📋 Overview

The application has **TWO** places where membership plans can be managed:
1. **Settings Page** (`/settings`) - Has a "Membership Plans" tab
2. **Plans Page** (`/plans`) - Dedicated page for membership plans

Both use different services but manage the same `gym_membership_plans` table.

---

## 🏗️ Architecture

### **Settings Page** (`src/pages/settings/Settings.tsx`)

**Location**: `/settings` route  
**Component**: `Settings.tsx`  
**Service**: `settingsService` from `src/lib/settingsService.ts`

#### **Tabs Structure:**
1. **Profile** (`activeTab === 'profile'`)
   - User info display
   - Account details (email, gym name)
   - Sign out button

2. **Install App** (`activeTab === 'app'`)
   - PWA installation instructions
   - iOS/Android/Desktop instructions
   - App benefits display

3. **Gym Profile** (`activeTab === 'general'`)
   - Logo upload
   - Gym details form:
     - Name, Email, Phone
     - Address, City, State, Pincode
     - Timezone
   - Save functionality

4. **Membership Plans** (`activeTab === 'plans'`) ⭐
   - Lists all membership plans
   - Add/Edit/Delete functionality
   - Plan modal for create/edit
   - Uses `settingsService` for API calls

5. **Theme** (`activeTab === 'theme'`)
   - Theme selector component
   - Theme preview

6. **Notifications** (`activeTab === 'notifications'`)
   - Email notifications toggle
   - SMS reminders toggle
   - WhatsApp notifications toggle

#### **Membership Plans Tab Details:**

**State Management:**
```typescript
const [showPlanModal, setShowPlanModal] = useState(false);
const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
const [planForm, setPlanForm] = useState<CreatePlanInput>({
  name: '',
  description: '',
  price: 0,
  duration_days: 30,
  billing_cycle: 'monthly',
  is_active: true,
  features: [],
});
```

**Data Fetching:**
- Uses React Query: `useQuery(['membership-plans'], settingsService.getMembershipPlans)`
- Fetches from `gym_membership_plans` table filtered by `gym_id`

**Mutations:**
- `createPlanMutation` - Creates new plan
- `updatePlanMutation` - Updates existing plan
- `deletePlanMutation` - Deletes plan
- `togglePlanMutation` - Toggles `is_active` status

**Plan Form Fields:**
- Name (required)
- Description (optional)
- Price (₹) (required)
- Duration (Days) (required)
- Billing Cycle: monthly, quarterly, semi_annual, annual, one_time
- Active Status (toggle)

**Plan Display:**
- Shows plan name, description, price, duration
- Edit/Delete buttons
- Active/Inactive badge
- Duration label helper (`getDurationLabel()`)

---

### **Plans Page** (`src/pages/plans/PlansPage.tsx`)

**Location**: `/plans` route  
**Component**: `PlansPage.tsx`  
**Service**: `gymService` from `src/lib/gymService.ts`

#### **Key Differences from Settings:**

1. **Different Service**: Uses `gymService.getMembershipPlans()` instead of `settingsService.getMembershipPlans()`

2. **Enhanced Plan Model**: Uses `MembershipPlanWithPromo` type which includes:
   - `promo_type`: 'promotional' | 'standard'
   - `base_price` & `final_price`
   - `discount_type`: 'none' | 'percentage' | 'flat'
   - `discount_value`: number
   - `bonus_duration_months`: number
   - `promo_description`: string
   - `highlight_text`: string
   - `base_duration_months` & `total_duration_months`

3. **Promotional Features**:
   - Bonus months (FREE months)
   - Discounts (percentage or flat)
   - Promo banners
   - Highlight text

4. **Plan Form Fields** (More Advanced):
   - Base Duration (months)
   - Bonus Months (FREE)
   - Base Price
   - Discount Type (None/Percentage/Flat)
   - Discount Value
   - Promo Description
   - Banner Text (highlight_text)
   - Calculates final price automatically

5. **Display**:
   - Separates Active and Inactive plans
   - Shows promotional badges
   - Displays discount information
   - Shows total duration (base + bonus)

---

## 🔧 Service Layer

### **settingsService** (`src/lib/settingsService.ts`)

**Membership Plan Methods:**
- `getMembershipPlans()`: Fetches plans ordered by `display_order`
- `createMembershipPlan(input)`: Creates new plan
- `updateMembershipPlan(id, updates)`: Updates plan
- `deleteMembershipPlan(id)`: Deletes plan
- `togglePlanActive(id, isActive)`: Toggles active status

**Plan Schema** (from settingsService):
```typescript
interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number | null;  // ⚠️ Uses days, not months
  billing_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time';
  is_active: boolean;
  display_order: number;
  features: string[];
  created_at: string;
}
```

### **gymService** (`src/lib/gymService.ts`)

**Membership Plan Methods:**
- `getMembershipPlans()`: Returns `MembershipPlanWithPromo[]`
- Includes promotional fields

**Plan Schema** (from gymService):
```typescript
interface MembershipPlanWithPromo {
  // ... standard fields ...
  duration_months: number;  // ⚠️ Uses months, not days
  base_duration_months: number;
  bonus_duration_months: number;
  total_duration_months: number;
  base_price: number;
  final_price: number;
  discount_type: 'none' | 'percentage' | 'flat';
  discount_value: number;
  promo_type: 'promotional' | 'standard';
  promo_description: string | null;
  highlight_text: string | null;
}
```

---

## 🗄️ Database Table: `gym_membership_plans`

**Key Fields:**
- `id` (UUID)
- `gym_id` (UUID) - Foreign key to `gym_gyms`
- `name` (text)
- `description` (text, nullable)
- `price` (numeric)
- `duration_days` (integer, nullable) - Used by Settings
- `duration_months` (integer, nullable) - Used by Plans Page
- `billing_cycle` (enum)
- `is_active` (boolean)
- `display_order` (integer)
- `features` (jsonb array)
- `base_price`, `final_price` (numeric, nullable)
- `discount_type`, `discount_value` (nullable)
- `bonus_duration_months` (integer, nullable)
- `promo_type`, `promo_description`, `highlight_text` (nullable)
- `created_at`, `updated_at` (timestamps)

---

## 🔄 Data Flow

### **Settings Page Flow:**
1. User navigates to `/settings`
2. Clicks "Membership Plans" tab
3. Component fetches plans via `settingsService.getMembershipPlans()`
4. Plans displayed in list
5. User clicks "Add Plan" → Opens modal
6. User fills form → Submits → `createPlanMutation` → `settingsService.createMembershipPlan()`
7. Query invalidated → Plans refetched

### **Plans Page Flow:**
1. User navigates to `/plans`
2. Component fetches plans via `gymService.getMembershipPlans()`
3. Plans separated into Active/Inactive
4. User clicks "+" → Opens `PlanFormModal`
5. User fills enhanced form (with promo fields)
6. Submits → Direct Supabase insert/update
7. Query invalidated → Plans refetched

---

## ⚠️ Key Differences & Potential Issues

### **1. Duration Units Mismatch:**
- **Settings**: Uses `duration_days` (e.g., 30, 90, 365)
- **Plans Page**: Uses `duration_months` (e.g., 1, 3, 12)
- **Issue**: Both fields exist in DB, but different pages use different fields!

### **2. Service Inconsistency:**
- **Settings**: Uses `settingsService` (simpler API)
- **Plans Page**: Uses `gymService` (more features)
- **Issue**: Two different services managing same table!

### **3. Plan Model Differences:**
- **Settings**: Basic plan model (no promo features)
- **Plans Page**: Enhanced model (with discounts, bonuses, promo)

### **4. Form Complexity:**
- **Settings**: Simple form (name, price, duration_days, billing_cycle)
- **Plans Page**: Complex form (base duration, bonus months, discounts, promo text)

---

## 📝 Current Implementation Summary

### **Settings Page - Plans Tab:**
- ✅ Basic CRUD operations
- ✅ Simple plan model
- ✅ Uses `duration_days`
- ✅ Uses `settingsService`
- ❌ No promotional features
- ❌ No discount support
- ❌ No bonus months

### **Plans Page:**
- ✅ Advanced CRUD operations
- ✅ Enhanced plan model with promo
- ✅ Uses `duration_months`
- ✅ Direct Supabase calls
- ✅ Discount support (percentage/flat)
- ✅ Bonus months feature
- ✅ Promo banners and highlight text

---

## 🎯 Recommendations for Changes

1. **Unify the Services**: Choose one service (preferably `settingsService`) and extend it with promo features
2. **Standardize Duration**: Decide on either `duration_days` OR `duration_months`, not both
3. **Consolidate Pages**: Consider removing one page or making them use the same service
4. **Sync Features**: If keeping both, ensure Settings page also supports promo features

---

## 📍 Files Reference

- **Settings Page**: `src/pages/settings/Settings.tsx` (Lines 882-972 for Plans tab)
- **Plans Page**: `src/pages/plans/PlansPage.tsx`
- **Settings Service**: `src/lib/settingsService.ts`
- **Gym Service**: `src/lib/gymService.ts` (for Plans page)
- **Database Table**: `gym_membership_plans`

---

**Last Updated**: 2026-01-01  
**Status**: Ready for changes

