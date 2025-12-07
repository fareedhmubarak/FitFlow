# TECHNICAL DESIGN DOCUMENT (TDD)
## Multi-Tenant Gym Management SaaS Platform

**Project Name:** GymFlow Pro  
**Version:** 1.0  
**Date:** November 2024  
**Tech Stack:** React + TypeScript + Supabase + Stripe  
**Target:** Claude Code AI Development

---

## TABLE OF CONTENTS

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [API Design](#3-api-design)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Frontend Architecture](#5-frontend-architecture)
6. [State Management](#6-state-management)
7. [Real-time Features](#7-real-time-features)
8. [Payment Integration](#8-payment-integration)
9. [Biometric Integration](#9-biometric-integration)
10. [File Storage](#10-file-storage)
11. [Notification System](#11-notification-system)
12. [Security Implementation](#12-security-implementation)
13. [Performance Optimization](#13-performance-optimization)
14. [Deployment Strategy](#14-deployment-strategy)
15. [Testing Strategy](#15-testing-strategy)
16. [Development Workflow](#16-development-workflow)

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile PWA  │  Native App (Future)         │
│  Vite + TypeScript │  Service Worker │  React Native            │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ HTTPS / WebSocket
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                    Vercel Edge Network                           │
│                    (CDN + Serverless)                            │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌────────────┐  ┌─────────────────┐
│  Supabase  │  │  External APIs  │
│  Platform  │  │  - Stripe       │
│            │  │  - Twilio       │
│  ┌──────┐  │  │  - Resend       │
│  │ Auth │  │  └─────────────────┘
│  ├──────┤  │
│  │ REST │  │
│  │ API  │  │
│  ├──────┤  │
│  │ RT   │  │
│  │ WS   │  │
│  ├──────┤  │
│  │ Stor │  │
│  └──────┘  │
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│              PostgreSQL 15 (Supabase)                            │
│              - Primary Database                                  │
│              - Read Replicas (for analytics)                     │
│              - PgBouncer (connection pooling)                    │
│              - Row-Level Security (RLS)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Multi-Tenancy Architecture

**Approach:** Shared Database, Shared Schema  
**Isolation Method:** Row-Level Security (RLS)

**Why Shared Database?**
- ✅ Cost-effective scaling
- ✅ Easier maintenance
- ✅ Centralized backups
- ✅ Cross-tenant analytics possible
- ✅ Simpler deployment

**Data Isolation:**
- Every table has `gym_id` foreign key
- RLS policies filter data by authenticated user's gym
- No gym can access another gym's data
- Enforced at database level (not application)

**Scalability Strategy:**
- Phase 1 (0-1,000 gyms): Single database
- Phase 2 (1,000-10,000 gyms): Read replicas
- Phase 3 (10,000+ gyms): Sharding by region

---

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI Framework |
| | Vite | Build Tool |
| | Tailwind CSS | Styling |
| | shadcn/ui | Component Library |
| | Framer Motion | Animations |
| **State** | Zustand | Global State |
| | React Query | Server State |
| | React Hook Form | Form State |
| **Backend** | Supabase | BaaS Platform |
| | PostgreSQL 15 | Database |
| | PostgREST | Auto-generated API |
| | Deno | Edge Functions |
| **Auth** | Supabase Auth | Authentication |
| | JWT | Session Tokens |
| **Storage** | Supabase Storage | File Uploads |
| **Realtime** | Supabase Realtime | WebSocket |
| **Payments** | Stripe | Payment Processing |
| **Email** | Resend | Transactional Email |
| **SMS** | Twilio | SMS Notifications |
| **Hosting** | Vercel | Frontend Hosting |
| **CDN** | Cloudflare | Static Assets |
| **Monitoring** | Sentry | Error Tracking |
| | Vercel Analytics | Performance |
| | PostHog | Product Analytics |

---

## 2. DATABASE SCHEMA

### 2.1 Schema Overview

**Total Tables:** 15 core tables  
**Relationships:** Foreign keys with cascade deletes  
**Indexes:** Strategic indexes on FK columns and search fields  
**RLS:** Enabled on all tables  

---

### 2.2 Complete Database Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- 1. GYMS TABLE (Master Tenant Table)
-- ====================
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., 'fitzone-austin')
  
  -- Contact Info
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Branding
  logo_url TEXT, -- Stored in Supabase Storage
  brand_primary_color TEXT DEFAULT '#6366f1',
  brand_secondary_color TEXT DEFAULT '#8b5cf6',
  
  -- Settings
  timezone TEXT DEFAULT 'America/New_York',
  currency TEXT DEFAULT 'USD',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h', -- '12h' or '24h'
  
  -- Subscription
  subscription_plan TEXT DEFAULT 'trial', -- trial, starter, professional, enterprise
  subscription_status TEXT DEFAULT 'active', -- active, paused, cancelled, expired
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,
  
  -- Feature Toggles (JSONB for flexibility)
  features JSONB DEFAULT '{
    "biometric_access": false,
    "class_booking": true,
    "personal_training": true,
    "pos": false,
    "nutrition_tracking": false,
    "lead_management": true,
    "sms_notifications": false,
    "email_marketing": true,
    "member_app": true,
    "waitlist": true,
    "freeze_membership": true,
    "multi_location": false
  }'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gyms_slug ON gyms(slug);
CREATE INDEX idx_gyms_subscription_status ON gyms(subscription_status);

-- ====================
-- 2. GYM_USERS TABLE (Staff & Admins)
-- ====================
CREATE TABLE gym_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT, -- For trainers
  
  -- Role & Permissions
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'front_desk', 'trainer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Trainer-specific
  certifications TEXT[], -- Array of certification names
  specializations TEXT[], -- Array of specialties
  hourly_rate DECIMAL(10,2), -- For commission calculation
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, email),
  UNIQUE(gym_id, auth_user_id)
);

-- Indexes
CREATE INDEX idx_gym_users_gym_id ON gym_users(gym_id);
CREATE INDEX idx_gym_users_auth_user_id ON gym_users(auth_user_id);
CREATE INDEX idx_gym_users_role ON gym_users(gym_id, role);

-- ====================
-- 3. MEMBERS TABLE
-- ====================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Auto-generated member number (unique per gym)
  member_number TEXT, -- e.g., 'MEM-2024-001'
  
  -- Personal Info
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Media
  photo_url TEXT,
  
  -- QR Code for check-ins
  qr_code TEXT UNIQUE, -- Encrypted member ID
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'cancelled')),
  membership_start_date DATE,
  
  -- Medical & Notes
  medical_notes TEXT, -- Allergies, conditions, etc.
  staff_notes TEXT, -- Internal staff notes
  
  -- Tags (for segmentation)
  tags TEXT[], -- ['VIP', 'Student', 'Senior', 'Referral']
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gym_id, email)
);

-- Indexes
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(gym_id, status);
CREATE INDEX idx_members_email ON members(gym_id, email);
CREATE INDEX idx_members_qr_code ON members(qr_code);
CREATE INDEX idx_members_tags ON members USING GIN(tags);

-- Function to auto-generate member number
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.member_number := 'MEM-' || EXTRACT(YEAR FROM NOW()) || '-' || 
    LPAD((
      SELECT COUNT(*) + 1 
      FROM members 
      WHERE gym_id = NEW.gym_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    )::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_member_number
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION generate_member_number();

-- ====================
-- 4. MEMBERSHIP_PLANS TABLE
-- ====================
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Plan Details
  name TEXT NOT NULL,
  description TEXT, -- Markdown supported
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'one_time')),
  setup_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Duration (for limited-term plans)
  duration_days INTEGER, -- NULL = unlimited
  
  -- Access Limits
  max_classes_per_cycle INTEGER, -- NULL = unlimited
  max_freeze_days_per_year INTEGER DEFAULT 30,
  
  -- Features (displayed as bullet points)
  features JSONB DEFAULT '[]'::jsonb, -- ["Feature 1", "Feature 2"]
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE, -- Show on public pricing page
  
  -- Display
  display_order INTEGER DEFAULT 0,
  highlight BOOLEAN DEFAULT FALSE, -- "Most Popular" badge
  
  -- Stripe
  stripe_price_id TEXT, -- Stripe Price ID (auto-created)
  stripe_product_id TEXT, -- Stripe Product ID
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_membership_plans_gym_id ON membership_plans(gym_id);
CREATE INDEX idx_membership_plans_active ON membership_plans(gym_id, is_active);

-- ====================
-- 5. SUBSCRIPTIONS TABLE
-- ====================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_plan_id UUID REFERENCES membership_plans(id),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'paused', 'past_due', 'cancelled', 'expired')),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for ongoing subscriptions
  trial_end_date DATE,
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,
  
  -- Billing
  current_period_start DATE,
  current_period_end DATE,
  
  -- Settings
  auto_renew BOOLEAN DEFAULT TRUE,
  
  -- Freeze
  freeze_start_date DATE,
  freeze_end_date DATE,
  freeze_days_used INTEGER DEFAULT 0,
  
  -- Stripe
  stripe_subscription_id TEXT,
  
  -- Cancellation
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_gym_id ON subscriptions(gym_id);
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(gym_id, status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';

-- ====================
-- 6. PAYMENTS TABLE
-- ====================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'cancelled')),
  
  -- Payment Method
  payment_method TEXT CHECK (payment_method IN ('card', 'ach', 'cash', 'check', 'other')),
  last4 TEXT, -- Last 4 digits of card
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  
  -- Receipt
  receipt_url TEXT, -- Stripe receipt or generated PDF
  invoice_number TEXT, -- Auto-generated
  
  -- Description
  description TEXT,
  
  -- Dates
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(paid_at);

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || 
    LPAD((
      SELECT COUNT(*) + 1 
      FROM payments 
      WHERE gym_id = NEW.gym_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    )::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- ====================
-- 7. CLASSES TABLE (Templates)
-- ====================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Class Details
  name TEXT NOT NULL,
  description TEXT, -- Markdown
  category TEXT, -- 'yoga', 'crossfit', 'spinning', 'hiit'
  
  -- Visuals
  color TEXT DEFAULT '#6366f1', -- For calendar display
  icon_url TEXT,
  image_url TEXT,
  
  -- Settings
  duration_minutes INTEGER NOT NULL,
  default_capacity INTEGER NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  
  -- Requirements
  prerequisites TEXT,
  equipment_required TEXT[],
  
  -- Default Trainer
  default_trainer_id UUID REFERENCES gym_users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_classes_gym_id ON classes(gym_id);
CREATE INDEX idx_classes_category ON classes(gym_id, category);

-- ====================
-- 8. CLASS_SCHEDULES TABLE (Actual scheduled instances)
-- ====================
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  
  -- Assigned Trainer
  trainer_id UUID REFERENCES gym_users(id),
  
  -- Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Capacity
  capacity INTEGER NOT NULL,
  booked_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  
  -- Location
  room_location TEXT, -- e.g., "Studio A", "Main Floor"
  
  -- Notes
  notes TEXT, -- Member-facing notes
  staff_notes TEXT, -- Internal notes
  
  -- Booking Window
  booking_opens_at TIMESTAMPTZ, -- When booking becomes available
  booking_closes_at TIMESTAMPTZ, -- e.g., 30 min before class
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_class_schedules_gym_id ON class_schedules(gym_id);
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX idx_class_schedules_trainer_id ON class_schedules(trainer_id);
CREATE INDEX idx_class_schedules_time ON class_schedules(gym_id, start_time);
CREATE INDEX idx_class_schedules_status ON class_schedules(status) WHERE status != 'completed';

-- ====================
-- 9. BOOKINGS TABLE
-- ====================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'attended', 'no_show', 'late_cancel')),
  
  -- Waitlist
  waitlist_position INTEGER,
  promoted_from_waitlist_at TIMESTAMPTZ,
  
  -- Dates
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  
  -- Cancellation
  cancellation_reason TEXT,
  late_cancellation BOOLEAN DEFAULT FALSE, -- Cancelled within policy window
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_schedule_id, member_id)
);

-- Indexes
CREATE INDEX idx_bookings_gym_id ON bookings(gym_id);
CREATE INDEX idx_bookings_class_schedule ON bookings(class_schedule_id);
CREATE INDEX idx_bookings_member_id ON bookings(member_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ====================
-- 10. CHECK_INS TABLE (Attendance)
-- ====================
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Time
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  
  -- Method
  method TEXT CHECK (method IN ('qr_code', 'manual', 'app', 'biometric', 'kiosk')),
  
  -- Related Class (if attending a class)
  class_schedule_id UUID REFERENCES class_schedules(id),
  
  -- Staff (if manual check-in)
  created_by UUID REFERENCES gym_users(id),
  
  -- Location (if multi-location)
  location TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_check_ins_gym_id ON check_ins(gym_id);
CREATE INDEX idx_check_ins_member_id ON check_ins(member_id);
CREATE INDEX idx_check_ins_time ON check_ins(gym_id, check_in_time);
CREATE INDEX idx_check_ins_date ON check_ins((check_in_time::DATE)); -- For daily reports

-- ====================
-- 11. NOTIFICATIONS TABLE
-- ====================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Recipients
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('member', 'staff', 'all_members', 'filtered')),
  recipient_ids UUID[], -- Array of member or staff IDs
  recipient_filter JSONB, -- Filter criteria: {"status": "active", "tags": ["VIP"]}
  
  -- Channels
  channels TEXT[] NOT NULL, -- ['email', 'sms', 'push', 'in_app']
  
  -- Content
  template TEXT, -- Template name (e.g., 'payment_reminder')
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Email-specific
  html_content TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  
  -- Delivery Stats
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Errors
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_gym_id ON notifications(gym_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';

-- ====================
-- 12. LEADS TABLE (Sales Pipeline)
-- ====================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Lead Info
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Source
  source TEXT, -- 'website', 'walk_in', 'referral', 'social_media', 'event'
  source_details TEXT,
  
  -- Interest
  interest TEXT[], -- ['membership', 'personal_training', 'classes']
  
  -- Pipeline Stage
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'tour_scheduled', 'tour_completed', 'negotiating', 'converted', 'lost')),
  
  -- Assignment
  assigned_to UUID REFERENCES gym_users(id),
  
  -- Follow-up
  next_follow_up_date DATE,
  last_contacted_at TIMESTAMPTZ,
  
  -- Conversion
  converted_to_member_id UUID REFERENCES members(id),
  converted_at TIMESTAMPTZ,
  
  -- Lost Reason
  lost_reason TEXT,
  lost_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Tags
  tags TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_gym_id ON leads(gym_id);
CREATE INDEX idx_leads_stage ON leads(gym_id, stage);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up_date) WHERE stage NOT IN ('converted', 'lost');

-- ====================
-- 13. PRODUCTS TABLE (POS)
-- ====================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Product Info
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  
  -- Category
  category TEXT, -- 'apparel', 'supplements', 'equipment', 'services'
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- For profit calculation
  
  -- Inventory
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  track_inventory BOOLEAN DEFAULT TRUE,
  
  -- Media
  image_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_gym_id ON products(gym_id);
CREATE INDEX idx_products_category ON products(gym_id, category);
CREATE INDEX idx_products_sku ON products(gym_id, sku);

-- ====================
-- 14. SALES_TRANSACTIONS TABLE (POS)
-- ====================
CREATE TABLE sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_number TEXT, -- Auto-generated
  
  -- Customer
  member_id UUID REFERENCES members(id), -- NULL if non-member
  
  -- Items (stored as JSONB for flexibility)
  items JSONB NOT NULL, -- [{"product_id": "...", "name": "...", "quantity": 2, "price": 29.99}]
  
  -- Totals
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Payment
  payment_method TEXT,
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
  
  -- Staff
  sold_by UUID REFERENCES gym_users(id),
  
  -- Receipt
  receipt_url TEXT,
  
  -- Refund
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sales_transactions_gym_id ON sales_transactions(gym_id);
CREATE INDEX idx_sales_transactions_member_id ON sales_transactions(member_id);
CREATE INDEX idx_sales_transactions_date ON sales_transactions((created_at::DATE));

-- ====================
-- 15. ANALYTICS_EVENTS TABLE (Tracking)
-- ====================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL, -- 'member_joined', 'payment_received', 'class_booked', etc.
  
  -- Entity
  entity_type TEXT, -- 'member', 'payment', 'booking', 'class'
  entity_id UUID,
  
  -- User (who triggered it)
  user_type TEXT, -- 'member', 'staff', 'system'
  user_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_events_gym_id ON analytics_events(gym_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_date ON analytics_events((created_at::DATE));

-- Partitioning for scalability (monthly partitions)
-- ALTER TABLE analytics_events PARTITION BY RANGE (created_at);

-- ====================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================

-- Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's gym_id
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM gym_users WHERE auth_user_id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- Policy: Users can only access their own gym's data
-- Example for members table (repeat pattern for all tables)
CREATE POLICY "Users can view their gym's members"
  ON members FOR SELECT
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can insert members to their gym"
  ON members FOR INSERT
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "Users can update their gym's members"
  ON members FOR UPDATE
  USING (gym_id = get_user_gym_id());

CREATE POLICY "Users can delete their gym's members"
  ON members FOR DELETE
  USING (gym_id = get_user_gym_id());

-- Special policy for gyms table (users can view/update only their gym)
CREATE POLICY "Users can view their own gym"
  ON gyms FOR SELECT
  USING (id = get_user_gym_id());

CREATE POLICY "Owners can update their gym"
  ON gyms FOR UPDATE
  USING (
    id = get_user_gym_id() AND 
    EXISTS (
      SELECT 1 FROM gym_users 
      WHERE gym_id = gyms.id 
      AND auth_user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Note: Similar policies should be created for ALL tables
-- Pattern: gym_id = get_user_gym_id()

-- ====================
-- FUNCTIONS & TRIGGERS
-- ====================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gym_users_updated_at BEFORE UPDATE ON gym_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Repeat for other tables...)

-- Function: Update booked_count on class_schedules when booking created/deleted
CREATE OR REPLACE FUNCTION update_class_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'attended') THEN
    UPDATE class_schedules 
    SET booked_count = booked_count + 1 
    WHERE id = NEW.class_schedule_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('confirmed', 'attended') THEN
    UPDATE class_schedules 
    SET booked_count = booked_count - 1 
    WHERE id = OLD.class_schedule_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status IN ('confirmed', 'attended') AND NEW.status NOT IN ('confirmed', 'attended') THEN
      UPDATE class_schedules SET booked_count = booked_count - 1 WHERE id = NEW.class_schedule_id;
    ELSIF OLD.status NOT IN ('confirmed', 'attended') AND NEW.status IN ('confirmed', 'attended') THEN
      UPDATE class_schedules SET booked_count = booked_count + 1 WHERE id = NEW.class_schedule_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booked_count
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_booked_count();

-- Function: Generate QR code for member (encrypted member ID)
CREATE OR REPLACE FUNCTION generate_member_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple QR code: base64 encoded member ID (in production, use encryption)
  NEW.qr_code := encode(NEW.id::text::bytea, 'base64');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_member_qr_code
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION generate_member_qr_code();

-- ====================
-- VIEWS (For convenience)
-- ====================

-- View: Active members with current subscription
CREATE VIEW active_members_with_subscription AS
SELECT 
  m.id,
  m.gym_id,
  m.full_name,
  m.email,
  m.phone,
  m.member_number,
  m.status,
  m.created_at,
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.next_billing_date,
  mp.name AS plan_name,
  mp.price AS plan_price
FROM members m
LEFT JOIN subscriptions s ON s.member_id = m.id AND s.status = 'active'
LEFT JOIN membership_plans mp ON mp.id = s.membership_plan_id
WHERE m.status = 'active';

-- View: Monthly revenue
CREATE VIEW monthly_revenue AS
SELECT 
  gym_id,
  DATE_TRUNC('month', paid_at) AS month,
  SUM(amount) AS total_revenue,
  COUNT(*) AS payment_count
FROM payments
WHERE status = 'succeeded'
GROUP BY gym_id, DATE_TRUNC('month', paid_at);

-- View: Class utilization
CREATE VIEW class_utilization AS
SELECT 
  cs.gym_id,
  cs.id AS class_schedule_id,
  c.name AS class_name,
  cs.start_time,
  cs.capacity,
  cs.booked_count,
  ROUND((cs.booked_count::DECIMAL / cs.capacity) * 100, 2) AS utilization_percent
FROM class_schedules cs
JOIN classes c ON c.id = cs.class_id
WHERE cs.status != 'cancelled';

-- ====================
-- SAMPLE DATA (For development)
-- ====================

-- Insert sample gym (for testing)
-- INSERT INTO gyms (name, slug, email) VALUES 
--   ('FitZone Austin', 'fitzone-austin', 'hello@fitzone.com');

-- ... (More sample data can be added for development)
```

---

### 2.3 Database Relationships Diagram

```
gyms (1) ─────< gym_users (M)
  │
  ├─────< members (M)
  │        │
  │        ├─────< subscriptions (M)
  │        │        │
  │        │        └─────< payments (M)
  │        │
  │        ├─────< bookings (M)
  │        ├─────< check_ins (M)
  │        └─────< leads (M) [conversion]
  │
  ├─────< membership_plans (M)
  │        │
  │        └─────< subscriptions (M)
  │
  ├─────< classes (M)
  │        │
  │        └─────< class_schedules (M)
  │                 │
  │                 └─────< bookings (M)
  │
  ├─────< products (M)
  ├─────< sales_transactions (M)
  ├─────< notifications (M)
  └─────< analytics_events (M)
```

---

## 3. API DESIGN

### 3.1 API Architecture

**Type:** RESTful API (auto-generated by Supabase PostgREST)  
**Base URL:** `https://[project-ref].supabase.co/rest/v1/`  
**Authentication:** Bearer token (JWT)

**Supabase provides auto-generated REST API for all tables based on database schema.**

---

### 3.2 API Endpoints (Auto-generated)

**Format:** `GET /[table_name]?[filters]`

#### Example Endpoints:

```
# Members
GET    /members                    # List all members (filtered by RLS)
GET    /members?id=eq.{id}        # Get single member
POST   /members                    # Create member
PATCH  /members?id=eq.{id}        # Update member
DELETE /members?id=eq.{id}        # Delete member

# Advanced Queries (Supabase supports)
GET /members?status=eq.active&limit=20&offset=0&order=created_at.desc
GET /members?or=(status.eq.active,status.eq.frozen)
GET /members?full_name=ilike.*john*
GET /members?select=id,full_name,email,subscriptions(*)  # Join with subscriptions

# Class Schedules
GET /class_schedules?start_time=gte.2024-11-01&start_time=lt.2024-12-01
GET /class_schedules?select=*,classes(*),trainer:gym_users(full_name)

# Payments
GET /payments?status=eq.succeeded&paid_at=gte.2024-11-01
GET /payments?member_id=eq.{member_id}&order=paid_at.desc
```

---

### 3.3 Custom Edge Functions (Supabase Functions)

For complex business logic not suited for REST API:

#### **1. Process Recurring Billing (Cron Job)**
**File:** `supabase/functions/process-recurring-billing/index.ts`

```typescript
// Runs daily via cron
// 1. Find subscriptions due for billing today
// 2. Create Stripe payment intent
// 3. Record payment in database
// 4. Send receipt email
// 5. Update next_billing_date
```

#### **2. Send Class Reminders (Cron Job)**
**File:** `supabase/functions/send-class-reminders/index.ts`

```typescript
// Runs hourly
// 1. Find classes starting in 24h and 1h
// 2. Get booked members
// 3. Send email/SMS reminders
```

#### **3. Stripe Webhook Handler**
**File:** `supabase/functions/stripe-webhook/index.ts`

```typescript
// Handles Stripe events
// - payment_intent.succeeded
// - payment_intent.payment_failed
// - customer.subscription.updated
// - customer.subscription.deleted
```

#### **4. Generate Payment Calendar Data**
**File:** `supabase/functions/payment-calendar/index.ts`

```typescript
// Input: year, month
// Output: { date: "2024-11-15", members: [{...}, {...}] }
// Aggregates all members with payments due per day
```

#### **5. Export Data**
**File:** `supabase/functions/export-data/index.ts`

```typescript
// Generate CSV/Excel exports
// - Members
// - Payments
// - Attendance
// - Custom reports
```

---

### 3.4 API Authentication Flow

```typescript
// 1. Login (Supabase Auth)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Returns JWT token (stored in localStorage)
// Token contains: { sub: user_id, role: 'authenticated', ... }

// 2. API calls automatically include token (Supabase client handles this)
const { data: members } = await supabase
  .from('members')
  .select('*')
  .eq('status', 'active');

// 3. RLS policies filter data automatically based on user's gym_id
```

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Authentication Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │ 1. Email/Password or Magic Link
      ▼
┌─────────────────┐
│ Supabase Auth   │
│ (JWT Generator) │
└─────┬───────────┘
      │ 2. Returns JWT Token
      ▼
┌──────────────────┐
│  Client Storage  │
│  (localStorage)  │
└─────┬────────────┘
      │ 3. Include in all API requests (Header: Authorization: Bearer {token})
      ▼
┌─────────────────┐
│ Supabase API    │
│ (Validates JWT) │
└─────┬───────────┘
      │ 4. Decodes token, gets user_id
      ▼
┌─────────────────┐
│ RLS Policies    │
│ (Filters Data)  │
└─────┬───────────┘
      │ 5. Returns only authorized data
      ▼
┌──────────┐
│  Client  │
└──────────┘
```

### 4.2 Role-Based Access Control (RBAC)

**Implemented via RLS + Application Logic**

```typescript
// Get user role from gym_users table
const { data: user } = await supabase
  .from('gym_users')
  .select('role, permissions')
  .eq('auth_user_id', supabase.auth.user().id)
  .single();

// Check permissions in frontend
const canManageMembers = ['owner', 'admin', 'manager'].includes(user.role);
const canProcessPayments = ['owner', 'admin', 'manager'].includes(user.role);
const canManageStaff = ['owner', 'admin'].includes(user.role);

// Hide/show UI elements based on role
{canManageMembers && <Button>Add Member</Button>}
```

### 4.3 Multi-Tenant Isolation

**Enforced at Database Level (RLS)**

```sql
-- Every query automatically filtered by gym_id
-- User in Gym A cannot access Gym B's data

-- Policy ensures this
CREATE POLICY "Gym isolation"
  ON members FOR ALL
  USING (gym_id = get_user_gym_id());

-- Even if client sends malicious request, database blocks it
DELETE FROM members WHERE gym_id = 'other-gym-id';
-- ❌ Blocked by RLS (returns 0 rows affected)
```

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Project Structure

```
src/
├── app/                    # Main application
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── router.tsx         # React Router config
│
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   ├── layout/            # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   │
│   ├── members/           # Member-related components
│   │   ├── MemberList.tsx
│   │   ├── MemberCard.tsx
│   │   ├── MemberForm.tsx
│   │   └── MemberDetails.tsx
│   │
│   ├── classes/           # Class-related components
│   │   ├── ClassCalendar.tsx
│   │   ├── ClassCard.tsx
│   │   └── BookingModal.tsx
│   │
│   ├── payments/          # Payment components
│   │   ├── PaymentCalendar.tsx  # ⭐ Unique feature
│   │   ├── PaymentForm.tsx
│   │   └── InvoiceList.tsx
│   │
│   ├── dashboard/         # Dashboard widgets
│   │   ├── StatsCard.tsx
│   │   ├── RevenueChart.tsx
│   │   └── ActivityFeed.tsx
│   │
│   └── shared/            # Shared components
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts
│   ├── useMembers.ts
│   ├── useClasses.ts
│   ├── usePayments.ts
│   └── useRealtime.ts
│
├── lib/                   # Utilities & configs
│   ├── supabase.ts        # Supabase client
│   ├── stripe.ts          # Stripe helpers
│   ├── utils.ts           # Helper functions
│   └── constants.ts       # App constants
│
├── stores/                # Zustand stores
│   ├── authStore.ts
│   ├── gymStore.ts
│   └── uiStore.ts
│
├── types/                 # TypeScript types
│   ├── database.ts        # Supabase generated types
│   ├── models.ts          # Domain models
│   └── api.ts             # API types
│
├── pages/                 # Route pages
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── ForgotPassword.tsx
│   │
│   ├── onboarding/
│   │   ├── GymDetails.tsx
│   │   ├── Branding.tsx
│   │   ├── Features.tsx
│   │   └── Complete.tsx
│   │
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   │
│   ├── members/
│   │   ├── MembersList.tsx
│   │   └── MemberDetails.tsx
│   │
│   ├── classes/
│   │   ├── ClassesList.tsx
│   │   └── ClassSchedule.tsx
│   │
│   ├── payments/
│   │   ├── PaymentsList.tsx
│   │   └── PaymentCalendar.tsx  # ⭐
│   │
│   └── settings/
│       ├── GymSettings.tsx
│       ├── BillingSettings.tsx
│       └── FeatureToggles.tsx
│
└── styles/
    ├── globals.css        # Global styles
    └── tailwind.config.js # Tailwind config
```

---

### 5.2 Component Patterns

#### **1. Container/Presenter Pattern**

```typescript
// Container (logic)
function MembersListContainer() {
  const { data: members, isLoading } = useMembers();
  
  if (isLoading) return <LoadingSpinner />;
  
  return <MembersListPresenter members={members} />;
}

// Presenter (UI only)
function MembersListPresenter({ members }: { members: Member[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
```

#### **2. Custom Hooks Pattern**

```typescript
// useMembers.ts
export function useMembers(filters?: MemberFilters) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*, subscriptions(*), membership_plans(*)');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Usage in component
function MembersList() {
  const { data: members, isLoading, error } = useMembers({ status: 'active' });
  
  // ...
}
```

---

## 6. STATE MANAGEMENT

### 6.1 State Strategy

**Three-Layer State Management:**

1. **Server State** (React Query)
   - API data (members, classes, payments)
   - Caching, background refetching
   - Optimistic updates

2. **Global UI State** (Zustand)
   - Auth state (user, gym)
   - UI preferences (sidebar open, theme)
   - Feature toggles

3. **Local Component State** (useState)
   - Form inputs
   - Modal open/close
   - Temporary UI state

---

### 6.2 React Query Setup

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// app/App.tsx
import { QueryClientProvider } from '@tanstack/react-query';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* App */}
    </QueryClientProvider>
  );
}
```

---

### 6.3 Zustand Store Example

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  gym: Gym | null;
  role: Role | null;
  setUser: (user: User) => void;
  setGym: (gym: Gym) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      gym: null,
      role: null,
      
      setUser: (user) => set({ user }),
      setGym: (gym) => set({ gym }),
      
      logout: () => set({ user: null, gym: null, role: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Usage
function Header() {
  const { user, gym } = useAuthStore();
  
  return <div>{user?.full_name} - {gym?.name}</div>;
}
```

---

## 7. REAL-TIME FEATURES

### 7.1 Supabase Realtime Subscriptions

```typescript
// hooks/useRealtimeCheckIns.ts
export function useRealtimeCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel('check_ins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
        },
        (payload) => {
          setCheckIns(prev => [payload.new as CheckIn, ...prev]);
          
          // Show toast notification
          toast.success(`${payload.new.member_name} checked in!`);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return checkIns;
}

// Usage in component
function LiveCheckIns() {
  const checkIns = useRealtimeCheckIns();
  
  return (
    <div>
      <h2>Live Check-ins</h2>
      {checkIns.map(checkIn => (
        <div key={checkIn.id}>
          {checkIn.member_name} - {format(checkIn.check_in_time, 'HH:mm')}
        </div>
      ))}
    </div>
  );
}
```

---

### 7.2 Real-time Use Cases

1. **Live Check-ins** - See members checking in real-time
2. **Class Bookings** - Watch class capacity fill up live
3. **Payments** - Revenue dashboard updates as payments process
4. **Notifications** - In-app notifications appear instantly
5. **Collaborative Editing** - Multiple staff editing same member simultaneously

---

## 8. PAYMENT INTEGRATION

### 8.1 Stripe Integration Flow

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create Stripe Customer (when gym signs up)
export async function createStripeCustomer(gym: Gym) {
  const customer = await stripe.customers.create({
    email: gym.email,
    name: gym.name,
    metadata: { gym_id: gym.id },
  });
  
  // Update gym with stripe_customer_id
  await supabase
    .from('gyms')
    .update({ stripe_customer_id: customer.id })
    .eq('id', gym.id);
  
  return customer;
}

// Create Subscription for Member
export async function createMemberSubscription(params: {
  memberId: string;
  planId: string;
  paymentMethodId: string;
}) {
  // 1. Get member and plan
  const { data: member } = await supabase
    .from('members')
    .select('*, gym:gyms(stripe_customer_id)')
    .eq('id', params.memberId)
    .single();
  
  const { data: plan } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', params.planId)
    .single();
  
  // 2. Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: member.stripe_customer_id,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: 'default_incomplete',
    default_payment_method: params.paymentMethodId,
    metadata: {
      member_id: params.memberId,
      gym_id: member.gym_id,
    },
  });
  
  // 3. Create subscription record in database
  await supabase
    .from('subscriptions')
    .insert({
      member_id: params.memberId,
      gym_id: member.gym_id,
      membership_plan_id: params.planId,
      stripe_subscription_id: subscription.id,
      status: 'active',
      start_date: new Date(),
      next_billing_date: new Date(subscription.current_period_end * 1000),
    });
  
  return subscription;
}
```

---

### 8.2 Stripe Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
  }
  
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // 1. Find subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', paymentIntent.subscription)
    .single();
  
  // 2. Create payment record
  await supabase
    .from('payments')
    .insert({
      gym_id: subscription.gym_id,
      member_id: subscription.member_id,
      subscription_id: subscription.id,
      amount: paymentIntent.amount / 100, // Convert cents to dollars
      status: 'succeeded',
      payment_method: 'card',
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date(),
    });
  
  // 3. Send receipt email
  // ...
}
```

---

## 9. BIOMETRIC INTEGRATION

### 9.1 Biometric Device Integration Architecture

```
┌──────────────────┐
│ Biometric Device │ (e.g., ZKTeco, ESSL)
│ (IP: 192.168.1.10│
└────────┬─────────┘
         │
         │ TCP/IP or HTTP API
         ▼
┌─────────────────────┐
│ Supabase Edge Fn    │ (Middleware/Proxy)
│ /biometric-sync     │
└────────┬────────────┘
         │
         │ REST API
         ▼
┌─────────────────────┐
│ Supabase Database   │
│ - members table     │
│ - check_ins table   │
└─────────────────────┘
```

---

### 9.2 Device Integration Code

```typescript
// supabase/functions/biometric-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Supported device protocols
interface BiometricDevice {
  ip: string;
  port: number;
  model: 'zkteco' | 'essl' | 'hikvision';
  apiKey?: string;
}

serve(async (req) => {
  const { device, action, data } = await req.json();
  
  switch (action) {
    case 'sync_member':
      // Enroll member's fingerprint/face on device
      return await enrollMemberOnDevice(device, data.member_id);
    
    case 'sync_access_rules':
      // Update access permissions on device
      return await syncAccessRules(device);
    
    case 'fetch_logs':
      // Pull check-in logs from device
      return await fetchAndSyncLogs(device);
    
    case 'test_connection':
      // Test device connectivity
      return await testDeviceConnection(device);
  }
});

async function enrollMemberOnDevice(device: BiometricDevice, memberId: string) {
  // 1. Get member details from database
  const { data: member } = await supabase
    .from('members')
    .select('*, subscriptions(*)')
    .eq('id', memberId)
    .single();
  
  // 2. Send enrollment request to device based on protocol
  if (device.model === 'zkteco') {
    // ZKTeco SDK integration
    await zktecoEnroll(device, member);
  } else if (device.model === 'essl') {
    // ESSL SDK integration
    await esslEnroll(device, member);
  }
  
  // 3. Store device registration in member metadata
  await supabase
    .from('members')
    .update({
      metadata: {
        ...member.metadata,
        biometric_enrolled: true,
        device_id: device.ip,
      },
    })
    .eq('id', memberId);
}

async function fetchAndSyncLogs(device: BiometricDevice) {
  // 1. Connect to device and fetch recent logs
  const logs = await fetchLogsFromDevice(device);
  
  // 2. For each log, create check-in record
  for (const log of logs) {
    // Find member by device user ID
    const { data: member } = await supabase
      .from('members')
      .select('id, gym_id')
      .eq('metadata->>device_user_id', log.userId)
      .single();
    
    if (member) {
      // Create check-in
      await supabase
        .from('check_ins')
        .insert({
          gym_id: member.gym_id,
          member_id: member.id,
          check_in_time: new Date(log.timestamp),
          method: 'biometric',
        });
    }
  }
}

// Device-specific implementations
async function zktecoEnroll(device: BiometricDevice, member: Member) {
  // Use ZKTeco SDK (node-zk or similar library)
  // Example pseudo-code:
  // const zkDevice = new ZKDevice(device.ip, device.port);
  // await zkDevice.connect();
  // await zkDevice.enrollUser(member.id, member.full_name);
  // await zkDevice.disconnect();
}
```

---

### 9.3 Frontend Biometric Settings

```typescript
// components/settings/BiometricSettings.tsx
function BiometricSettings() {
  const { data: gym } = useGym();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  
  const isBiometricEnabled = gym?.features?.biometric_access;
  
  async function toggleBiometric(enabled: boolean) {
    await supabase
      .from('gyms')
      .update({
        features: {
          ...gym.features,
          biometric_access: enabled,
        },
      })
      .eq('id', gym.id);
  }
  
  async function addDevice(device: BiometricDevice) {
    // Test connection first
    const response = await fetch('/functions/v1/biometric-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'test_connection',
        device,
      }),
    });
    
    if (response.ok) {
      // Store device config in gym metadata
      // ...
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biometric Access Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p>Enable fingerprint/face recognition for member check-ins</p>
          </div>
          <Switch 
            checked={isBiometricEnabled} 
            onCheckedChange={toggleBiometric}
          />
        </div>
        
        {isBiometricEnabled && (
          <div className="mt-6">
            <h3>Connected Devices</h3>
            {devices.map(device => (
              <DeviceCard key={device.ip} device={device} />
            ))}
            <Button onClick={() => setShowAddDevice(true)}>
              Add Device
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 10. FILE STORAGE

### 10.1 Supabase Storage Buckets

```typescript
// Bucket structure
// - gym-logos (public)
// - member-photos (public)
// - receipts (private)
// - exports (private)
// - documents (private)

// Upload gym logo
async function uploadGymLogo(file: File, gymId: string) {
  const fileName = `${gymId}/logo.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('gym-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Replace existing
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('gym-logos')
    .getPublicUrl(fileName);
  
  // Update gym record
  await supabase
    .from('gyms')
    .update({ logo_url: publicUrl })
    .eq('id', gymId);
  
  return publicUrl;
}

// Upload member photo
async function uploadMemberPhoto(file: File, memberId: string, gymId: string) {
  const fileName = `${gymId}/${memberId}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('member-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('member-photos')
    .getPublicUrl(fileName);
  
  await supabase
    .from('members')
    .update({ photo_url: publicUrl })
    .eq('id', memberId);
  
  return publicUrl;
}
```

---

## 11. NOTIFICATION SYSTEM

### 11.1 Email Notifications (Resend)

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPaymentReminder(member: Member, payment: Payment) {
  await resend.emails.send({
    from: 'GymFlow <no-reply@gymflow.com>',
    to: member.email,
    subject: 'Payment Reminder',
    html: `
      <h1>Hi ${member.full_name},</h1>
      <p>Your payment of $${payment.amount} is due on ${payment.due_date}.</p>
      <a href="https://app.gymflow.com/payments/${payment.id}">Pay Now</a>
    `,
  });
}

export async function sendClassReminder(member: Member, classSchedule: ClassSchedule) {
  await resend.emails.send({
    from: 'GymFlow <no-reply@gymflow.com>',
    to: member.email,
    subject: `Class Reminder: ${classSchedule.class_name}`,
    html: `
      <h1>Hi ${member.full_name},</h1>
      <p>You have a class scheduled for ${format(classSchedule.start_time, 'PPpp')}</p>
      <p><strong>${classSchedule.class_name}</strong> with ${classSchedule.trainer_name}</p>
      <a href="https://app.gymflow.com/classes/${classSchedule.id}">View Details</a>
    `,
  });
}
```

---

### 11.2 SMS Notifications (Twilio)

```typescript
// lib/sms.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, message: string) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}

export async function sendPaymentReminderSMS(member: Member, amount: number) {
  await sendSMS(
    member.phone,
    `Hi ${member.full_name}, your payment of $${amount} is due soon. Pay now: https://app.gymflow.com/pay`
  );
}
```

---

## 12. SECURITY IMPLEMENTATION

### 12.1 Security Checklist

**Authentication:**
- ✅ Passwords hashed with bcrypt (handled by Supabase)
- ✅ JWT tokens (short expiry: 1 hour, refresh tokens: 7 days)
- ✅ Secure cookies (httpOnly, secure, sameSite)
- ✅ 2FA (optional, via Supabase Auth)

**Authorization:**
- ✅ Row-level security (RLS) on all tables
- ✅ Role-based permissions
- ✅ API rate limiting (100 req/min per user)

**Data Protection:**
- ✅ HTTPS only (TLS 1.3)
- ✅ Encrypted at rest (AES-256)
- ✅ No sensitive data in logs
- ✅ PCI compliance (via Stripe - no card data stored)

**Frontend Security:**
- ✅ Content Security Policy (CSP)
- ✅ XSS protection (React auto-escapes)
- ✅ CSRF tokens
- ✅ Input validation (Zod schemas)
- ✅ Dependency scanning (Dependabot)

---

### 12.2 Input Validation Example

```typescript
// lib/validation.ts
import { z } from 'zod';

export const memberSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  date_of_birth: z.date().max(new Date()),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address_line1: z.string().max(255).optional(),
  emergency_contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

// Usage in form
function MemberForm() {
  const form = useForm({
    resolver: zodResolver(memberSchema),
  });
  
  async function onSubmit(data: z.infer<typeof memberSchema>) {
    // Data is validated and type-safe
    await supabase.from('members').insert(data);
  }
}
```

---

## 13. PERFORMANCE OPTIMIZATION

### 13.1 Database Optimization

**Indexes:**
- ✅ Created on all foreign keys
- ✅ Created on frequently queried columns (status, date, etc.)
- ✅ Composite indexes for multi-column queries
- ✅ GIN indexes for JSONB and array columns

**Query Optimization:**
- Use `select` to limit columns returned
- Use `limit` and `offset` for pagination
- Use read replicas for analytics queries
- Cache frequent queries (Redis or React Query)

```typescript
// Bad: Select all columns
const { data } = await supabase.from('members').select('*');

// Good: Select only needed columns
const { data } = await supabase
  .from('members')
  .select('id, full_name, email, status')
  .limit(20);
```

---

### 13.2 Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/members" element={<Members />} />
  </Routes>
</Suspense>
```

**Image Optimization:**
```typescript
// Use next-gen formats (WebP)
<img 
  src={`${imageUrl}?w=400&h=300&format=webp`} 
  loading="lazy"
  alt="Member photo"
/>
```

**Bundle Size:**
- Tree shaking (Vite handles automatically)
- Code splitting (route-based)
- Dynamic imports for heavy libraries
- Analyze bundle: `vite build --analyze`

---

## 14. DEPLOYMENT STRATEGY

### 14.1 Deployment Architecture

```
┌─────────────────────────────────────┐
│        Vercel (Frontend)            │
│  - Auto deploy from Git             │
│  - Edge Functions                   │
│  - CDN (global)                     │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│      Supabase (Backend)             │
│  - Database (PostgreSQL)            │
│  - Auth                             │
│  - Storage                          │
│  - Realtime                         │
│  - Edge Functions                   │
└──────────────┬──────────────────────┘
               │
               │ External APIs
               ▼
    ┌──────────┴──────────┐
    │                     │
┌───▼──────┐      ┌──────▼─────┐
│  Stripe  │      │   Twilio   │
│  (Pay)   │      │   (SMS)    │
└──────────┘      └────────────┘
```

---

### 14.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

### 14.3 Environment Variables

```bash
# .env.example

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend (Email)
RESEND_API_KEY=re_xxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# App
VITE_APP_URL=https://app.gymflow.com
VITE_API_URL=https://api.gymflow.com

# Sentry (Error Tracking)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# PostHog (Analytics)
VITE_POSTHOG_KEY=phc_xxx
```

---

## 15. TESTING STRATEGY

### 15.1 Testing Pyramid

```
       ╱╲
      ╱  ╲
     ╱ E2E╲         (10% - Playwright)
    ╱──────╲
   ╱        ╲
  ╱ Integra-╲       (30% - Testing Library)
 ╱    tion   ╲
╱────────────╲
╱             ╲
╱     Unit     ╲    (60% - Vitest)
──────────────
```

---

### 15.2 Unit Tests (Vitest)

```typescript
// hooks/useMembers.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMembers } from './useMembers';

describe('useMembers', () => {
  it('fetches members successfully', async () => {
    const { result } = renderHook(() => useMembers());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[0]).toHaveProperty('full_name');
  });
  
  it('filters members by status', async () => {
    const { result } = renderHook(() => useMembers({ status: 'active' }));
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(result.current.data.every(m => m.status === 'active')).toBe(true);
  });
});
```

---

### 15.3 Integration Tests (React Testing Library)

```typescript
// components/MemberForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberForm } from './MemberForm';

describe('MemberForm', () => {
  it('creates a new member', async () => {
    const onSuccess = vi.fn();
    render(<MemberForm onSuccess={onSuccess} />);
    
    // Fill form
    await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe');
    await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
    await userEvent.type(screen.getByLabelText('Phone'), '+1234567890');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    
    // Verify
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'John Doe' })
      );
    });
  });
  
  it('shows validation errors', async () => {
    render(<MemberForm />);
    
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
  });
});
```

---

### 15.4 E2E Tests (Playwright)

```typescript
// e2e/member-management.spec.ts
import { test, expect } from '@playwright/test';

test('gym owner can create a member', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'owner@gymflow.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Navigate to members
  await page.click('text=Members');
  await page.click('text=Add Member');
  
  // Fill form
  await page.fill('[name="full_name"]', 'Jane Smith');
  await page.fill('[name="email"]', 'jane@example.com');
  await page.fill('[name="phone"]', '+1234567890');
  
  // Submit
  await page.click('button:has-text("Save")');
  
  // Verify success
  await expect(page.locator('text=Member created successfully')).toBeVisible();
  await expect(page.locator('text=Jane Smith')).toBeVisible();
});
```

---

## 16. DEVELOPMENT WORKFLOW

### 16.1 Development Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/gymflow-pro.git
cd gymflow-pro

# 2. Install dependencies
npm install

# 3. Setup Supabase locally (optional)
npx supabase init
npx supabase start

# 4. Copy environment variables
cp .env.example .env.local

# 5. Generate TypeScript types from Supabase
npm run generate-types

# 6. Start development server
npm run dev
```

---

### 16.2 Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/payment-calendar
# ... make changes
git add .
git commit -m "feat: add payment calendar view"
git push origin feature/payment-calendar
# Create PR on GitHub
```

**Commit Convention:** (Conventional Commits)
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

---

### 16.3 Code Quality Tools

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css}\"",
    "type-check": "tsc --noEmit",
    "generate-types": "supabase gen types typescript --project-id $PROJECT_REF > src/types/database.ts"
  }
}
```

**Pre-commit Hook (Husky):**
```bash
# .husky/pre-commit
npm run lint
npm run type-check
npm test
```

---

### 16.4 Claude Code Development Instructions

**For Claude Code AI:**

When developing this project, follow these priorities:

1. **Start with Database**
   - Run all SQL migrations in order
   - Verify RLS policies are working
   - Generate TypeScript types

2. **Build Authentication First**
   - Login/Signup flows
   - Onboarding wizard
   - Auth context/store

3. **Core Features in Order**
   - Member management (CRUD)
   - Dashboard (read-only views)
   - Payments (Stripe integration)
   - Classes & Booking
   - Settings & Feature Toggles

4. **Unique Features Last**
   - Payment Calendar (custom logic)
   - Biometric integration (hardware)

5. **Code Quality Standards**
   - TypeScript strict mode
   - Zod validation on all forms
   - React Query for all data fetching
   - Tailwind for all styling
   - shadcn/ui for all components
   - Framer Motion for animations

6. **Testing Requirements**
   - Write unit tests for utilities
   - Write integration tests for forms
   - Write E2E tests for critical flows

7. **Documentation**
   - Add JSDoc comments for complex functions
   - Document API endpoints
   - Document component props

---

**END OF TECHNICAL DESIGN DOCUMENT**

_This document is a comprehensive guide for Claude Code AI to build the entire GymFlow Pro platform. All specifications are implementation-ready._
