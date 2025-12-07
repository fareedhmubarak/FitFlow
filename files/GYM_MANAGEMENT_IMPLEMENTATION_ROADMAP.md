# IMPLEMENTATION ROADMAP & QUICK START GUIDE
## GymFlow Pro - For Claude Code AI Development

**Priority:** Start Building Immediately  
**Estimated Timeline:** 8-12 weeks  
**Tech Stack:** React + TypeScript + Supabase + Stripe

---

## 🚀 QUICK START (First Steps)

### Step 1: Initialize Project (Day 1)

```bash
# Create React + TypeScript project with Vite
npm create vite@latest gymflow-pro -- --template react-ts
cd gymflow-pro

# Install core dependencies
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install zustand
npm install react-router-dom
npm install react-hook-form zod @hookform/resolvers
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install framer-motion
npm install lucide-react
npm install date-fns

# Install Tailwind & shadcn/ui
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init

# Install dev dependencies
npm install -D @types/node
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D prettier eslint
```

### Step 2: Create Supabase Project (Day 1)

1. Go to https://supabase.com
2. Create new project: "gymflow-pro"
3. Save credentials:
   - Project URL
   - Anon Key
   - Service Role Key
4. Run SQL migrations from Technical Design Document
5. Enable Row Level Security

### Step 3: Project Structure Setup (Day 1)

Create this folder structure:

```
src/
├── app/
│   ├── App.tsx
│   └── main.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── layout/
│   ├── auth/
│   └── shared/
├── hooks/
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── stores/
├── types/
│   └── database.ts      # Generated from Supabase
├── pages/
└── styles/
    └── globals.css
```

### Step 4: Environment Setup (Day 1)

```env
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

## 📅 DEVELOPMENT PHASES

### PHASE 1: Foundation (Week 1-2)

**Goal:** Working authentication + basic dashboard

#### Week 1 Tasks:
- [x] Project setup (Vite + TypeScript)
- [x] Tailwind + shadcn/ui configuration
- [x] Supabase client setup
- [x] Database migrations (all tables)
- [x] RLS policies implementation
- [x] Type generation from Supabase
- [x] Authentication system
  - Login page
  - Signup page
  - Password reset
  - Auth context/store
- [x] Protected routes
- [x] Layout components (Navbar, Sidebar)

#### Week 2 Tasks:
- [x] Onboarding wizard
  - Gym details form
  - Branding (logo upload, colors)
  - Feature selection (toggles)
  - Membership plans creation
  - Stripe Connect onboarding
- [x] Basic dashboard
  - Stats cards (members, revenue, check-ins)
  - Empty states
- [x] Settings page skeleton

**Deliverable:** User can sign up, create gym, complete onboarding, see dashboard

---

### PHASE 2: Member Management (Week 3-4)

**Goal:** Complete member CRUD + subscriptions

#### Week 3 Tasks:
- [x] Member list page
  - Table view
  - Search & filters
  - Pagination
- [x] Member creation form
  - Validation (Zod)
  - Photo upload
  - QR code generation
- [x] Member details page
  - Profile info
  - Activity history
  - Subscription info
- [x] Member edit/delete

#### Week 4 Tasks:
- [x] Membership plans management
  - Create/edit plans
  - Stripe product/price creation
  - Plan listing
- [x] Subscription management
  - Assign plan to member
  - Stripe subscription creation
  - Freeze/unfreeze membership
  - Upgrade/downgrade plan
  - Cancel subscription

**Deliverable:** Full member lifecycle management

---

### PHASE 3: Payments & Billing (Week 5)

**Goal:** Automated billing with Stripe

#### Tasks:
- [x] Stripe integration
  - Connect account setup
  - Payment method collection
  - Subscription creation
  - Webhook handler (Edge Function)
- [x] Payment processing
  - Manual payment recording
  - Automated recurring billing
  - Failed payment handling
  - Refunds
- [x] Invoice & receipt generation
- [x] Payment history page
- [x] **⭐ Payment Calendar View (UNIQUE FEATURE)**
  - Month/week/list views
  - Color-coded by status
  - Member cards per date
  - Quick actions (send reminder, record payment)

**Deliverable:** Fully automated billing system + unique payment calendar

---

### PHASE 4: Class Management & Booking (Week 6-7)

**Goal:** Complete class scheduling & member booking

#### Week 6 Tasks:
- [x] Class management
  - Create class templates
  - Class categories
  - Trainer assignment
- [x] Class scheduling
  - Calendar view (FullCalendar or custom)
  - Recurring schedules
  - Single instance creation
- [x] Class list/grid view

#### Week 7 Tasks:
- [x] Member booking system
  - Browse classes
  - Book class (real-time capacity updates)
  - Cancel booking
  - Waitlist management
  - Auto-promotion from waitlist
- [x] Booking confirmations (email)
- [x] Class reminders (24h, 1h before)
- [x] Attendance tracking
  - Mark attended/no-show
  - Class attendance report

**Deliverable:** Full class scheduling & booking system

---

### PHASE 5: Check-ins & Attendance (Week 7)

**Goal:** Multiple check-in methods + tracking

#### Tasks:
- [x] QR code check-in
  - Generate QR for each member
  - Scanner component (camera or manual input)
  - Validate membership status
- [x] Manual check-in (staff)
- [x] Mobile app self-check-in
- [x] Check-in validation logic
  - Active membership check
  - Payment status check
  - Freeze status check
- [x] Attendance reports
  - Daily/weekly/monthly
  - Peak hours heatmap
  - Member frequency

**Deliverable:** Working check-in system with analytics

---

### PHASE 6: Analytics & Reporting (Week 8)

**Goal:** Comprehensive business intelligence

#### Tasks:
- [x] Dashboard enhancements
  - Revenue charts (Chart.js or Recharts)
  - Member growth graph
  - Retention metrics
  - Today's activity feed
- [x] Pre-built reports
  - Revenue report
  - Member report
  - Attendance report
  - Class performance
- [x] Export functionality (CSV, PDF)
- [x] Custom date ranges
- [x] Real-time updates

**Deliverable:** Full analytics dashboard + reports

---

### PHASE 7: Communication & Notifications (Week 9)

**Goal:** Automated notifications + bulk messaging

#### Tasks:
- [x] Email system (Resend integration)
  - Transactional emails
  - Email templates
- [x] SMS system (Twilio - optional)
  - SMS templates
- [x] Automated notifications
  - Payment reminders
  - Class reminders
  - Membership expiry alerts
- [x] Bulk messaging
  - Segment members
  - Schedule messages
  - Track delivery
- [x] In-app notifications
  - Notification center
  - Real-time updates

**Deliverable:** Complete notification system

---

### PHASE 8: Optional Features (Week 10-11)

**Goal:** Configurable features based on gym needs

#### Lead Management (Week 10):
- [x] Lead capture form
- [x] Sales pipeline (Kanban board)
- [x] Follow-up tracking
- [x] Conversion to member
- [x] Lead reports

#### Biometric Access Control (Week 10):
- [x] Device management UI
- [x] Enable/disable toggle
- [x] Device integration (Edge Function)
- [x] Member enrollment on device
- [x] Access logs sync
- [x] Real-time access control

#### Point of Sale (Week 11):
- [x] Product management
- [x] Inventory tracking
- [x] Sales transactions
- [x] Receipt generation
- [x] Sales reports

#### Nutrition Tracking (Week 11):
- [x] Meal plans
- [x] Progress tracking
- [x] Body measurements
- [x] Photo tracking

**Deliverable:** All optional features available via toggles

---

### PHASE 9: Mobile & PWA (Week 12)

**Goal:** Mobile-first experience + installable app

#### Tasks:
- [x] PWA configuration
  - Service worker
  - Manifest.json
  - Offline support
  - Push notifications
- [x] Mobile responsive design
  - All pages mobile-friendly
  - Touch gestures
  - Bottom navigation
- [x] Member portal (mobile-first)
  - Dashboard
  - Book classes
  - View membership
  - Update payment method
- [x] QR scanner (camera access)

**Deliverable:** Fully responsive app + PWA

---

### PHASE 10: Polish & Launch Prep (Week 12)

**Goal:** Production-ready application

#### Tasks:
- [x] Performance optimization
  - Code splitting
  - Image optimization
  - Bundle size reduction
  - Lighthouse score > 90
- [x] Error handling
  - Error boundaries
  - Toast notifications
  - User-friendly error messages
- [x] Loading states
  - Skeletons
  - Spinners
  - Optimistic updates
- [x] Animations & micro-interactions
  - Page transitions
  - Button effects
  - Success celebrations
- [x] Accessibility (A11Y)
  - Keyboard navigation
  - Screen reader support
  - ARIA labels
- [x] Testing
  - Unit tests (critical functions)
  - Integration tests (forms)
  - E2E tests (user flows)
- [x] Documentation
  - User guide
  - API documentation
  - Developer README

**Deliverable:** Production-ready, polished application

---

## 🎯 CRITICAL FEATURES CHECKLIST

### Must-Have (MVP):
- ✅ Authentication (login, signup, password reset)
- ✅ Gym onboarding wizard
- ✅ Member management (CRUD)
- ✅ Membership plans
- ✅ Subscriptions (Stripe)
- ✅ Automated billing
- ✅ Payment history
- ✅ **Payment Calendar View** ⭐
- ✅ Class management
- ✅ Class scheduling
- ✅ Class booking (with waitlist)
- ✅ Check-ins (QR code, manual)
- ✅ Dashboard (stats + charts)
- ✅ Reports (revenue, members, attendance)
- ✅ Notifications (email)
- ✅ Settings (gym, user, feature toggles)
- ✅ Mobile responsive

### Nice-to-Have (Post-MVP):
- 🔲 Biometric access control
- 🔲 Lead management
- 🔲 Point of Sale
- 🔲 Nutrition tracking
- 🔲 SMS notifications
- 🔲 Email marketing campaigns
- 🔲 Multi-location support
- 🔲 Referral program
- 🔲 Contracts & waivers

---

## 💻 CODE TEMPLATES

### 1. Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper to get current user's gym
export async function getCurrentGym() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: gymUser } = await supabase
    .from('gym_users')
    .select('gym_id, gyms(*)')
    .eq('auth_user_id', user.id)
    .single();
  
  return gymUser?.gyms;
}
```

### 2. React Query Setup

```typescript
// app/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3. Custom Hook Template

```typescript
// hooks/useMembers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Member } from '@/types/database';

export function useMembers(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*, subscriptions(*, membership_plans(*))');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (member: Partial<Member>) => {
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

export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
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

export function useDeleteMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
```

### 4. Form Component Template (with Zod validation)

```typescript
// components/members/MemberForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateMember } from '@/hooks/useMembers';

const memberSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  date_of_birth: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

export function MemberForm({ onSuccess }: { onSuccess?: () => void }) {
  const { mutate: createMember, isLoading } = useCreateMember();
  
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
    },
  });
  
  async function onSubmit(data: MemberFormData) {
    createMember(data, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Full Name</label>
        <Input {...form.register('full_name')} />
        {form.formState.errors.full_name && (
          <p className="text-red-500">{form.formState.errors.full_name.message}</p>
        )}
      </div>
      
      <div>
        <label>Email</label>
        <Input type="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="text-red-500">{form.formState.errors.email.message}</p>
        )}
      </div>
      
      <div>
        <label>Phone</label>
        <Input type="tel" {...form.register('phone')} />
        {form.formState.errors.phone && (
          <p className="text-red-500">{form.formState.errors.phone.message}</p>
        )}
      </div>
      
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Member'}
      </Button>
    </form>
  );
}
```

---

## 🎨 UI/UX GUIDELINES

### Color Usage:
```css
/* Primary Actions: Gradient */
.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

/* Success: Green */
.status-paid { color: #10b981; }

/* Warning: Amber */
.status-due { color: #f59e0b; }

/* Danger: Red */
.status-overdue { color: #ef4444; }

/* Info: Blue */
.status-trial { color: #3b82f6; }
```

### Animation Guidelines:
- Page transitions: 200ms fade + slide
- Button hover: 150ms scale(1.05)
- Card hover: 200ms lift (shadow + translateY)
- Success actions: Confetti animation
- Loading: Skeleton screens (not spinners for lists)

### Component Sizes:
- Buttons: h-10 (40px) by default
- Input fields: h-10
- Cards: p-6, rounded-lg
- Modals: max-w-2xl
- Sidebar: w-64 (collapsed: w-16)

---

## 🔧 DEBUGGING TIPS

### Common Issues:

**1. RLS Blocking Queries:**
```typescript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Check if gym_id exists in gym_users
const { data } = await supabase
  .from('gym_users')
  .select('gym_id')
  .eq('auth_user_id', user.id);
console.log('Gym ID:', data);

// Temporarily disable RLS for testing (NEVER in production)
// Run in SQL editor: ALTER TABLE members DISABLE ROW LEVEL SECURITY;
```

**2. Stripe Webhooks Not Working:**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Verify webhook signature
# Check Supabase Edge Function logs
```

**3. Real-time Not Updating:**
```typescript
// Ensure channel is subscribed
const channel = supabase.channel('check_ins');
console.log('Channel status:', channel.state);

// Check if RLS allows listening
// Add policy: CREATE POLICY "Enable realtime" ON check_ins FOR SELECT USING (true);
```

---

## 📦 DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All environment variables set
- [ ] Database migrations run on production
- [ ] RLS policies tested
- [ ] Stripe webhooks configured
- [ ] Email templates tested
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (PostHog) configured
- [ ] Performance tested (Lighthouse > 90)
- [ ] Security audit passed
- [ ] Backup strategy in place

### Post-Deployment:
- [ ] Smoke tests passed
- [ ] Monitoring dashboards setup
- [ ] Status page configured
- [ ] Support email setup
- [ ] Documentation published
- [ ] User onboarding guide ready

---

## 🆘 SUPPORT & RESOURCES

**Supabase Docs:** https://supabase.com/docs  
**React Query Docs:** https://tanstack.com/query  
**Stripe Docs:** https://stripe.com/docs  
**shadcn/ui:** https://ui.shadcn.com  
**Tailwind CSS:** https://tailwindcss.com/docs  

**Community:**
- Supabase Discord: https://discord.supabase.com
- Reddit: r/reactjs, r/webdev

---

## 🎯 SUCCESS CRITERIA

**Week 4:** User can sign up, add members, create subscriptions  
**Week 8:** User can schedule classes, accept bookings, process payments  
**Week 12:** Full-featured SaaS ready for beta users

**Launch Goals:**
- 10 beta gyms onboarded
- 90+ Lighthouse score
- <2s page load
- >4.5/5 user satisfaction
- Zero critical bugs

---

**READY TO BUILD? Start with Phase 1, Week 1, Task 1!** 🚀

_Good luck, Claude Code! You've got this!_
