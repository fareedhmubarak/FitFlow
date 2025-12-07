# FitFlow - Gym Management App
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** November 26, 2025  
**Target:** Small to Medium Gyms in India  
**Problem:** Gym owners use paper/books to track member payments manually

---

## 1. PROBLEM STATEMENT

Gym owners currently:
- Track payments in notebooks
- Manually calculate due dates
- Miss payment collections
- Can't track overdue members easily
- No automated reminders

**Solution:** Simple, affordable gym management app that tracks members and payments automatically.

---

## 2. TARGET USERS

**Primary User:** Gym Owner
**Secondary User:** Gym Staff (optional)

**Gym Size:** 50-500 members  
**Location:** India (local gyms)  
**Tech Comfort:** Basic smartphone usage

---

## 3. CORE FEATURES

### 3.1 Dashboard (Landing Page)
**Purpose:** Quick overview of current month's payment status

**What Shows:**
- **Stats Cards:**
  - Due Today (count + amount)
  - Overdue This Month (count + amount)
  - Total Members (active/inactive)

- **Lists:**
  - Members due today (with Send Reminder button)
  - Overdue members (with Send Reminder button)

**Actions:**
- Click member → View details popup
- Send reminder (WhatsApp/SMS)
- Record payment
- Mark active/inactive
- Edit member details

**Default:** Shows current month  
**Navigation:** Month picker to view previous months

---

### 3.2 Member Management
**Purpose:** View and manage all gym members

**Member List Shows:**
- Photo
- Name
- Phone number
- Gender
- Height, Weight
- Joining date
- Membership plan
- Next due date

**Filters:**
- By name (search)
- By status (Active/Inactive)
- By overdue status
- By plan type (Monthly/Quarterly/6M/Annual)

**Add New Member Flow:**

**Step 1: Basic Info**
- Name (required)
- Phone (required)
- Gender
- Height
- Weight
- Photo (upload)

**Step 2: Membership**
- Joining date (required) - **CRITICAL: Determines due date forever**
- Select plan:
  - Monthly - ₹1,000
  - Quarterly - ₹2,500
  - 6 Months - ₹5,000
  - Annual - ₹7,500

**Step 3: First Payment (Mandatory)**
- Amount (auto-filled from plan)
- Payment method:
  - Cash
  - UPI
  - Card
  - Bank Transfer

**Result:** 
- Member created
- Next due date = Joining date + plan duration
- Example: Join Jan 15 → Monthly plan → Next due Feb 15

**Click Member Card:**
- Opens popup with:
  - All member details
  - Payment history
  - Next due date
- Actions available:
  - Send reminder
  - Record payment
  - Edit details
  - Mark active/inactive

---

### 3.3 Payment Calendar
**Purpose:** Visual calendar showing all members by their joining date

**Layout:**
- Monthly calendar view (like Outlook calendar)
- Month picker to navigate months

**Stats on Top:**
- Active members count
- Amount paid this month
- Pending members count
- Amount to collect

**Calendar Display:**
- Each date shows members who joined on that date
- Member photos/avatars stacked
- Count badge showing number of members

**Color Coding:**
- 🟢 **Green** = Paid this month
- 🟡 **Yellow** = Due date arrived, not paid yet
- 🔴 **Red** = Overdue 2+ months (last month + this month unpaid)
- ⚪ **Gray** = Due date hasn't arrived yet

**Click on Date:**
- Popup shows all members joined on that date
- Each member shows:
  - Name
  - Plan
  - Payment status
  - Actions (based on status)

**Payment Logic:**
- Payment button ONLY visible ON or AFTER due date
- Before due date: No payment option
- On/after due date: Show "Pay Now" button

**Example:**
```
Join: Jan 15, 2025 (Monthly plan)
Jan 1-14: Gray (due not arrived, no payment option)
Jan 15: Yellow (due today, payment option appears)
Jan 16+: Yellow/Red (overdue, payment option visible)
After payment: Green
```

---

### 3.4 Payments Page
**Purpose:** List of all payments for the month

**Stats Cards:**
- Paid members (count + total amount)
- Overdue members (count + total amount)
- Amount to collect
- Total members

**Two Lists:**

**1. Paid Members**
- Name
- Amount
- Date paid
- Payment method

**2. Overdue Members**
- Name
- Amount due
- Days overdue
- Actions: [Pay Now] [Send Reminder]

**Month Navigation:** Month picker to view previous months

---

### 3.5 Settings
**Purpose:** Configure app settings

**Settings Available:**
- Language selection:
  - English
  - Telugu (తెలుగు)
  - Tamil (தமிழ்)
  - Hindi (हिन्दी)
- Gym name
- WhatsApp/SMS configuration (optional)
- Logout

---

## 4. CRITICAL BUSINESS RULES

### 4.1 Due Date Logic
**Rule:** Due date is ALWAYS based on joining date and NEVER changes

**Examples:**

**Scenario 1: On-time payment**
- Join: Jan 15
- Plan: Monthly
- Due: Feb 15
- Pays: Feb 15 ✅
- Next due: Mar 15 ✅

**Scenario 2: Late payment**
- Join: Jan 15
- Plan: Monthly
- Due: Feb 15
- Pays: Feb 18 (3 days late) ✅
- Next due: Mar 15 (NOT Mar 18!) ✅

**Scenario 3: Skip month**
- Join: Jan 15
- Due: Feb 15 → Didn't pay ❌
- Due: Mar 15 → Paid ✅
- Next due: Apr 15 ✅
- Still owes: ₹1,000 for February (tracked as overdue)

---

### 4.2 Payment Tracking
- No late fees (just track overdue days)
- Payment history shows: Date, Amount, Method, Days late (if any)
- Overdue is informational only (for gym owner to follow up)

---

### 4.3 Membership Plans
**Fixed Plans:**
- Monthly: ₹1,000 (30 days)
- Quarterly: ₹2,500 (90 days)
- 6 Months: ₹5,000 (180 days)
- Annual: ₹7,500 (365 days)

**Plan Selection:** At time of joining only  
**Plan Changes:** Not supported in MVP (can be added later)

---

### 4.4 Multi-Language Support
- App UI changes based on selected language
- All text, buttons, labels in selected language
- Member data (names, etc.) stays as entered
- Supports: English, Telugu, Tamil, Hindi

---

## 5. MULTI-TENANT ARCHITECTURE

### 5.1 Data Isolation
**Requirement:** Multiple gyms use the same app

**Security:**
- Each gym's data is completely isolated
- Gym A cannot see Gym B's members
- Gym A cannot see Gym B's payments

**Implementation:** Row Level Security (RLS) in database
- Every table has `gym_id` column
- Database automatically filters data by logged-in gym
- No gym can access another gym's data

---

### 5.2 User Access
- Each gym has unique login
- One gym owner account per gym
- Optional: Staff accounts (future)
- No cross-gym access

---

## 6. NOTIFICATIONS

### 6.1 Payment Reminders
**Channels:** WhatsApp and/or SMS

**When to Send:**
- **Manual:** Gym owner clicks "Send Reminder" button
- **Automatic (Future):** 
  - Day of due date
  - 3 days after overdue
  - 7 days after overdue

**Message Content:**
- Member name
- Amount due
- Due date
- Gym name
- Multi-language support

---

## 7. WHAT'S NOT INCLUDED (Future/Optional)

❌ Class scheduling
❌ Attendance/Check-in tracking
❌ QR code check-in
❌ Biometric access
❌ Diet plans
❌ Workout plans
❌ Lead management (CRM)
❌ Point of Sale (POS)
❌ Inventory management
❌ Marketing automation
❌ Trainer management
❌ Multiple gym locations

**Reason:** Keep app simple and focused on core problem (payment tracking)

---

## 8. SUCCESS CRITERIA

### 8.1 For Gym Owners
- ✅ Know who owes money (instantly)
- ✅ Track payments without paper
- ✅ Send reminders easily
- ✅ Never miss a payment collection
- ✅ See monthly revenue at a glance

### 8.2 For Us (Business)
- ✅ Easy to sell (solves clear problem)
- ✅ Affordable to run (Supabase free tier)
- ✅ Simple to support (fewer features)
- ✅ Fast to build (8-10 weeks)

---

## 9. USER FLOWS

### 9.1 New Member Joins Gym
1. Gym owner opens app
2. Goes to Members page
3. Clicks [+ Add Member]
4. Fills: Name, Phone, Gender, Height, Weight, Photo
5. Selects: Joining date, Plan type
6. Records first payment (mandatory)
7. Member created ✅
8. Next due date auto-calculated

---

### 9.2 Checking Payments Due Today
1. Gym owner opens app (Dashboard)
2. Sees "Due Today" card with count
3. Clicks to expand list
4. Sees all members due today
5. Can send reminder or record payment

---

### 9.3 Recording a Payment
1. From Dashboard/Calendar/Payments page
2. Click on member
3. Click [Record Payment]
4. Enter: Amount, Payment method
5. Payment saved ✅
6. Member turns green on calendar
7. Next due date calculated

---

### 9.4 Visual Calendar Check
1. Go to Payment Calendar page
2. See current month calendar
3. Each date shows member photos
4. Colors indicate payment status
5. Click date to see details
6. Take action (remind/pay)

---

## 10. TECHNICAL CONSTRAINTS

### 10.1 Stack
- **Database:** Supabase (PostgreSQL)
- **Frontend:** React + Vite
- **Hosting:** Vercel
- **Auth:** Supabase Auth

### 10.2 Cost
- **Free tier:** Up to 50 gyms
- **Paid:** Only if we exceed limits

### 10.3 Performance
- Works on 3G/4G networks
- Mobile-first design
- Fast page loads (<2 seconds)

---

## 11. LAUNCH PLAN

### Phase 1: MVP (8-10 weeks)
- Dashboard
- Member Management
- Payment Calendar
- Payments Page
- Multi-language (English + Telugu only)
- Settings

### Phase 2: Enhancement (4 weeks)
- Add Tamil + Hindi
- Automated reminders
- Reports/Export
- Staff accounts

### Phase 3: Optional (Future)
- Class scheduling
- Attendance tracking
- Additional features based on feedback

---

**END OF REQUIREMENTS DOCUMENT**

**Status:** ✅ Ready for Development  
**Next Step:** Technical Design Document









