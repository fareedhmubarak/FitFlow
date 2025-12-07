# 🔄 Plan Change & Proration Specification
## FitFlow Gym Management System

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Purpose:** Complete specification for handling membership plan changes and payment calculations

---

## 📋 **Overview**

Members can change their subscription plan **at any time**. The system automatically:
1. Calculates unused value from current plan
2. Applies credit to new plan
3. Recalculates next payment date
4. Updates membership validity period
5. Generates new payment schedule

---

## 🎯 **Core Principles**

### **1. Pro-Rated Credits**
- Members never lose money when changing plans
- Unused days are calculated and credited

### **2. Immediate Effect**
- Plan changes take effect immediately (not at next billing cycle)
- New benefits/restrictions apply right away

### **3. Fair Calculation**
- Daily rate based on plan duration
- Precise to the day (not rounded to weeks/months)

### **4. Flexible Options**
- Member can choose when to apply change
- Can schedule for future date if preferred

---

## 💰 **Proration Calculation Formula**

### **Basic Formula:**
```
Unused Value = (Original Plan Cost) × (Remaining Days / Total Plan Days)

New Amount Due = (New Plan Cost) - (Unused Value)
```

### **Example Calculation:**

**Current Plan:** Monthly (₹1,500 for 30 days)
**Used:** 14 days
**Remaining:** 16 days

```
Daily Rate = ₹1,500 ÷ 30 = ₹50/day
Unused Value = ₹50 × 16 days = ₹800

New Plan: Annual (₹15,000)
Amount to Pay = ₹15,000 - ₹800 = ₹14,200
```

---

## 📊 **All Plan Change Scenarios**

### **Scenario 1: Monthly → Quarterly**

**Details:**
- Current: Monthly ₹1,500 (30 days)
- Paid on: Jan 1
- Change on: Jan 15 (15 days used)
- New: Quarterly ₹4,000 (90 days)

**Calculation:**
```
Remaining Days: 30 - 15 = 15 days
Unused Value: ₹1,500 × (15/30) = ₹750

New Plan Cost: ₹4,000
Amount Due: ₹4,000 - ₹750 = ₹3,250

New Validity: Jan 15 to Apr 15 (90 days)
Next Payment: Apr 15, 2025 (₹4,000)
```

---

### **Scenario 2: Monthly → Half-Yearly**

**Details:**
- Current: Monthly ₹1,500
- Paid on: Jan 1
- Change on: Jan 20 (20 days used)
- New: Half-Yearly ₹7,500 (180 days)

**Calculation:**
```
Remaining Days: 30 - 20 = 10 days
Unused Value: ₹1,500 × (10/30) = ₹500

New Plan Cost: ₹7,500
Amount Due: ₹7,500 - ₹500 = ₹7,000

New Validity: Jan 20 to Jul 19 (180 days)
Next Payment: Jul 20, 2025 (₹7,500)
```

---

### **Scenario 3: Monthly → Annual**

**Details:**
- Current: Monthly ₹1,500
- Paid on: Jan 1
- Change on: Jan 10 (10 days used)
- New: Annual ₹15,000 (365 days)

**Calculation:**
```
Remaining Days: 30 - 10 = 20 days
Unused Value: ₹1,500 × (20/30) = ₹1,000

New Plan Cost: ₹15,000
Amount Due: ₹15,000 - ₹1,000 = ₹14,000

New Validity: Jan 10 to Jan 9, 2026 (365 days)
Next Payment: Jan 10, 2026 (₹15,000)
```

---

### **Scenario 4: Quarterly → Monthly (Downgrade)**

**Details:**
- Current: Quarterly ₹4,000 (90 days)
- Paid on: Jan 1
- Change on: Feb 1 (31 days used)
- New: Monthly ₹1,500 (30 days)

**Calculation:**
```
Remaining Days: 90 - 31 = 59 days
Unused Value: ₹4,000 × (59/90) = ₹2,622

Option A - Credit Applied to Future Months:
- Credit: ₹2,622
- Monthly cost: ₹1,500
- First month (Feb): FREE (use ₹1,500 credit, ₹1,122 remaining)
- Second month (Mar): FREE (use remaining ₹1,122 credit)
- First Payment: Mar 1, 2025 (₹378 partial) or Apr 1 (₹1,500 full)

Option B - Refund:
- Refund ₹2,622 to member's account
- Start monthly billing: Feb 1
- Next Payment: Mar 1, 2025 (₹1,500)

Option C - Wait Till End:
- Continue quarterly till Apr 1
- Switch to monthly from Apr 1
- Next Payment: May 1, 2025 (₹1,500)
```

---

### **Scenario 5: Quarterly → Half-Yearly (Upgrade)**

**Details:**
- Current: Quarterly ₹4,000
- Paid on: Jan 1
- Change on: Feb 15 (45 days used)
- New: Half-Yearly ₹7,500

**Calculation:**
```
Remaining Days: 90 - 45 = 45 days
Unused Value: ₹4,000 × (45/90) = ₹2,000

New Plan Cost: ₹7,500
Amount Due: ₹7,500 - ₹2,000 = ₹5,500

New Validity: Feb 15 to Aug 14 (180 days)
Next Payment: Aug 15, 2025 (₹7,500)
```

---

### **Scenario 6: Quarterly → Annual (Upgrade)**

**Details:**
- Current: Quarterly ₹4,000
- Paid on: Jan 1
- Change on: Jan 20 (20 days used)
- New: Annual ₹15,000

**Calculation:**
```
Remaining Days: 90 - 20 = 70 days
Unused Value: ₹4,000 × (70/90) = ₹3,111

New Plan Cost: ₹15,000
Amount Due: ₹15,000 - ₹3,111 = ₹11,889

New Validity: Jan 20 to Jan 19, 2026 (365 days)
Next Payment: Jan 20, 2026 (₹15,000)
```

---

### **Scenario 7: Half-Yearly → Monthly (Downgrade)**

**Details:**
- Current: Half-Yearly ₹7,500 (180 days)
- Paid on: Jan 1
- Change on: Mar 1 (60 days used)
- New: Monthly ₹1,500

**Calculation:**
```
Remaining Days: 180 - 60 = 120 days
Unused Value: ₹7,500 × (120/180) = ₹5,000

Options:
- Credit covers: ₹5,000 ÷ ₹1,500 = 3.3 months FREE
- Next Payment: Jun 1, 2025 (after credit exhausted)

Or Refund Option:
- Refund: ₹5,000
- Next Payment: Apr 1, 2025 (₹1,500)
```

---

### **Scenario 8: Half-Yearly → Quarterly (Downgrade)**

**Details:**
- Current: Half-Yearly ₹7,500
- Paid on: Jan 1
- Change on: Feb 1 (31 days used)
- New: Quarterly ₹4,000

**Calculation:**
```
Remaining Days: 180 - 31 = 149 days
Unused Value: ₹7,500 × (149/180) = ₹6,208

New Plan Cost: ₹4,000
Excess Credit: ₹6,208 - ₹4,000 = ₹2,208

Options:
1. Apply ₹4,000 credit now (Feb 1 - May 1 covered)
2. Remaining ₹2,208 credit applied to next cycle
3. First Payment: May 1, 2025 (₹1,792) or Aug 1 (₹4,000 full)

Or:
1. Refund excess ₹2,208
2. Feb 1 - May 1 covered by ₹4,000 credit
3. Next Payment: May 1, 2025 (₹4,000)
```

---

### **Scenario 9: Half-Yearly → Annual (Upgrade)**

**Details:**
- Current: Half-Yearly ₹7,500
- Paid on: Jan 1
- Change on: Mar 1 (60 days used)
- New: Annual ₹15,000

**Calculation:**
```
Remaining Days: 180 - 60 = 120 days
Unused Value: ₹7,500 × (120/180) = ₹5,000

New Plan Cost: ₹15,000
Amount Due: ₹15,000 - ₹5,000 = ₹10,000

New Validity: Mar 1 to Feb 28, 2026 (365 days)
Next Payment: Mar 1, 2026 (₹15,000)
```

---

### **Scenario 10: Annual → Monthly (Downgrade)**

**Details:**
- Current: Annual ₹15,000 (365 days)
- Paid on: Jan 1
- Change on: Apr 1 (90 days used)
- New: Monthly ₹1,500

**Calculation:**
```
Remaining Days: 365 - 90 = 275 days
Unused Value: ₹15,000 × (275/365) = ₹11,301

Credit covers: ₹11,301 ÷ ₹1,500 = 7.5 months FREE
Next Payment: Nov 15, 2025 (after 7 months)

Or Refund:
- Refund ₹11,301
- Next Payment: May 1, 2025 (₹1,500)
```

---

### **Scenario 11: Annual → Quarterly (Downgrade)**

**Details:**
- Current: Annual ₹15,000
- Paid on: Jan 1
- Change on: Jul 1 (180 days used)
- New: Quarterly ₹4,000

**Calculation:**
```
Remaining Days: 365 - 180 = 185 days
Unused Value: ₹15,000 × (185/365) = ₹7,603

Credit covers: ₹7,603 ÷ ₹4,000 = 1.9 quarters
- First quarter (Jul-Sep): FREE
- Second quarter partial: ₹3,603 credit applied
- Next Payment: Oct 1, 2025 (₹397) or Jan 1, 2026 (₹4,000)
```

---

### **Scenario 12: Annual → Half-Yearly (Downgrade)**

**Details:**
- Current: Annual ₹15,000
- Paid on: Jan 1
- Change on: May 1 (120 days used)
- New: Half-Yearly ₹7,500

**Calculation:**
```
Remaining Days: 365 - 120 = 245 days
Unused Value: ₹15,000 × (245/365) = ₹10,068

Credit covers: ₹10,068 ÷ ₹7,500 = 1.34 half-years
- First 6 months (May-Oct): FREE
- Remaining credit: ₹2,568
- Next Payment: Nov 1, 2025 (₹4,932) or May 1, 2026 (₹7,500)
```

---

## 🔄 **Plan Change User Flow**

### **Step 1: Member Initiates Change**
```
Member Portal:
- Current Plan: Monthly (₹1,500)
- Paid on: Jan 1
- Valid till: Jan 31

[Change Plan] button clicked
```

### **Step 2: Select New Plan**
```
Available Plans:
⚪ Monthly - ₹1,500/month
⚪ Quarterly - ₹4,000 (Save 11%)
⚪ Half-Yearly - ₹7,500 (Save 17%)
⚪ Annual - ₹15,000 (Save 17%)

[Member selects Annual]
```

### **Step 3: Show Calculation**
```
┌─────────────────────────────────────┐
│ Plan Change Summary                 │
├─────────────────────────────────────┤
│ Current Plan: Monthly (₹1,500)     │
│ Days Used: 14 of 30                │
│ Unused Days: 16                    │
│ Credit Value: ₹800                 │
│                                     │
│ New Plan: Annual (₹15,000)         │
│ Less Credit: -₹800                 │
│ ─────────────────────────────────  │
│ Amount to Pay: ₹14,200             │
│                                     │
│ New Validity:                      │
│ From: Jan 15, 2025                 │
│ To: Jan 14, 2026 (365 days)        │
│                                     │
│ Next Payment:                      │
│ Date: Jan 15, 2026                 │
│ Amount: ₹15,000                    │
│                                     │
│ [Confirm Change] [Cancel]          │
└─────────────────────────────────────┘
```

### **Step 4: Payment**
```
Pay ₹14,200 via:
⚪ UPI (Google Pay, PhonePe, Paytm)
⚪ Credit/Debit Card
⚪ Net Banking
⚪ Pay at Gym

[Proceed to Payment]
```

### **Step 5: Confirmation**
```
✅ Plan Changed Successfully!

Your new Annual Membership is active.
Valid till: Jan 14, 2026

Receipt sent via:
📧 Email
💬 WhatsApp
📱 SMS

[View Receipt] [Done]
```

---

## 📅 **Impact on Payment Calendar**

### **Before Plan Change:**
```
Payment Calendar - January 2025
15: Priya - Monthly ₹1,500 🟡
```

### **After Plan Change (Jan 15):**
```
Payment Calendar - January 2026
15: Priya - Annual ₹15,000 🔵 (upcoming)
```

**Old monthly payments removed from calendar**
**New annual payment added on Jan 15, 2026**

---

## 🎛️ **Admin Controls**

### **Settings:**
```
Plan Change Settings:
✅ Allow members to change plans
✅ Immediate change (default)
⚪ Change only at billing cycle end
✅ Auto-calculate proration
✅ Allow downgrades
✅ Require admin approval for downgrades
⚪ Refund to bank (or credit only)
```

### **Approval Workflow (Optional):**
```
If downgrade requires approval:
1. Member requests change
2. Admin gets notification
3. Admin reviews:
   - Member history
   - Payment record
   - Reason for downgrade
4. Approve or Reject
5. If approved → automatic processing
```

---

## 💡 **Business Rules**

### **Rule 1: Minimum Plan Duration**
- Member must stay on plan for at least X days before changing
- **Default:** No minimum (can change anytime)
- **Optional:** 7/15/30 days minimum

### **Rule 2: Change Frequency**
- Maximum plan changes per month/year
- **Default:** Unlimited
- **Optional:** Max 1 change per month

### **Rule 3: Refund vs Credit**
- **Downgrades:** Credit balance OR refund
- **Gym decides:** Refund policy (instant, 7 days, no refund)
- **Default:** Credit applied to future payments

### **Rule 4: Payment Due Date**
- New payment due date = Change date + Plan duration
- **Example:** Change on Jan 15 to Annual → Next due Jan 15, 2026

### **Rule 5: Class Access**
- Upgrade: Immediate access to new tier benefits
- Downgrade: Immediate restriction to new tier limits

---

## 🔔 **Notifications**

### **When Plan Changed:**

**To Member (Multi-language):**
```
Telugu:
"హాయ్ ప్రియ! మీ ప్లాన్ Annual-కి మార్చబడింది.
కొత్త చెల్లింపు: ₹14,200
చెల్లుబాటు: Jan 14, 2026 వరకు
తదుపరి చెల్లింపు: Jan 15, 2026"

English:
"Hi Priya! Your plan changed to Annual.
New payment: ₹14,200
Valid till: Jan 14, 2026
Next payment: Jan 15, 2026"
```

**To Gym Owner:**
```
📊 Plan Change Alert
Member: Priya Sharma
Old: Monthly (₹1,500)
New: Annual (₹15,000)
Revenue impact: +₹13,500 upfront
MRR change: -₹1,500, +₹1,250 (annual normalized)
```

---

## 📊 **Database Updates**

### **What Gets Updated:**

**1. Subscription Record:**
- `membership_plan_id` → New plan ID
- `end_date` → Recalculated
- `next_billing_date` → New date
- `total_amount` → New plan cost
- `updated_at` → Current timestamp

**2. Payment Record:**
- Create new payment for adjustment amount
- Mark old recurring payments as cancelled
- Create new recurring payment schedule

**3. Analytics Events:**
- Log: "plan_changed"
- Track: upgrade vs downgrade
- Revenue impact calculation

---

## 📈 **Reporting**

### **Plan Change Report:**
```
Month: January 2025

Upgrades: 15
- Monthly → Quarterly: 5
- Monthly → Annual: 7
- Quarterly → Annual: 3
Revenue Gain: +₹1,25,000

Downgrades: 3
- Annual → Monthly: 2
- Quarterly → Monthly: 1
Revenue Loss: -₹15,000

Net Impact: +₹1,10,000
```

---

## ⚠️ **Edge Cases**

### **Case 1: Change on Last Day**
```
Current: Monthly ₹1,500
Paid: Jan 1
Change: Jan 31 (last day)
Remaining: 1 day
Credit: ₹50

Allowed? Yes
New plan starts: Jan 31
```

### **Case 2: Change on First Day**
```
Current: Monthly ₹1,500
Paid: Jan 1
Change: Jan 1 (same day)
Remaining: 30 days
Credit: ₹1,500 (full amount)

Allowed? Yes
Essentially a cancellation + new plan
```

### **Case 3: Multiple Changes in Short Period**
```
Jan 1: Monthly ₹1,500
Jan 5: Change to Quarterly ₹4,000
Jan 10: Change to Annual ₹15,000

System: Calculates from current active plan
Credit from Quarterly (5 days used)
Not from original Monthly
```

### **Case 4: Failed Payment**
```
Member tries to upgrade
Payment fails
- Plan NOT changed
- Old plan continues
- Retry payment or cancel upgrade
```

---

## ✅ **Implementation Checklist**

**Backend:**
- [ ] Proration calculation function
- [ ] Plan change API endpoint
- [ ] Credit balance tracking
- [ ] Payment schedule regeneration
- [ ] Notification triggers
- [ ] Analytics event logging

**Frontend:**
- [ ] Plan comparison UI
- [ ] Proration preview calculator
- [ ] Confirmation dialog
- [ ] Payment integration
- [ ] Success/error messaging

**Database:**
- [ ] Subscription history table
- [ ] Credit ledger table
- [ ] Plan change audit log

**Testing:**
- [ ] All 12 scenarios tested
- [ ] Edge cases covered
- [ ] Multi-currency support
- [ ] Multi-language notifications

---

## 🎯 **Success Metrics**

**Track:**
- % of members who change plans
- Upgrade vs downgrade ratio
- Revenue impact (net positive/negative)
- Time to complete plan change
- Failed plan change attempts

**Goals:**
- Upgrade rate > Downgrade rate (3:1 ratio)
- <5% failed plan changes
- 100% accurate proration calculations
- <30 seconds to complete change

---

**Document Status:** ✅ Complete  
**Ready for:** Implementation by Claude Code  
**Priority:** HIGH (Core feature for flexibility)

