# FitFlow - Technical Design Document
## Multi-Tenant Gym Management System

**Version:** 1.0  
**Date:** November 26, 2025  
**Tech Stack:** React + Supabase + Vercel

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────┐
│     Frontend (Vercel)               │
│   React + Vite + TypeScript         │
│   Mobile-First Responsive           │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│     Supabase Platform               │
│  ┌──────────────────────────────┐  │
│  │  PostgreSQL 15 Database       │  │
│  │  + Row Level Security (RLS)   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Authentication (JWT)         │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Storage (Images)             │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Auto-Generated REST API      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 1.2 Multi-Tenant Strategy

**Approach:** Shared Database + Row Level Security (RLS)

**Why:**
- Cost-effective (one database for all gyms)
- Secure (database-level isolation)
- Simple (no complex sharding)
- Scalable (handles 100s of gyms)

**Data Isolation:**
- Every table has `gym_id` column
- RLS policies filter by `gym_id` automatically
- Gym A physically cannot access Gym B's data

---

## 2. DATABASE SCHEMA

### 2.1 Core Tables

#### **Table 1: gyms**
```sql
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  logo_url TEXT,
  language TEXT DEFAULT 'en', -- en, te, ta, hi
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### **Table 2: gym_users** (Authentication)
```sql
CREATE TABLE gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'owner', -- owner, staff
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, email)
);

-- Index for fast lookup
CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_id ON gym_users(auth_user_id);
```

---

#### **Table 3: members**
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  photo_url TEXT,
  
  -- Physical Stats
  height TEXT, -- e.g., "5'10"
  weight TEXT, -- e.g., "75kg"
  
  -- Membership
  joining_date DATE NOT NULL, -- CRITICAL: Determines all due dates
  membership_plan TEXT NOT NULL, -- 'monthly', 'quarterly', 'half_yearly', 'annual'
  plan_amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, phone)
);

-- Indexes for performance
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(gym_id, status);
CREATE INDEX idx_members_joining_date ON members(gym_id, joining_date);
```

---

#### **Table 4: payments**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash', 'upi', 'card', 'bank_transfer'
  payment_date DATE NOT NULL,
  
  -- Due Date Tracking
  due_date DATE NOT NULL, -- Expected payment date
  days_late INTEGER DEFAULT 0, -- Calculated: payment_date - due_date
  
  -- Reference
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_due_date ON payments(gym_id, due_date);
CREATE INDEX idx_payments_payment_date ON payments(gym_id, payment_date);
```

---

#### **Table 5: payment_schedule** (Pre-calculated due dates)
```sql
CREATE TABLE payment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Due Date
  due_date DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  paid_payment_id UUID REFERENCES payments(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(member_id, due_date)
);

-- Indexes
CREATE INDEX idx_payment_schedule_gym_id ON payment_schedule(gym_id);
CREATE INDEX idx_payment_schedule_due_date ON payment_schedule(gym_id, due_date, status);
CREATE INDEX idx_payment_schedule_member ON payment_schedule(member_id);
```

**Purpose:** 
- Pre-calculate all future due dates for easy querying
- Calendar page queries this table (fast lookups)
- Auto-generated when member joins

---

### 2.2 Row Level Security (RLS) Policies

#### **Enable RLS on all tables**
```sql
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
```

---

#### **Helper Function: Get Current Gym ID**
```sql
CREATE OR REPLACE FUNCTION get_current_gym_id()
RETURNS UUID AS $$
  SELECT gym_id 
  FROM gym_users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

#### **RLS Policies for members table**
```sql
-- Users can only see their own gym's members
CREATE POLICY "gym_isolation_select" ON members
  FOR SELECT
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_isolation_insert" ON members
  FOR INSERT
  WITH CHECK (gym_id = get_current_gym_id());

CREATE POLICY "gym_isolation_update" ON members
  FOR UPDATE
  USING (gym_id = get_current_gym_id());

CREATE POLICY "gym_isolation_delete" ON members
  FOR DELETE
  USING (gym_id = get_current_gym_id());
```

**Apply similar policies to all tables** (payments, payment_schedule, etc.)

---

### 2.3 Database Functions

#### **Function: Calculate Next Due Date**
```sql
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_joining_date DATE,
  p_membership_plan TEXT,
  p_last_payment_date DATE
)
RETURNS DATE AS $$
DECLARE
  v_cycle_days INTEGER;
  v_next_due DATE;
BEGIN
  -- Get cycle duration
  v_cycle_days := CASE p_membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
    ELSE 30
  END;
  
  -- Calculate next due date from joining date
  v_next_due := p_joining_date;
  
  WHILE v_next_due <= p_last_payment_date LOOP
    v_next_due := v_next_due + v_cycle_days;
  END LOOP;
  
  RETURN v_next_due;
END;
$$ LANGUAGE plpgsql;
```

---

#### **Function: Generate Payment Schedule for Member**
```sql
CREATE OR REPLACE FUNCTION generate_payment_schedule(
  p_member_id UUID,
  p_months_ahead INTEGER DEFAULT 12
)
RETURNS VOID AS $$
DECLARE
  v_member RECORD;
  v_due_date DATE;
  v_cycle_days INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  
  -- Determine cycle days
  v_cycle_days := CASE v_member.membership_plan
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    WHEN 'half_yearly' THEN 180
    WHEN 'annual' THEN 365
  END;
  
  -- Start from joining date
  v_due_date := v_member.joining_date;
  
  -- Generate schedule entries
  WHILE v_count < (p_months_ahead * 12 / (v_cycle_days / 30)) LOOP
    INSERT INTO payment_schedule (gym_id, member_id, due_date, amount_due)
    VALUES (v_member.gym_id, p_member_id, v_due_date, v_member.plan_amount)
    ON CONFLICT (member_id, due_date) DO NOTHING;
    
    v_due_date := v_due_date + v_cycle_days;
    v_count := v_count + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

#### **Trigger: Auto-generate schedule when member created**
```sql
CREATE OR REPLACE FUNCTION trigger_generate_schedule()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_payment_schedule(NEW.id, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_member_insert
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_schedule();
```

---

#### **Function: Get Payment Status for Calendar**
```sql
CREATE OR REPLACE FUNCTION get_calendar_data(
  p_gym_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  due_date DATE,
  member_id UUID,
  member_name TEXT,
  member_photo TEXT,
  amount_due DECIMAL,
  status TEXT,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.due_date,
    m.id,
    m.full_name,
    m.photo_url,
    ps.amount_due,
    CASE 
      WHEN ps.status = 'paid' THEN 'paid'
      WHEN ps.due_date > CURRENT_DATE THEN 'upcoming'
      WHEN ps.due_date = CURRENT_DATE THEN 'due_today'
      WHEN EXISTS (
        SELECT 1 FROM payment_schedule ps2 
        WHERE ps2.member_id = ps.member_id 
        AND ps2.due_date < ps.due_date 
        AND ps2.status = 'overdue'
      ) THEN 'overdue_multiple'
      ELSE 'overdue'
    END,
    CASE 
      WHEN ps.due_date < CURRENT_DATE AND ps.status != 'paid' 
      THEN (CURRENT_DATE - ps.due_date)::INTEGER
      ELSE 0
    END
  FROM payment_schedule ps
  JOIN members m ON m.id = ps.member_id
  WHERE ps.gym_id = p_gym_id
    AND EXTRACT(YEAR FROM ps.due_date) = p_year
    AND EXTRACT(MONTH FROM ps.due_date) = p_month
  ORDER BY ps.due_date, m.full_name;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. AUTHENTICATION FLOW

### 3.1 User Signup (Gym Owner)
```typescript
// 1. Create auth user in Supabase
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: 'owner@gym.com',
  password: 'secure_password',
});

// 2. Create gym record
const { data: gym } = await supabase
  .from('gyms')
  .insert({ name: 'My Gym', email: 'owner@gym.com' })
  .select()
  .single();

// 3. Link auth user to gym
await supabase.from('gym_users').insert({
  gym_id: gym.id,
  auth_user_id: authData.user.id,
  email: 'owner@gym.com',
  role: 'owner',
});
```

---

### 3.2 User Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'owner@gym.com',
  password: 'secure_password',
});

// JWT token automatically stored in localStorage
// All API calls automatically include token
```

---

### 3.3 Getting Current Gym
```typescript
// Frontend helper
async function getCurrentGym() {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: gymUser } = await supabase
    .from('gym_users')
    .select('gym_id, gyms(*)')
    .eq('auth_user_id', user.id)
    .single();
  
  return gymUser.gyms;
}
```

---

## 4. API DESIGN

### 4.1 Auto-Generated REST API

Supabase provides REST API automatically:

```typescript
// Get all members (auto-filtered by RLS)
const { data: members } = await supabase
  .from('members')
  .select('*')
  .eq('status', 'active')
  .order('full_name');

// Add new member
const { data: newMember } = await supabase
  .from('members')
  .insert({
    gym_id: currentGymId,
    full_name: 'John Doe',
    phone: '9876543210',
    joining_date: '2025-01-15',
    membership_plan: 'monthly',
    plan_amount: 1000,
  })
  .select()
  .single();

// Update member
await supabase
  .from('members')
  .update({ status: 'inactive' })
  .eq('id', memberId);

// Delete member
await supabase
  .from('members')
  .delete()
  .eq('id', memberId);
```

---

### 4.2 Custom Queries for Dashboard

```typescript
// Get due today count and amount
const { data: dueToday } = await supabase
  .from('payment_schedule')
  .select('amount_due')
  .eq('gym_id', gymId)
  .eq('due_date', today)
  .eq('status', 'pending');

const dueTodayCount = dueToday.length;
const dueTodayAmount = dueToday.reduce((sum, p) => sum + p.amount_due, 0);

// Get overdue this month
const { data: overdue } = await supabase
  .from('payment_schedule')
  .select('*, members(*)')
  .eq('gym_id', gymId)
  .eq('status', 'overdue')
  .gte('due_date', startOfMonth)
  .lte('due_date', endOfMonth);
```

---

### 4.3 Calendar Data Query

```typescript
// Use custom function
const { data: calendarData } = await supabase
  .rpc('get_calendar_data', {
    p_gym_id: gymId,
    p_year: 2025,
    p_month: 11,
  });

// Returns array of:
// {
//   due_date: '2025-11-15',
//   member_id: 'uuid',
//   member_name: 'John Doe',
//   member_photo: 'url',
//   amount_due: 1000,
//   status: 'paid' | 'due_today' | 'overdue' | 'upcoming',
//   days_overdue: 3
// }
```

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Tech Stack
```json
{
  "framework": "React 18",
  "language": "TypeScript",
  "build": "Vite",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "routing": "React Router v6",
  "state": {
    "server": "TanStack Query (React Query)",
    "local": "useState/useReducer"
  },
  "i18n": "react-i18next",
  "animations": "Framer Motion"
}
```

---

### 5.2 Project Structure
```
src/
├── app/
│   ├── App.tsx
│   └── main.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── dashboard/
│   ├── members/
│   ├── calendar/
│   └── payments/
├── hooks/
│   ├── useMembers.ts
│   ├── usePayments.ts
│   └── useCalendar.ts
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── i18n/
│   ├── config.ts
│   └── locales/
│       ├── en.json
│       ├── te.json
│       ├── ta.json
│       └── hi.json
├── pages/
│   ├── Dashboard.tsx
│   ├── Members.tsx
│   ├── Calendar.tsx
│   ├── Payments.tsx
│   └── Settings.tsx
└── types/
    └── database.ts
```

---

### 5.3 React Query Hooks Example

```typescript
// hooks/useMembers.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useMembers(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (member: NewMember) => {
      const { data, error } = await supabase
        .from('members')
        .insert(member)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
```

---

## 6. MULTI-LANGUAGE IMPLEMENTATION

### 6.1 i18n Configuration
```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    ta: { translation: ta },
    hi: { translation: hi },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

---

### 6.2 Translation Files

```json
// locales/en.json
{
  "dashboard": {
    "title": "Dashboard",
    "dueToday": "Due Today",
    "overdue": "Overdue",
    "totalMembers": "Total Members"
  },
  "members": {
    "addMember": "Add Member",
    "memberList": "Member List",
    "active": "Active",
    "inactive": "Inactive"
  },
  "calendar": {
    "paymentCalendar": "Payment Calendar",
    "paid": "Paid",
    "pending": "Pending"
  }
}
```

```json
// locales/te.json (Telugu)
{
  "dashboard": {
    "title": "డాష్‌బోర్డ్",
    "dueToday": "ఈరోజు చెల్లించాల్సింది",
    "overdue": "మీరిన చెల్లింపులు",
    "totalMembers": "మొత్తం సభ్యులు"
  },
  "members": {
    "addMember": "సభ్యుడిని జోడించండి",
    "memberList": "సభ్యుల జాబితా",
    "active": "క్రియాశీలం",
    "inactive": "నిష్క్రియం"
  }
}
```

---

### 6.3 Usage in Components
```typescript
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <Card>
        <CardTitle>{t('dashboard.dueToday')}</CardTitle>
      </Card>
    </div>
  );
}
```

---

## 7. DEPLOYMENT

### 7.1 Supabase Setup
1. Create Supabase project
2. Run SQL migrations (schema creation)
3. Enable RLS on all tables
4. Create policies
5. Get API keys (anon key, service role key)

---

### 7.2 Vercel Deployment
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Build project
npm run build

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 7.3 Environment Variables
```bash
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Data Security
- ✅ RLS enforces gym isolation at database level
- ✅ JWT tokens expire (1 hour)
- ✅ HTTPS only (Vercel + Supabase)
- ✅ Password hashing (bcrypt via Supabase)
- ✅ No sensitive data in logs

---

### 8.2 Input Validation
```typescript
import { z } from 'zod';

const memberSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().regex(/^[0-9]{10}$/),
  email: z.string().email().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

// Validate before insert
const validated = memberSchema.parse(formData);
```

---

## 9. PERFORMANCE OPTIMIZATION

### 9.1 Database Indexes
- All foreign keys indexed
- `gym_id` indexed on every table
- `due_date` + `status` composite index for calendar queries
- `joining_date` indexed for member queries

---

### 9.2 Frontend Optimization
- React Query caching (5 min stale time)
- Lazy load routes
- Image optimization (WebP format)
- Debounced search
- Pagination for large lists

---

### 9.3 Query Optimization
```sql
-- BAD: Full table scan
SELECT * FROM members WHERE gym_id = 'xxx';

-- GOOD: Use covering index
SELECT id, full_name, phone, status 
FROM members 
WHERE gym_id = 'xxx' AND status = 'active'
LIMIT 50;
```

---

## 10. MONITORING & MAINTENANCE

### 10.1 Error Tracking
- Supabase logs (database errors)
- Vercel logs (deployment errors)
- Console errors (frontend)

---

### 10.2 Backup Strategy
- Supabase automatic backups (daily)
- Point-in-time recovery (7 days)
- Manual export option

---

## 11. COST ESTIMATE

### 11.1 Free Tier (First 50 Gyms)
- Supabase: Free (500MB database, 2GB file storage)
- Vercel: Free (100GB bandwidth)
- Total: ₹0/month

---

### 11.2 Paid Tier (50-500 Gyms)
- Supabase Pro: $25/month (~₹2,000)
- Vercel Pro: $20/month (~₹1,600)
- Total: ~₹3,600/month

**Revenue needed:** 4 gyms paying ₹1,000/month to break even

---

## 12. DEVELOPMENT TIMELINE

### Week 1-2: Setup & Auth
- Supabase project setup
- Database schema creation
- RLS policies
- Authentication flow
- Basic routing

### Week 3-4: Member Management
- Member CRUD
- Add member form
- Member list with filters
- Member details popup

### Week 5-6: Payment System
- Record payment
- Payment history
- Due date calculations
- Payment schedule generation

### Week 7-8: Calendar & Dashboard
- Payment calendar component
- Dashboard stats
- Color-coded calendar
- Month navigation

### Week 9-10: Polish & Language
- Multi-language setup
- UI animations
- Mobile responsive
- Testing & bug fixes

**Total: 10 weeks**

---

**END OF TECHNICAL DESIGN DOCUMENT**

**Status:** ✅ Ready for Implementation  
**Next Step:** Begin development with setup phase









