# 📱 FitFlow App Testing Guide

## 🔐 Login Credentials
- **URL:** [Your App URL]
- **Email:** `nizam@fitflow.demo`
- **Password:** `Demo@123`

---

## ✅ MAIN TESTS (Priority)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | **Dashboard Check** | Open app after login | See Overdue (red) & Due Today (orange) members with amounts |
| 2 | **Collect Payment** | Dashboard → Tap overdue member → Tap green "Collect" → Enter amount → Submit | Member disappears from overdue list |
| 3 | **Member Filter** | Members → Tap "Filters" → Select "3M" → Apply | Only quarterly (₹2,500) members show |
| 4 | **Add Member** | Members → "+Add" → Fill name, phone, plan → Take photo → Submit | New member appears in list |
| 5 | **WhatsApp Reminder** | Dashboard → Tap overdue member → Tap WhatsApp icon | WhatsApp opens with payment reminder message |

---

## 🔍 QUICK CHECKS

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 6 | **Search Member** | Members → Type name in search box | List filters instantly |
| 7 | **Calendar View** | Tap Calendar tab | Shows members with dues on each date |
| 8 | **Payment History** | Tap Payments tab | Shows all past payments with dates |
| 9 | **Theme Change** | Settings → Change theme color | App colors change immediately |
| 10 | **Logout/Login** | Settings → Logout → Login again | Your data loads correctly |

---

## 🐛 How to Report Issues

**Send screenshot + answer these:**
1. What did you do?
2. What happened?
3. What did you expect?

---

## 📋 Other Test Accounts

| Gym | Email | Password |
|-----|-------|----------|
| Samrin Gym | samrin@fitflow.demo | Demo@123 |
| Ithris Gym | ithris@fitflow.demo | Demo@123 |
| Ramesh Gym | ramesh@fitflow.demo | Demo@123 |
| Musheer's Gym | musheer@fitflow.demo | Demo@123 |

---

*Last Updated: December 5, 2025*
