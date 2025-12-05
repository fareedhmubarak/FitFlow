# 🧪 FitFlow Test Cases (Simple Steps)

## 🔐 Login Details
- **URL:** https://fitflow-app.vercel.app (or your deployed URL)
- **Password for all:** `Demo@123`

---

## 📱 MODULE 1: LOGIN

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Login | 1. Open app → 2. Enter email: `nasar@fitflow.demo` → 3. Enter password: `Demo@123` → 4. Tap "Login" | ✅ Goes to Dashboard |
| 2 | Wrong Password | 1. Enter email → 2. Enter wrong password → 3. Tap "Login" | ❌ Shows error message |
| 3 | Logout | 1. Tap profile icon (top right) → 2. Tap "Logout" | ✅ Goes to Login page |

---

## 📊 MODULE 2: DASHBOARD

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | View Dashboard | 1. Login → 2. See Dashboard | ✅ Shows stats cards (Active, Paid, Due Today, etc.) |
| 2 | Check Stats | 1. Look at stats cards | ✅ Numbers should match member count |
| 3 | Tap Overdue Card | 1. Tap red "Overdue" card | ✅ Shows overdue members list |

---

## 👥 MODULE 3: MEMBERS

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | View Members | 1. Tap "Members" in bottom menu | ✅ Shows all members list |
| 2 | Search Member | 1. Tap search box → 2. Type member name | ✅ Filters members by name |
| 3 | Add Member | 1. Tap "+" button → 2. Fill: Name, Phone, Plan → 3. Tap "Save" | ✅ Member added, shows success message |
| 4 | View Member | 1. Tap on any member card | ✅ Opens member details popup |
| 5 | Edit Member | 1. Tap member → 2. Tap "Edit" → 3. Change any field → 4. Tap "Save" | ✅ Member updated |
| 6 | Filter by Plan | 1. Tap "Filter" → 2. Select "Monthly" → 3. Tap "Apply" | ✅ Shows only monthly members |
| 7 | Make Inactive | 1. Tap member → 2. Tap "Make Inactive" | ✅ Member status changes to inactive |

---

## 💰 MODULE 4: PAYMENTS

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | View Payments | 1. Tap "Payments" in bottom menu | ✅ Shows payment records |
| 2 | Record Payment | 1. Go to Members → 2. Tap member → 3. Tap "Record Payment" → 4. Enter amount → 5. Tap "Save" | ✅ Payment recorded, due date updated |
| 3 | Delete Payment | 1. Go to Payments → 2. Find payment → 3. Tap trash icon → 4. Confirm | ✅ Payment deleted |
| 4 | Export Payments | 1. Go to Payments → 2. Tap "Export" | ✅ Downloads CSV file |

---

## 📅 MODULE 5: CALENDAR

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | View Calendar | 1. Tap "Calendar" in bottom menu | ✅ Shows calendar with colored dates |
| 2 | Check Stats | 1. Look at top stats: Active, 3/6/12M, Unpaid, Paid, Joined, Left | ✅ Numbers are correct |
| 3 | Tap Date | 1. Tap any colored date | ✅ Shows members due on that date |
| 4 | Change Month | 1. Tap < or > arrows | ✅ Shows previous/next month |

---

## ⚙️ MODULE 6: SETTINGS

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Open Settings | 1. Tap "Settings" in bottom menu | ✅ Shows settings page |
| 2 | Change Theme | 1. Tap theme card → 2. Select any theme | ✅ App colors change |
| 3 | View Profile | 1. Look at gym name and email | ✅ Shows correct gym info |

---

## 🎨 MODULE 7: THEMES

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Try All Themes | 1. Go to Settings → 2. Tap each theme one by one | ✅ Each theme applies different colors |
| 2 | Check Instagram Theme | 1. Select Instagram theme | ✅ Pink/purple gradient colors |
| 3 | Check Dark Theme | 1. Select Midnight Dark | ✅ Dark background, light text |

---

## 📱 MODULE 8: MOBILE UI

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Bottom Navigation | 1. Check bottom menu has: Dashboard, Members, Calendar, Payments, Settings | ✅ All 5 tabs visible |
| 2 | Scroll | 1. Scroll up/down on any page | ✅ Smooth scrolling |
| 3 | Notifications | 1. Add member or record payment | ✅ Success message shows BELOW the notch |
| 4 | Pull to Refresh | 1. Pull down on Members list | ✅ List refreshes |

---

## 🐛 HOW TO REPORT BUGS

If something doesn't work:

1. **Screenshot** - Take a screenshot
2. **What you did** - Write the steps you followed
3. **What happened** - Write what went wrong
4. **Expected** - Write what should have happened

**Example:**
```
Bug: Add Member not working
Steps: Tapped + button, filled name and phone, tapped Save
What happened: Nothing happened, no message
Expected: Should show success and add member
Screenshot: [attached]
```

---

## ✅ TEST CHECKLIST

Use this to track your testing:

- [ ] Login works
- [ ] Dashboard shows correct stats
- [ ] Can add new member
- [ ] Can edit member
- [ ] Can record payment
- [ ] Calendar shows correct data
- [ ] Themes change colors
- [ ] Notifications appear below notch
- [ ] All buttons are clickable
- [ ] No crashes or errors

---

**Thank you for testing! 🙏**

*Send bugs to: [Your contact]*
