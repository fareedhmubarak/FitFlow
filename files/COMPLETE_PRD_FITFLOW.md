# FitFlow - Product Requirements Document (PRD)
## Multi-Tenant Gym Management SaaS Platform

**Version:** 2.0  
**Last Updated:** November 17, 2025  
**Target Market:** Global (Primary: India - South Indian States)  
**Languages:** English, Telugu (తెలుగు), Tamil (தమிழ்), Hindi (हिन्दी)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
FitFlow is the world's first truly multi-lingual, mobile-first gym management SaaS platform designed specifically for the Indian and global markets. We combine the best features from industry leaders (Glofox, Mindbody, PushPress) with innovative capabilities like a **Payment Due Calendar View** and **modular feature enablement**, wrapped in an exceptionally sleek, modern UI.

### 1.2 Unique Selling Points (USPs)
1. **🌍 Multi-Language Native Support** - First gym software with Telugu & Tamil
2. **📅 Payment Due Calendar** - Visual calendar showing all member payments with color-coded status
3. **🧩 Modular Features** - Enable/disable features (biometric, diet tracking, etc.)
4. **💬 WhatsApp-First** - Native WhatsApp integration (critical for Indian market)
5. **📱 Offline-Capable** - Works on 2G networks (tier 2/3 cities)
6. **🎨 World-Class UI** - Glassmorphism design with smooth animations

### 1.3 Target Audience
**Primary Markets:**
- **South India:** Telangana, Andhra Pradesh, Tamil Nadu, Karnataka
- **Tier 1 Cities:** Hyderabad, Chennai, Bangalore, Mumbai, Delhi
- **Tier 2/3 Cities:** Vijayawada, Warangal, Coimbatore, Salem, Madurai

**Gym Types:**
- Small gyms (50-200 members)
- Boutique fitness studios
- CrossFit boxes
- Yoga/Pilates studios
- Martial arts schools
- Multi-location chains

---

## 2. INNOVATIVE FEATURES (First-to-Market)

### 2.1 Multi-Language Support (i18n)

**Supported Languages at Launch:**
```
🇬🇧 English (Global)
తె Telugu (Telangana, Andhra Pradesh - 80M+ speakers)
த Tamil (Tamil Nadu, Sri Lanka - 75M+ speakers)  
हि Hindi (Pan-India - 600M+ speakers)
```

**Future Expansion:**
```
ಕ Kannada (Karnataka)
മ Malayalam (Kerala)
ગ Gujarati (Gujarat)
ਪ Punjabi (Punjab)
ব Bengali (West Bengal, Bangladesh)
ଓ Odia (Odisha)
```

**Implementation Details:**
- **User-Level Preference:** Each user chooses their language
- **Persistent Across Sessions:** Language saved in profile
- **Real-Time Switching:** Change language without page reload
- **Comprehensive Coverage:**
  - All UI text
  - All buttons and labels
  - Form placeholders
  - Error messages
  - Success messages
  - Email templates
  - SMS templates
  - WhatsApp templates
  - Invoices/receipts
  - Reports
  - Member app
  - Staff app

**Regional Customization:**
- **Date Format:** DD/MM/YYYY (Indian standard)
- **Currency:** ₹ (INR) with proper formatting (₹1,00,000.00 - Lakh/Crore system)
- **Number System:** Indian numbering (1,00,000 vs 100,000)
- **Time Format:** 12-hour (preferred in India) with 24-hour option
- **Phone Numbers:** +91 country code default, 10-digit validation

**Technical Implementation:**
```javascript
// i18next configuration
languages: {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🏴' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🏴' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
}

// Example translation keys
{
  "dashboard.welcome": {
    "en": "Welcome back, {{name}}!",
    "te": "స్వాగతం, {{name}}!",
    "ta": "வ welcome்புற்றேன், {{name}}!",
    "hi": "स्वागत है, {{name}}!"
  },
  "payment.overdue": {
    "en": "Payment Overdue",
    "te": "చెల్లింపు మీరింది",
    "ta": "செலுத்துதல் பின்தங்கியது",
    "hi": "भुगतान बकाया"
  }
}
```

**Font Support:**
```css
/* Multi-script font stack */
body {
  font-family: 
    'Inter', /* Latin */
    'Noto Sans Telugu', /* Telugu */
    'Noto Sans Tamil', /* Tamil */
    'Noto Sans Devanagari', /* Hindi */
    system-ui, -apple-system, sans-serif;
}
```

**Business Impact:**
- 🎯 **Market Penetration:** First-mover advantage in regional markets
- 📈 **Adoption Rate:** 3-4x higher in non-English speaking regions
- 💰 **Revenue Potential:** 150M+ potential users in South India alone
- 🌟 **Brand Differentiation:** Only gym software with native Indian language support

---

### 2.2 Payment Due Calendar View (UNIQUE FEATURE)

**Problem Solved:**  
No existing gym software provides a visual calendar showing when each member's payment is due with their payment status.

**Visual Design:**
```
┌─────────────────────────────────────────────────────────┐
│  📅 Payment Calendar - November 2025    MRR: ₹4,50,000  │
│  ┌─────────┬──────────────────────────┐                 │
│  │ Filters │ ⬇️ Export  📧 Remind All  │                 │
│  └─────────┴──────────────────────────┘                 │
│                                                          │
│  SUN    MON    TUE    WED    THU    FRI    SAT         │
│  ────────────────────────────────────────────────       │
│        1       2       3       4       5       6        │
│                🟢×3    🟡×2    🟢×5    🟠×1    🟢×4       │
│                                                          │
│   7      8       9      10      11      12      13       │
│  🔴×2   🟢×6    🟡×4    🟢×8    🟠×2    🟢×7    ⚪×1       │
│                                                          │
│  14     15      16      17      18      19      20       │
│  🟢×9   🟡×5    🟢×6    🔴×3    🟢×4    🟡×6    🟢×5       │
│                                                          │
│  21     22      23      24      25      26      27       │
│  🟠×1   🟢×7    🟡×3    🟢×9    🟢×5    🟡×4    🟢×8       │
│                                                          │
│  28     29      30                                       │
│  🔴×2   🟢×6    🟡×7                                      │
│                                                          │
│  Legend:                                                 │
│  🟢 Paid (72%)  🟡 Due Today (15%)  🟠 Overdue 1-7 (8%) │
│  🔴 Overdue 8+ (3%)  🔵 Upcoming (2%)  ⚪ Frozen (0%)   │
└──────────────────────────────────────────────────────────┘
```

**Click on any date cell:**
```
┌─────────────────────────────────────────────┐
│  💳 Payments Due - November 15, 2025        │
├─────────────────────────────────────────────┤
│  🟢 Rajesh Kumar - ₹2,000                   │
│     Premium Membership | Paid on Nov 14     │
│     [📧 Receipt] [💬 WhatsApp]              │
│                                             │
│  🟡 Priya Sharma - ₹1,500                   │
│     Basic Membership | Due Today            │
│     [💰 Collect Payment] [📱 Remind]        │
│                                             │
│  🟠 Anil Reddy - ₹2,500                     │
│     Annual Plan | Overdue 3 days            │
│     [⚠️ Send Final Notice] [📞 Call]        │
│                                             │
│  🔴 Lakshmi Devi - ₹1,800                   │
│     Monthly Plan | Overdue 12 days          │
│     [🚫 Freeze Membership] [💬 WhatsApp]    │
│                                             │
│  [✅ Select All] [📧 Bulk Remind]           │
└─────────────────────────────────────────────┘
```

**Key Features:**
1. **Color-Coded Status:**
   - 🟢 **Green (Paid):** Payment successful
   - 🟡 **Yellow (Due Today):** Payment due today, not yet paid
   - 🟠 **Orange (Overdue 1-7 days):** Missed payment, gentle reminder zone
   - 🔴 **Red (Overdue 8+ days):** Critical, needs immediate action
   - 🔵 **Blue (Upcoming 3-7 days):** Advanced notification
   - ⚪ **Gray (Frozen/Cancelled):** Inactive memberships

2. **Smart Interactions:**
   - **Hover on cell:** Preview member count and total amount
   - **Click on cell:** Expand to see all members due that day
   - **Click on member:** Quick view with full payment history
   - **Bulk actions:** Select multiple members → Send reminders

3. **Filtering Options:**
   - Filter by payment status
   - Filter by membership type
   - Filter by trainer
   - Filter by payment method
   - Filter by amount range
   - Search by member name

4. **Automated Actions:**
   - **Day -3:** "Payment reminder - Due in 3 days" (WhatsApp/SMS)
   - **Day 0:** "Payment due today" (SMS)
   - **Day +1:** "Payment overdue - Please pay" (WhatsApp + Email)
   - **Day +3:** "Second reminder" (SMS + WhatsApp)
   - **Day +7:** "Final notice" (SMS + WhatsApp + Email)
   - **Day +14:** Auto-freeze membership + Manager notification

5. **Analytics Panel:**
   ```
   ┌──────────────────────────────────────────┐
   │  📊 Collection Analytics - November 2025 │
   ├──────────────────────────────────────────┤
   │  Expected MRR:     ₹5,00,000             │
   │  Collected:        ₹4,50,000 (90%)       │
   │  Pending:          ₹35,000 (7%)          │
   │  Overdue:          ₹15,000 (3%)          │
   │                                          │
   │  Collection Rate:  90% ⬆️ +2% vs Oct     │
   │  Avg Days to Pay:  2.3 days              │
   │  Failed Payments:  5 (1%)                │
   │                                          │
   │  🎯 Target: 95% collection rate          │
   └──────────────────────────────────────────┘
   ```

6. **Export & Reports:**
   - Export to Excel (member-wise payment schedule)
   - PDF report (monthly payment summary)
   - Send report to accountant/owner
   - Integration with Tally/QuickBooks

**Business Impact:**
- ⏱️ **Time Savings:** Reduce payment collection time by 60%
- 💰 **Revenue Improvement:** Increase on-time payment rate from 75% to 92%
- 📈 **Cash Flow Visibility:** Predict monthly revenue accurately
- 🎯 **Proactive Management:** Identify payment issues before they escalate
- 🏆 **Competitive Advantage:** First and only gym software with this feature

---

### 2.3 Modular Feature Enablement

**Problem Solved:**  
Not all gyms need biometric access, diet tracking, or advanced features. Current software forces gyms to pay for unused features.

**Module Library:**

**✅ Core Modules (Always Enabled - Free):**
```
✓ Member Management (CRUD)
✓ Membership Plans & Subscriptions
✓ Payment Processing (Stripe/Razorpay)
✓ Basic QR Code Check-in
✓ Class Scheduling (basic)
✓ Simple Dashboard
✓ Payment Calendar View
✓ SMS/Email Notifications (limited)
✓ Multi-language Support
```

**🔧 Optional Modules (Toggle On/Off):**

**Access & Security:**
- 🔐 **Biometric Access Control** (₹999/month)
  - Fingerprint scanner integration
  - Face recognition
  - RFID card/keyfob
  - 24/7 unmanned access
  
- 🚪 **Smart Door Integration** (₹499/month)
  - Mobile app door unlock
  - Time-based access rules
  - Visitor management

**Member Engagement:**
- 🍎 **Diet & Nutrition Tracking** (₹799/month)
  - Meal planning
  - Calorie tracking
  - Nutrition reports
  - Integration with dieticians
  
- 💪 **Workout Programming** (₹599/month)
  - Custom workout plans
  - Exercise library
  - Progress tracking
  - Video demonstrations
  
- 📸 **Body Measurement Tracking** (₹299/month)
  - Weight/BMI tracking
  - Body fat percentage
  - Progress photos
  - Measurement charts

**Business Operations:**
- 🛍️ **Retail POS** (₹499/month)
  - Sell merchandise
  - Inventory management
  - Product catalog
  - Sales reports
  
- 🎓 **Personal Training Management** (₹699/month)
  - PT session booking
  - Trainer scheduling
  - Commission tracking
  - Client progress notes
  
- 🥋 **Belt/Rank Progression** (₹399/month)
  - For martial arts gyms
  - Rank tracking
  - Promotion criteria
  - Certification printing

**Marketing & Growth:**
- 📊 **Advanced Analytics** (₹899/month)
  - Custom reports
  - Revenue forecasting
  - Churn prediction
  - Cohort analysis
  
- 📧 **Marketing Automation** (₹799/month)
  - Email campaigns
  - A/B testing
  - Automated drip campaigns
  - Referral program
  
- 🎯 **Lead Management CRM** (₹699/month)
  - Lead capture forms
  - Lead nurturing
  - Sales pipeline
  - Conversion tracking

**Communication:**
- 💬 **WhatsApp Business Integration** (Pay-per-use: ₹0.10/msg)
  - Automated messages
  - Two-way chat
  - WhatsApp bot
  - Payment links
  
- 📱 **SMS Notifications** (Pay-per-use: ₹0.20/msg)
  - Transactional SMS
  - Promotional SMS
  - Bulk SMS campaigns

**Advanced Features:**
- 🎥 **Online Class Streaming** (₹1,299/month)
  - Live streaming
  - On-demand videos
  - Virtual classes
  - Zoom/Meet integration
  
- 📱 **Branded Mobile Apps** (₹1,999/month)
  - Custom iOS app
  - Custom Android app
  - Your branding
  - App Store submission

**Admin Interface:**
```
┌───────────────────────────────────────────────┐
│  ⚙️ Feature Management                        │
├───────────────────────────────────────────────┤
│                                               │
│  Core Features (Always Active)                │
│  ✅ Member Management                         │
│  ✅ Payment Processing                        │
│  ✅ Check-in System                           │
│  ✅ Payment Calendar                          │
│                                               │
│  Optional Modules                             │
│  ┌─────────────────────────────────┐         │
│  │ 🔐 Biometric Access  [Toggle ON]│ ₹999/mo │
│  │    ℹ️ Fingerprint & Face Recognition      │
│  └─────────────────────────────────┘         │
│                                               │
│  ┌─────────────────────────────────┐         │
│  │ 🍎 Diet Tracking    [Toggle OFF]│ ₹799/mo │
│  │    ℹ️ Meal plans & nutrition tracking     │
│  └─────────────────────────────────┘         │
│                                               │
│  ┌─────────────────────────────────┐         │
│  │ 💬 WhatsApp         [Toggle ON] │ Pay/use │
│  │    ℹ️ ₹0.10 per message                   │
│  └─────────────────────────────────┘         │
│                                               │
│  Monthly Total: ₹1,998                        │
│  [💾 Save Changes]                            │
└───────────────────────────────────────────────┘
```

**Benefits:**
- 💰 **Cost Effective:** Pay only for what you use
- 🎯 **Customization:** Tailor software to gym type
- 📈 **Scalable:** Add features as gym grows
- 🚀 **Quick Start:** Start with basics, expand later
- 🔄 **Flexible:** Turn features on/off anytime

---

### 2.4 WhatsApp-First Architecture

**Why WhatsApp for India?**
- 487M+ WhatsApp users in India (vs 200M+ email users)
- 98% message open rate (vs 20% for email)
- Preferred communication channel
- Free to send for users

**Implementation:**
- **WhatsApp Business API Integration**
- **Meta (Facebook) verified business account**
- **Template-based messaging (approved by WhatsApp)**

**Use Cases:**

**1. Transactional Messages:**
```
✅ Payment Confirmation
"Hi Rajesh,
Your payment of ₹2,000 for Premium Membership has been received. Receipt: [link]
Thank you! 💪
- FitZone Gym"

✅ Class Booking
"తెలుగు: హాయ్ ప్రియ,
మీ Yoga Class బుకింగ్ Nov 18, 6 AM కోసం confirmed.
లొకేషన్: Studio A
ట్రైనర్: Lakshmi"

✅ Payment Reminder
"Hi Anil,
Your membership payment of ₹1,500 is due tomorrow (Nov 15).
Pay now: [link]
Questions? Reply to this message."
```

**2. Marketing Messages:**
```
🎉 Special Offer
"Diwali Special! 🪔
Get 20% OFF on Annual Membership
Valid till Nov 20
Book now: [link]"

🎂 Birthday Wishes
"Happy Birthday Lakshmi! 🎂🎉
Celebrate with a FREE personal training session.
Claim now: [link]"
```

**3. Two-Way Communication:**
- Members can reply to WhatsApp messages
- Automated responses for FAQs
- Human handover for complex queries
- Support ticket creation from WhatsApp

**4. WhatsApp Chatbot:**
```
Member: "My membership expires when?"
Bot: "Hi Rajesh! Your Premium Membership expires on Dec 31, 2025.
Would you like to:
1️⃣ Renew now (10% discount)
2️⃣ Talk to our team
3️⃣ View membership details"
```

**5. Payment via WhatsApp:**
```
"Hi, your payment of ₹2,000 is due.
Pay via:
💳 Credit/Debit Card: [link]
📱 UPI: [link]
🏦 Net Banking: [link]
💰 Pay at gym

Already paid? Reply with payment screenshot."
```

**Multi-Language Templates:**
```javascript
templates: {
  payment_reminder: {
    en: "Hi {{name}}, your payment of ₹{{amount}} is due on {{date}}. Pay now: {{link}}",
    te: "హాయ్ {{name}}, మీ చెల్లింపు ₹{{amount}} {{date}} వరకు చెల్లించాలి. ఇప్పుడు చెల్లించండి: {{link}}",
    ta: "வணக்கம் {{name}}, உங்கள் ₹{{amount}} கட்டணம் {{date}}-க்குள் செலுத்த வேண்டும். இப்போது செலுத்துங்கள்: {{link}}",
    hi: "नमस्ते {{name}}, आपका ₹{{amount}} का भुगतान {{date}} तक देय है। अब भुगतान करें: {{link}}"
  }
}
```

**Analytics:**
- Message delivery rate
- Read rate
- Click-through rate
- Response rate
- Conversion rate

---

### 2.5 Offline-First Mobile Architecture

**Problem:** Tier 2/3 cities have poor internet connectivity (2G/3G networks)

**Solution:** Progressive Web App + Service Workers

**Offline Capabilities:**

**✅ Works Offline:**
- View membership card (QR code)
- View class schedule (cached for 7 days)
- View payment history
- Check-in members (queued, syncs when online)
- View member profiles (recently accessed)
- View announcements

**🔄 Sync When Online:**
- Upload queued check-ins
- Download new messages
- Update class schedule
- Sync payment status
- Download reports

**Technical Implementation:**
```javascript
// Service Worker for offline caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// IndexedDB for local storage
const db = await openDB('fitflow-cache', 1, {
  upgrade(db) {
    db.createObjectStore('members');
    db.createObjectStore('classes');
    db.createObjectStore('checkins');
  }
});
```

**Network Optimization:**
- Compressed images (WebP, AVIF)
- Lazy loading
- Code splitting
- Minimal bundle size (<300KB)
- Prefetch critical resources
- Background sync for non-critical updates

**Bandwidth Indicators:**
```
┌─────────────────────────┐
│  📶 Network: 2G         │
│  ⚡ Offline Mode Active │
│  ✅ 12 actions queued   │
│  [Sync Now]            │
└─────────────────────────┘
```

---

## 3. CORE FEATURES (Best-in-Class)

### 3.1 Member Management

#### 3.1.1 Member Profiles
**Comprehensive Data Management:**

**Personal Information:**
- Full name (with prefix: Mr/Mrs/Ms/Dr)
- Email address (unique)
- Phone number (with +91 country code)
- Alternate phone number
- Date of birth (for age calculation & birthday wishes)
- Gender (Male/Female/Other/Prefer not to say)
- Profile photo upload
- Address (autocomplete with Google Maps API)

**Emergency Contact:**
- Contact name
- Relationship
- Phone number
- Email

**Medical Information:**
- Blood group
- Known medical conditions
- Allergies
- Current medications
- Doctor's clearance (upload certificate)
- Insurance details

**Membership Details:**
- Unique member ID (auto-generated: FM-0001)
- QR code (for quick check-in)
- Membership plan
- Join date
- Renewal date
- Status (Active/Inactive/Frozen/Cancelled)
- Payment status
- Assigned trainer
- Preferred language

**Activity Tracking:**
- Total check-ins
- Current streak (consecutive days)
- Longest streak
- Classes attended
- Favorite class type
- Peak visit time
- Last visit date
- Average visits per week

**Communication Preferences:**
- Email notifications (Yes/No)
- SMS notifications (Yes/No)
- WhatsApp notifications (Yes/No)
- Marketing consent (Yes/No)
- Preferred contact method

**Documents & Waivers:**
- Liability waiver (digital signature)
- Photo consent
- Medical certificate
- ID proof (Aadhaar/PAN/Driving License)
- Insurance documents

#### 3.1.2 Quick Add Member Flow
```
Step 1: Basic Info
┌────────────────────────────────┐
│ Full Name:     [____________] │
│ Phone:         +91[_________] │
│ Email:         [____________] │
│ Gender:        [⚪M ⚪F ⚪Other]│
│              [Next →]         │
└────────────────────────────────┘

Step 2: Membership
┌────────────────────────────────┐
│ Select Plan:                   │
│ ⚪ Monthly - ₹1,500            │
│ ⚪ Quarterly - ₹4,000          │
│ ⚪ Annual - ₹15,000 (Save 17%)│
│              [Next →]         │
└────────────────────────────────┘

Step 3: Payment
┌────────────────────────────────┐
│ Amount: ₹15,000                │
│ Method:                        │
│ ⚪ Online (Card/UPI)           │
│ ⚪ Cash                        │
│ ⚪ Bank Transfer               │
│              [Pay & Add →]    │
└────────────────────────────────┘

Step 4: Photo & QR
┌────────────────────────────────┐
│ [📸 Take Photo / Upload]      │
│                                │
│ ✅ Member Added Successfully!  │
│                                │
│ Member ID: FM-0234             │
│ QR Code: [QR CODE IMAGE]       │
│                                │
│ [📧 Email Welcome] [💬 WhatsApp]│
│ [🖨️ Print Card]   [✓ Done]    │
└────────────────────────────────┘
```

#### 3.1.3 Member Search & Filters

**Global Search Bar:**
```
┌─────────────────────────────────────────┐
│ 🔍 [Search members by name, phone...]  │
└─────────────────────────────────────────┘
```

**Advanced Filters:**
```
┌─────────────────────────────────────────┐
│ Filters ▼                               │
├─────────────────────────────────────────┤
│ Status:      [✓ Active] [ Inactive]    │
│              [ Frozen] [ Cancelled]     │
│                                         │
│ Plan:        [✓ All Plans ▼]           │
│                                         │
│ Joined:      [Last 30 days ▼]          │
│                                         │
│ Trainer:     [All Trainers ▼]          │
│                                         │
│ Payment:     [✓ All] [ Paid]           │
│              [ Pending] [ Overdue]      │
│                                         │
│ Language:    [All ▼]                    │
│                                         │
│ Tags:        [_________ + Add]         │
│                                         │
│ [Clear All]            [Apply Filters] │
└─────────────────────────────────────────┘
```

**Bulk Operations:**
```
┌─────────────────────────────────────────┐
│ ☑️ 25 members selected                  │
│ Actions:                                │
│ [📧 Send Email] [💬 WhatsApp]          │
│ [📱 Send SMS]   [🏷️ Add Tag]           │
│ [❄️ Freeze]     [📊 Export]            │
└─────────────────────────────────────────┘
```

---

### 3.2 Payment & Billing

#### 3.2.1 Payment Gateways

**International:**
- Stripe (Credit/Debit Cards, Apple Pay, Google Pay)
- PayPal

**India-Specific (Razorpay):**
- UPI (Google Pay, PhonePe, Paytm, BHIM)
- Net Banking (All major banks)
- Credit/Debit Cards (Visa, Mastercard, Rupay)
- Wallets (Paytm, PhonePe, Amazon Pay)
- EMI options (3/6/9/12 months)

**Offline:**
- Cash
- Cheque
- Bank transfer (with UTR number)

#### 3.2.2 Subscription Billing

**Automatic Recurring Payments:**
```
Member: Rajesh Kumar
Plan: Annual Membership
Amount: ₹15,000
Start: Jan 1, 2026
Renew: Jan 1, 2027

Saved Payment Method: Visa **** 1234

Auto-renewal: ✅ Enabled
Reminder: 7 days before (Dec 25, 2026)

Failed Payment Retry:
- 1st attempt: Jan 1 (primary day)
- 2nd attempt: Jan 3 (+2 days)
- 3rd attempt: Jan 6 (+5 days)
- Final: Jan 10 → Membership frozen
```

**Proration on Plan Change:**
```
Current Plan: Monthly (₹1,500)
Days Used: 15/30
Remaining Value: ₹750

New Plan: Quarterly (₹4,000)
Credit Applied: -₹750
Amount Due: ₹3,250

[Upgrade Now]
```

#### 3.2.3 Invoice Generation

**GST-Compliant Invoice (for India):**
```
┌────────────────────────────────────────┐
│ TAX INVOICE                            │
│                                        │
│ FITZONE GYM & FITNESS                  │
│ GSTIN: 36XXXXX1234X1ZX                │
│ Address: Banjara Hills, Hyderabad     │
│ Phone: +91 98765 43210                │
│                                        │
│ Invoice No: INV-2025-0234              │
│ Date: Nov 17, 2025                     │
│                                        │
│ Bill To:                               │
│ Rajesh Kumar                           │
│ Phone: +91 98765 11111                │
│ Member ID: FM-0234                     │
│                                        │
│ Description        Qty  Rate    Amount│
│ ─────────────────────────────────────│
│ Annual Membership   1   ₹15,000 ₹15,000│
│                                        │
│ Subtotal:                      ₹15,000│
│ CGST @ 9%:                      ₹1,350│
│ SGST @ 9%:                      ₹1,350│
│ ─────────────────────────────────────│
│ Total Amount:                  ₹17,700│
│                                        │
│ Payment Mode: Online (UPI)             │
│ Transaction ID: T2025110500234         │
│                                        │
│ [Download PDF] [Email] [WhatsApp]     │
└────────────────────────────────────────┘
```

**Multi-Language Invoices:**
- Header/footer in selected language
- Line items in selected language
- Legal text in local language
- Amounts always in ₹ (INR)

---

### 3.3 Class Scheduling & Booking

#### 3.3.1 Class Types
**Predefined Templates:**
- Yoga (Hatha, Vinyasa, Ashtanga, Power)
- Zumba
- CrossFit / Functional Training
- Spinning / Cycling
- Pilates
- HIIT (High-Intensity Interval Training)
- Strength Training
- Cardio
- Martial Arts (Karate, Taekwondo, MMA)
- Dance Fitness
- Aerobics
- Custom (create your own)

**Class Configuration:**
```
┌────────────────────────────────────────┐
│ Create New Class                       │
├────────────────────────────────────────┤
│ Class Name:    [Yoga - Beginners]     │
│ Category:      [Yoga ▼]               │
│ Description:   [________________]      │
│ Duration:      [60] minutes            │
│ Capacity:      [20] people             │
│ Trainer:       [Lakshmi Devi ▼]       │
│ Location:      [Studio A ▼]           │
│ Level:         [⚪ Beginner]           │
│                [⚪ Intermediate]        │
│                [⚪ Advanced]            │
│ Color:         [🎨 #10b981]           │
│ Image:         [📸 Upload]            │
│                                        │
│ [Save Class]                           │
└────────────────────────────────────────┘
```

#### 3.3.2 Weekly Schedule Builder
```
┌────────────────────────────────────────────────────────────┐
│ Weekly Class Schedule                    [+ Add Class]     │
├────────────────────────────────────────────────────────────┤
│ Time  Mon        Tue        Wed        Thu        Fri      │
│ ────────────────────────────────────────────────────────  │
│ 6 AM  Yoga       -          Yoga       -          Yoga     │
│       Studio A              Studio A              Studio A │
│       15/20                 18/20                 12/20    │
│                                                            │
│ 7 AM  CrossFit   Spinning   CrossFit   Spinning   CrossFit│
│       Gym Floor  Studio B   Gym Floor  Studio B   Floor   │
│       20/25      10/15      22/25      15/15      25/25   │
│                                                            │
│ 9 AM  Zumba      Pilates    Zumba      Pilates    Zumba   │
│       Studio A   Studio A   Studio A   Studio A   Studio A│
│       8/20       12/15      10/20      15/15      6/20    │
│                                                            │
│ 6 PM  HIIT       Yoga       HIIT       Yoga       HIIT    │
│       Gym Floor  Studio A   Gym Floor  Studio A   Floor   │
│       25/25      19/20      24/25      20/20      25/25   │
│                                                            │
│ 7 PM  Spinning   Dance      Spinning   Dance      Spinning│
│       Studio B   Studio A   Studio B   Studio A   Studio B│
│       12/15      14/20      15/15      18/20      10/15   │
└────────────────────────────────────────────────────────────┘
```

#### 3.3.3 Member Booking Interface

**Mobile App View:**
```
┌────────────────────────────────────────┐
│ 📅 Book a Class                        │
│                                        │
│ Tomorrow, Nov 18                       │
│                                        │
│ 🌅 Morning Classes                     │
│ ┌──────────────────────────────────┐ │
│ │ 6:00 AM - Yoga (Beginners)       │ │
│ │ 👤 Lakshmi | Studio A | 60 min   │ │
│ │ 18/20 spots   [Book Now →]       │ │
│ └──────────────────────────────────┘ │
│                                        │
│ ┌──────────────────────────────────┐ │
│ │ 7:00 AM - CrossFit                │ │
│ │ 👤 Raj | Gym Floor | 60 min       │ │
│ │ 25/25 FULL   [Join Waitlist]     │ │
│ └──────────────────────────────────┘ │
│                                        │
│ 🌆 Evening Classes                     │
│ ┌──────────────────────────────────┐ │
│ │ 6:00 PM - HIIT                    │ │
│ │ 👤 Anil | Gym Floor | 45 min      │ │
│ │ 20/25 spots   [Book Now →]        │ │
│ └──────────────────────────────────┘ │
│                                        │
│ [Filter by Type ▼] [My Bookings]     │
└────────────────────────────────────────┘
```

**Booking Confirmation:**
```
┌────────────────────────────────────────┐
│ ✅ Booking Confirmed!                  │
│                                        │
│ Yoga - Beginners                       │
│ Tomorrow, Nov 18 | 6:00 AM             │
│ Trainer: Lakshmi Devi                  │
│ Location: Studio A                     │
│                                        │
│ 📍 Get Directions                      │
│ 🔔 Reminder set for 5:30 AM            │
│                                        │
│ [Add to Calendar] [Share]              │
│ [Cancel Booking]                       │
└────────────────────────────────────────┘
```

---

### 3.4 Staff Management

#### 3.4.1 Roles & Permissions

**Owner:**
- Full system access
- Billing & subscription management
- Add/remove staff
- Financial reports
- Settings configuration

**Manager:**
- Member management
- Class scheduling
- Staff scheduling (except owner)
- Reports (except financial)
- Cannot access billing

**Trainer:**
- View assigned classes
- Mark attendance
- View member profiles (basic info only)
- Personal training session management
- Cannot access financial data

**Front Desk:**
- Member check-in
- Basic member registration
- View class schedule
- No financial access
- No staff management

**Custom Roles:**
```
┌────────────────────────────────────────┐
│ Create Custom Role                     │
├────────────────────────────────────────┤
│ Role Name: [Senior Trainer]           │
│                                        │
│ Permissions:                           │
│ ✅ View all members                    │
│ ✅ Add/edit members                    │
│ ✅ Schedule classes                    │
│ ✅ View attendance reports             │
│ ✅ Manage PT sessions                  │
│ ❌ Access financial data               │
│ ❌ Manage staff                        │
│ ❌ Change settings                     │
│                                        │
│ [Save Role]                            │
└────────────────────────────────────────┘
```

---

### 3.5 Reports & Analytics

#### 3.5.1 Dashboard (Home Screen)

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard - FitZone Gym              👤 Admin | తెలుగు   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Today's Overview                                         │
│ ┌──────────┬──────────┬──────────┬──────────┐            │
│ │ Check-ins│ Revenue  │ Bookings │ New      │            │
│ │    142   │ ₹18,500  │    86    │ Members  │            │
│ │   +12%   │   +8%    │   +5%    │    3     │            │
│ └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│ 💰 Revenue Trends (Last 30 Days)                           │
│ ┌─────────────────────────────────────────────┐          │
│ │     [Line Chart: Daily Revenue]             │          │
│ │     MRR: ₹4,50,000 | ARR: ₹54,00,000       │          │
│ └─────────────────────────────────────────────┘          │
│                                                             │
│ 👥 Member Stats                                            │
│ ┌───────────┬───────────┬───────────┐                    │
│ │ Active    │ Expiring  │ Overdue   │                    │
│ │   425     │    32     │    18     │                    │
│ │  +15      │   -5      │   +3      │                    │
│ └───────────┴───────────┴───────────┘                    │
│                                                             │
│ 📅 Today's Classes                                         │
│ ┌─────────────────────────────────────────────┐          │
│ │ 6:00 AM  Yoga         18/20  [View]         │          │
│ │ 7:00 AM  CrossFit     25/25  [Full]         │          │
│ │ 6:00 PM  HIIT         20/25  [View]         │          │
│ └─────────────────────────────────────────────┘          │
│                                                             │
│ ⚠️ Pending Actions                                         │
│ • 5 payments overdue (total: ₹12,500)                     │
│ • 3 new member inquiries                                   │
│ • 2 equipment maintenance reminders                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Technology Stack

**Frontend:**
```
Framework: React 18+ with TypeScript
Build Tool: Vite
State Management: 
  - Zustand (global state)
  - React Query (server state)
Router: React Router v6
UI Components: shadcn/ui + Radix UI
Styling: Tailwind CSS 3.4+
Animations: Framer Motion
Forms: React Hook Form + Zod validation
Charts: Recharts
Icons: Lucide React
i18n: react-i18next
```

**Backend:**
```
BaaS: Supabase
  - PostgreSQL 15 (database)
  - PostgREST (auto API)
  - GoTrue (authentication)
  - Realtime (WebSocket subscriptions)
  - Storage (file uploads)
  - Edge Functions (serverless)
```

**Payment Processing:**
```
International: Stripe
India: Razorpay
```

**Communication:**
```
SMS: Twilio
Email: Resend / SendGrid
WhatsApp: WhatsApp Business API (Meta)
Push: Firebase Cloud Messaging
```

**Hosting & Infrastructure:**
```
Frontend: Vercel
Backend: Supabase Cloud
CDN: Cloudflare
Monitoring: Sentry
Analytics: Plausible / PostHog
```

### 4.2 Database Schema (Supabase PostgreSQL)

**See separate Technical Design Document for complete schema**

Key tables:
- `gyms` - Tenant/gym information
- `gym_users` - Staff/admin users
- `members` - Gym members
- `membership_plans` - Subscription plans
- `subscriptions` - Active memberships
- `payments` - Payment transactions
- `classes` - Class definitions
- `class_schedules` - Scheduled sessions
- `bookings` - Member class bookings
- `check_ins` - Attendance logs
- `notifications` - Communication logs
- `analytics_events` - Tracking events

### 4.3 Multi-Tenancy Implementation

**Row Level Security (RLS) Policies:**
```sql
-- Example: Members table RLS
CREATE POLICY "gym_isolation" ON members
  FOR ALL USING (
    gym_id IN (
      SELECT gym_id FROM gym_users 
      WHERE auth_user_id = auth.uid()
    )
  );
```

**Benefits:**
- Database-level data isolation
- No application-level filtering needed
- Prevents data leaks
- Automatic in all queries
- PostgreSQL performance optimized

---

## 5. DEPLOYMENT & LAUNCH PLAN

### 5.1 Development Phases

**Phase 1: MVP (Weeks 1-8)**
✅ Multi-tenant setup
✅ Authentication (email/password + OTP)
✅ Member CRUD
✅ Membership plans
✅ Payment processing (Stripe + Razorpay)
✅ Basic check-in (QR code)
✅ Simple dashboard
✅ Multi-language (EN, TE, TA, HI)

**Phase 2: Core Features (Weeks 9-14)**
✅ Payment Due Calendar
✅ Class scheduling
✅ Online booking
✅ Staff management
✅ Automated notifications (SMS/WhatsApp/Email)
✅ Member portal
✅ Basic reports

**Phase 3: Advanced (Weeks 15-20)**
✅ Module enablement system
✅ Advanced analytics
✅ Marketing automation
✅ Mobile apps (PWA first, then native)
✅ Biometric access (optional module)
✅ API for integrations

### 5.2 Testing Strategy

**Automated Testing:**
- Unit tests (Vitest) - 80%+ coverage
- Integration tests (Playwright)
- E2E tests (Cypress)
- Load testing (k6)
- Security scanning (Snyk)

**Manual Testing:**
- User acceptance testing (UAT)
- Multi-language testing
- Payment gateway testing (sandbox)
- Mobile device testing (20+ devices)
- Accessibility testing (screen readers)

**Beta Program:**
- 10-20 pilot gyms
- Free subscription for 6 months
- Weekly feedback sessions
- Bug bounty program

### 5.3 Go-to-Market Strategy

**Target Markets (Priority Order):**
1. Hyderabad, Telangana (Telugu speakers)
2. Chennai, Tamil Nadu (Tamil speakers)
3. Bangalore, Karnataka (multi-lingual)
4. Tier 2 cities (Vijayawada, Coimbatore, Madurai)

**Marketing Channels:**
- Google Ads (gym management software + Telugu/Tamil keywords)
- Facebook/Instagram Ads (gym owner targeting)
- Gym industry associations
- Gym equipment vendors (partnerships)
- Fitness influencers
- LinkedIn (gym owner groups)
- Direct sales (field team)

**Pricing for India:**
- Free trial: 30 days (full features)
- Starter: ₹2,999/month
- Pro: ₹5,999/month
- Enterprise: ₹14,999/month

**Early Adopter Discounts:**
- First 100 gyms: 50% OFF for 6 months
- Annual payment: 20% discount
- Referral bonus: 1 month free

---

## 6. SUCCESS CRITERIA

### 6.1 Product KPIs

**User Adoption:**
- ✅ 500+ gyms in first year
- ✅ 50,000+ active members using the system
- ✅ 70%+ feature adoption rate (payment calendar)
- ✅ 80%+ mobile app usage

**Performance:**
- ✅ 99.9% uptime
- ✅ <2s page load time
- ✅ <300ms API response time
- ✅ Zero data breaches

**User Satisfaction:**
- ✅ 4.5+ app store rating
- ✅ Net Promoter Score (NPS) > 50
- ✅ <2% monthly churn rate
- ✅ 90%+ customer retention (annual)

### 6.2 Business KPIs

**Revenue:**
- ✅ ₹50 Lakhs MRR by Month 12
- ✅ ₹6 Crore ARR by Year 1
- ✅ 30% month-over-month growth (first 6 months)

**Growth:**
- ✅ 100 gyms by Month 3
- ✅ 300 gyms by Month 6
- ✅ 500 gyms by Month 12

**Unit Economics:**
- ✅ CAC < ₹10,000
- ✅ LTV > ₹1,00,000
- ✅ LTV:CAC ratio > 10:1
- ✅ Gross margin > 80%

---

## 7. APPENDIX

### 7.1 Competitor Comparison

| Feature | FitFlow | Glofox | Mindbody | PushPress |
|---------|---------|--------|----------|-----------|
| Multi-language (Telugu/Tamil) | ✅ | ❌ | ❌ | ❌ |
| Payment Calendar View | ✅ | ❌ | ❌ | ❌ |
| Modular Features | ✅ | ❌ | ❌ | ❌ |
| WhatsApp Integration | ✅ | ❌ | ❌ | ❌ |
| Offline Mobile App | ✅ | Limited | Limited | ❌ |
| India Payment Gateways | ✅ | Partial | Partial | ❌ |
| Pricing (Monthly) | ₹2,999 | $110 | $169 | $159 |

### 7.2 Glossary

**MRR:** Monthly Recurring Revenue
**ARR:** Annual Recurring Revenue  
**CAC:** Customer Acquisition Cost
**LTV:** Lifetime Value
**RLS:** Row Level Security (Supabase)
**PWA:** Progressive Web App
**i18n:** Internationalization
**GST:** Goods and Services Tax (India)
**UPI:** Unified Payments Interface (India)

---

**END OF DOCUMENT**

**Next Steps:**
1. Review & approve PRD
2. Create detailed Technical Design Document
3. Create UI/UX mockups in Figma
4. Setup development environment
5. Begin Phase 1 development with Claude Code

---

**Document Owner:** Product Team  
**For Questions:** Contact development@fitflow.app  
**Last Updated:** November 17, 2025

