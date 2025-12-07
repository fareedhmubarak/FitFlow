# FitFlow - Complete Development Brief for Claude Code
## Multi-Language Gym Management SaaS Platform

**Project Type:** Full-Stack Web & Mobile Application  
**Target:** Production-ready SaaS platform  
**Timeline:** 20 weeks (5 months)  
**Tech Stack:** React + TypeScript + Supabase + shadcn/ui

---

## 🎯 EXECUTIVE SUMMARY

Build **FitFlow** - the world's first multi-language gym management SaaS platform with native support for Telugu (తెలుగు) and Tamil (தமிழ்) languages, designed specifically for the Indian market.

**What Makes This Special:**
1. **Multi-Language:** English, Telugu, Tamil, Hindi (first in the industry)
2. **Payment Calendar:** Unique visual calendar showing member payments with color-coded status  
3. **Modular Features:** Gyms can enable/disable features like biometric access
4. **WhatsApp-First:** Native WhatsApp integration (critical for India)
5. **Offline-Capable:** Works on 2G networks
6. **Modern UI:** Glassmorphism design with smooth animations

---

## 📋 COMPLETE DOCUMENTATION

All detailed documentation is available in `/mnt/user-data/outputs/`:

1. **COMPLETE_PRD_FITFLOW.md** (47KB) - Complete Product Requirements
2. **GYM_MANAGEMENT_TECHNICAL_DESIGN_DOCUMENT.md** (73KB) - Full Technical Design
3. **GYM_MANAGEMENT_IMPLEMENTATION_ROADMAP.md** (19KB) - Development Phases

---

## 🏗️ ARCHITECTURE OVERVIEW

### Multi-Tenant SaaS Architecture
```
┌─────────────────────────────────────────────┐
│           Frontend (Vercel)                 │
│   React + TypeScript + Tailwind + shadcn   │
│        (Web + PWA + Mobile Apps)            │
└─────────────┬───────────────────────────────┘
              │
              │ REST API / WebSocket
              ▼
┌─────────────────────────────────────────────┐
│         Supabase (Backend)                  │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL 15 (Multi-Tenant DB)     │  │
│  │  - Row Level Security (RLS)          │  │
│  │  - All data isolated by gym_id       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Authentication (GoTrue)             │  │
│  │  - Email/Password + OTP              │  │
│  │  - JWT tokens                        │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Realtime (WebSocket)                │  │
│  │  - Live updates                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Storage (File Uploads)              │  │
│  │  - Profile photos, documents         │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Edge Functions (Serverless)         │  │
│  │  - Payment webhooks                  │  │
│  │  - Notifications                     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              │
              ├──────────> Stripe (International Payments)
              ├──────────> Razorpay (India UPI/Cards)
              ├──────────> Twilio (SMS)
              ├──────────> WhatsApp Business API
              └──────────> Resend/SendGrid (Email)
```

---

## 🛠️ TECHNOLOGY STACK

### Frontend
```javascript
{
  "framework": "React 18+ with TypeScript",
  "buildTool": "Vite",
  "styling": "Tailwind CSS 3.4+",
  "components": "shadcn/ui + Radix UI",
  "stateManagement": {
    "global": "Zustand",
    "server": "TanStack Query (React Query)"
  },
  "router": "React Router v6",
  "forms": "React Hook Form + Zod",
  "animations": "Framer Motion",
  "charts": "Recharts",
  "i18n": "react-i18next",
  "icons": "Lucide React"
}
```

### Backend (Supabase)
```javascript
{
  "database": "PostgreSQL 15",
  "auth": "Supabase Auth (JWT)",
  "api": "PostgREST (auto-generated)",
  "realtime": "WebSocket subscriptions",
  "storage": "S3-compatible",
  "functions": "Edge Functions (Deno)"
}
```

### Integrations
- **Payments:** Stripe, Razorpay
- **SMS:** Twilio
- **Email:** Resend or SendGrid
- **WhatsApp:** Meta Business API
- **Push:** Firebase Cloud Messaging

---

## 📊 DATABASE SCHEMA (Supabase PostgreSQL)

### Core Tables

```sql
-- 1. Gyms (Tenants)
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Gym Users (Staff)
CREATE TABLE gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL, -- owner, manager, trainer, front_desk
  preferred_language TEXT DEFAULT 'en', -- NEW: en, te, ta, hi
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gym_id, email)
);

-- 3. Members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_number TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  photo_url TEXT,
  qr_code TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- active, inactive, frozen, cancelled
  preferred_language TEXT DEFAULT 'en', -- NEW: Language preference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gym_id, email)
);

-- 4. Membership Plans
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}', -- NEW: {"te": "వార్షిక సభ్యత్వం", "ta": "ஆண்டு உறுப்பினர்"}
  description TEXT,
  description_translations JSONB DEFAULT '{}', -- NEW
  price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL, -- monthly, quarterly, annual
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  membership_plan_id UUID REFERENCES membership_plans(id),
  status TEXT DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments (For Payment Calendar Feature)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL, -- succeeded, pending, failed, refunded
  payment_method TEXT, -- card, upi, cash, bank_transfer
  due_date DATE, -- NEW: For calendar view
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_translations JSONB DEFAULT '{}', -- NEW
  description TEXT,
  category TEXT, -- yoga, crossfit, etc
  duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Class Schedules
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES gym_users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  booked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  class_schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_schedule_id, member_id)
);

-- 10. Check-ins
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  method TEXT, -- qr_code, manual, app
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications (Multi-language support)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- email, sms, whatsapp
  template TEXT NOT NULL,
  recipient_language TEXT DEFAULT 'en', -- NEW
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their gym's data
CREATE POLICY "gym_isolation" ON members
  FOR ALL USING (
    gym_id IN (
      SELECT gym_id FROM gym_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Apply similar policies to all tables
```

---

## 🌍 MULTI-LANGUAGE IMPLEMENTATION

### Language Setup
```typescript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      te: { translation: require('./locales/te.json') }, // Telugu
      ta: { translation: require('./locales/ta.json') }, // Tamil
      hi: { translation: require('./locales/hi.json') }  // Hindi
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
```

### Translation Files Structure
```json
// locales/en.json
{
  "dashboard": {
    "welcome": "Welcome back, {{name}}!",
    "checkins": "Check-ins",
    "revenue": "Revenue",
    "members": "Members"
  },
  "payment": {
    "due": "Payment Due",
    "overdue": "Payment Overdue",
    "paid": "Paid",
    "pending": "Pending"
  },
  "member": {
    "add": "Add Member",
    "edit": "Edit Member",
    "delete": "Delete Member"
  }
}

// locales/te.json (Telugu)
{
  "dashboard": {
    "welcome": "స్వాగతం, {{name}}!",
    "checkins": "చెక్-ఇన్లు",
    "revenue": "ఆదాయం",
    "members": "సభ్యులు"
  },
  "payment": {
    "due": "చెల్లింపు రావాల్సింది",
    "overdue": "చెల్లింపు మీరింది",
    "paid": "చెల్లించారు",
    "pending": "పెండింగ్"
  },
  "member": {
    "add": "సభ్యుడిని చేర్చండి",
    "edit": "సభ్యుడిని సవరించండి",
    "delete": "సభ్యుడిని తొలగించండి"
  }
}

// locales/ta.json (Tamil)
{
  "dashboard": {
    "welcome": "வரவேற்கிறோம், {{name}}!",
    "checkins": "செக்-இன்கள்",
    "revenue": "வருமானம்",
    "members": "உறுப்பினர்கள்"
  },
  "payment": {
    "due": "செலுத்த வேண்டிய தொகை",
    "overdue": "செலுத்துதல் தாமதமானது",
    "paid": "செலுத்தப்பட்டது",
    "pending": "நிலுவையில் உள்ளது"
  }
}
```

### Font Setup (Tailwind Config)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Telugu', // Telugu support
          'Noto Sans Tamil',  // Tamil support
          'Noto Sans Devanagari', // Hindi support
          'system-ui',
          'sans-serif'
        ]
      }
    }
  }
}
```

---

## 📅 PAYMENT DUE CALENDAR (Unique Feature)

### Component Structure
```typescript
// components/PaymentCalendar.tsx
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

interface PaymentDue {
  id: string;
  memberName: string;
  amount: number;
  status: 'paid' | 'due' | 'overdue_1_7' | 'overdue_8+' | 'upcoming';
  dueDate: Date;
}

const PaymentCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [paymentsData, setPaymentsData] = useState<PaymentDue[]>([]);

  // Fetch payments for the month
  useEffect(() => {
    fetchPaymentsDue(selectedDate.getMonth(), selectedDate.getFullYear());
  }, [selectedDate]);

  // Color coding
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-500';
      case 'due': return 'bg-yellow-500';
      case 'overdue_1_7': return 'bg-orange-500';
      case 'overdue_8+': return 'bg-red-500';
      case 'upcoming': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        className="rounded-md border"
        components={{
          Day: ({ date }) => {
            const paymentsOnDate = paymentsData.filter(p => 
              isSameDay(p.dueDate, date)
            );
            
            return (
              <div className="relative">
                {date.getDate()}
                {paymentsOnDate.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {statusCounts.map(count => (
                      <Badge className={getStatusColor(count.status)}>
                        {count.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        }}
      />
    </div>
  );
};
```

### Database Query for Calendar
```sql
-- Get all payments due in a month with their status
CREATE OR REPLACE FUNCTION get_payment_calendar(
  p_gym_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  due_date DATE,
  member_id UUID,
  member_name TEXT,
  amount DECIMAL,
  status TEXT,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.due_date,
    m.id AS member_id,
    m.full_name AS member_name,
    p.amount,
    CASE 
      WHEN p.status = 'succeeded' THEN 'paid'
      WHEN p.due_date = CURRENT_DATE THEN 'due'
      WHEN p.due_date < CURRENT_DATE AND (CURRENT_DATE - p.due_date) <= 7 THEN 'overdue_1_7'
      WHEN p.due_date < CURRENT_DATE AND (CURRENT_DATE - p.due_date) > 7 THEN 'overdue_8+'
      WHEN p.due_date > CURRENT_DATE AND (p.due_date - CURRENT_DATE) <= 7 THEN 'upcoming'
      ELSE 'future'
    END AS status,
    CASE 
      WHEN p.due_date < CURRENT_DATE THEN (CURRENT_DATE - p.due_date)
      ELSE 0
    END AS days_overdue
  FROM payments p
  JOIN members m ON p.member_id = m.id
  WHERE p.gym_id = p_gym_id
    AND EXTRACT(MONTH FROM p.due_date) = p_month
    AND EXTRACT(YEAR FROM p.due_date) = p_year
  ORDER BY p.due_date, m.full_name;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 UI/UX DESIGN SYSTEM

### Color Palette
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1', // Indigo
          gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        },
        secondary: '#06b6d4', // Cyan
        success: '#10b981', // Green
        warning: '#f59e0b', // Amber
        danger: '#ef4444', // Red
        
        // Payment Status Colors
        'payment-paid': '#10b981',
        'payment-due': '#f59e0b',
        'payment-overdue-early': '#fb923c',
        'payment-overdue-late': '#ef4444',
        'payment-upcoming': '#3b82f6',
        'payment-frozen': '#64748b'
      }
    }
  }
}
```

### Glassmorphism Style
```css
/* Glass card effect */
.glass-card {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
}
```

---

## 🚀 DEVELOPMENT PHASES

### Phase 1: Foundation (Weeks 1-8) - MVP
**Goals:** Basic multi-tenant system with core features

**Deliverables:**
- ✅ Supabase setup with multi-tenant schema
- ✅ Authentication (email/password + OTP)
- ✅ Multi-language setup (EN, TE, TA, HI)
- ✅ Member CRUD operations
- ✅ Membership plans management
- ✅ Payment processing (Stripe + Razorpay)
- ✅ Basic QR check-in
- ✅ Simple dashboard with KPIs
- ✅ Responsive design (mobile/desktop)

**Technical Tasks:**
1. Initialize Vite + React + TypeScript project
2. Setup Tailwind CSS + shadcn/ui components
3. Configure Supabase client
4. Implement i18next with 4 languages
5. Create authentication flow
6. Build member management screens
7. Integrate Stripe & Razorpay
8. Deploy to Vercel (staging)

### Phase 2: Core Features (Weeks 9-14)
**Goals:** Advanced features that differentiate FitFlow

**Deliverables:**
- ✅ Payment Due Calendar (unique feature)
- ✅ Class scheduling & booking system
- ✅ Staff management & roles
- ✅ Automated notifications (SMS/WhatsApp/Email)
- ✅ Member self-service portal
- ✅ Basic reporting & analytics
- ✅ PWA setup for offline capability

**Technical Tasks:**
1. Build payment calendar component
2. Create class scheduling UI
3. Implement booking system with waitlist
4. Setup Twilio (SMS) & WhatsApp API
5. Build notification templates (multi-language)
6. Create member portal/app
7. Setup service workers for PWA

### Phase 3: Advanced Features (Weeks 15-20)
**Goals:** Optional modules & enterprise features

**Deliverables:**
- ✅ Modular feature enablement system
- ✅ Advanced analytics & reports
- ✅ Marketing automation
- ✅ Native mobile apps (iOS/Android)
- ✅ Biometric access module (optional)
- ✅ API for integrations
- ✅ Production deployment

**Technical Tasks:**
1. Build feature toggle system
2. Create advanced reports with charts
3. Implement marketing automation
4. Build React Native apps
5. Create API documentation
6. Security audit & penetration testing
7. Production deployment
8. Beta testing with pilot gyms

---

## 📱 MOBILE APP STRATEGY

### Progressive Web App (PWA) - Phase 2
- Service workers for offline functionality
- App-like experience on mobile browsers
- Add to home screen capability
- Push notifications
- Works on 2G/3G networks

### Native Apps - Phase 3
**React Native (shared codebase):**
- iOS app (App Store)
- Android app (Play Store)
- Native biometric authentication
- Better performance
- Native payment integrations

---

## 🔐 SECURITY REQUIREMENTS

1. **Data Encryption:**
   - At-rest: PostgreSQL encryption
   - In-transit: SSL/TLS (HTTPS)
   - Password hashing: bcrypt

2. **Authentication:**
   - JWT tokens (short-lived)
   - Refresh tokens (HTTP-only cookies)
   - OTP for password reset
   - Multi-factor authentication (optional)

3. **Authorization:**
   - Row Level Security (database-level)
   - Role-based access control (RBAC)
   - API rate limiting

4. **Compliance:**
   - PCI DSS (via Stripe/Razorpay)
   - GDPR (data export/deletion)
   - Data backup (daily automated)
   - Audit logs for sensitive operations

---

## 📊 SUCCESS METRICS

### Technical KPIs
- Page load time: <2s (3G network)
- API response time: <300ms (p95)
- Uptime: 99.9%
- Mobile performance score: >90 (Lighthouse)
- Bundle size: <300KB (gzipped)

### Business KPIs
- 500+ gyms onboarded (Year 1)
- 50,000+ active members
- 4.5+ app store rating
- <2% monthly churn
- 70%+ payment calendar adoption

---

## 🛠️ DEVELOPMENT WORKFLOW

### Git Workflow
```
main (production)
  ↑
develop (staging)
  ↑
feature/payment-calendar
feature/multi-language
feature/class-booking
```

### Testing Strategy
- **Unit Tests:** Vitest (80%+ coverage)
- **Integration Tests:** Playwright
- **E2E Tests:** Cypress
- **Manual Testing:** Beta gyms

### Deployment
- **Staging:** Vercel (auto-deploy from develop)
- **Production:** Vercel (manual deploy from main)
- **Database:** Supabase (separate prod/staging)

---

## 📝 FINAL CHECKLIST FOR CLAUDE CODE

- [ ] Read complete PRD (`COMPLETE_PRD_FITFLOW.md`)
- [ ] Review technical design (`GYM_MANAGEMENT_TECHNICAL_DESIGN_DOCUMENT.md`)
- [ ] Setup project structure (Vite + React + TS)
- [ ] Configure Supabase connection
- [ ] Install shadcn/ui components
- [ ] Setup i18next with Telugu/Tamil/Hindi
- [ ] Create database schema with RLS
- [ ] Build authentication flow
- [ ] Implement member management
- [ ] Create payment calendar component
- [ ] Integrate Stripe & Razorpay
- [ ] Setup WhatsApp API
- [ ] Build class booking system
- [ ] Create member portal
- [ ] Deploy to Vercel
- [ ] Test with pilot gyms

---

## 📞 SUPPORT & RESOURCES

**Documentation:**
- Supabase Docs: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com
- React i18next: https://react.i18next.com

**APIs:**
- Stripe: https://stripe.com/docs
- Razorpay: https://razorpay.com/docs
- WhatsApp Business: https://developers.facebook.com/docs/whatsapp
- Twilio: https://www.twilio.com/docs

---

**Let's build the best gym management software in the world! 💪🚀**

