# FitFlow Theme Test Checklist

## Available Themes
1. **Sky Fresh** (default) - Light blue with green/pink blobs
2. **Mocha Mousse** - Warm brown/cream tones
3. **Midnight Ocean** - Dark blue/cyan theme (Dark Mode)
4. **Aurora Purple** - Purple/violet gradient theme
5. **Pure AMOLED** - True black for OLED screens

---

## How to Change Theme
1. Go to **Settings** → **Theme** tab
2. Click on any theme card to apply it
3. Theme should immediately update across all pages

---

## Test Checklist

### ✅ Settings Page (`/settings`)
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Tab Pills (Line 2) | Horizontal scroll | All 9 tabs visible and scrollable |
| Tabs visible | My Profile, Install App, Gym Profile, Membership Plans, Preferences, Theme, Branding, Features, Notifications | All tabs accessible by scrolling |
| Page Title | "Settings" text | Light/white text on dark background |
| Glass cards | Form containers | Semi-transparent with visible content |

### ✅ Dashboard Page (`/`)
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Page Background | Overall background | Dark (#0F172A for Ocean) |
| Gradient Blobs | Animated blobs | Visible cyan/indigo blobs |
| Page Title | "Dashboard" | Light/white text |
| Stats Cards | Total Members, Due Today, Overdue | White text on glass cards |
| Member Cards | Member names, amounts | White/light text readable |

### ✅ Members Page (`/members`)
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Page Background | Overall background | Dark theme applied |
| Stats Cards (Total/Active/Inactive) | Card labels | Light text (not black) |
| Stats Card Values | Numbers | Colored (cyan/emerald) but visible |
| Member Table Header | Name, Plan, Joining, etc. | Light muted text |
| Member Names | In table/card view | White/light text |
| Phone Numbers | In table/card view | Muted light text |
| Plan Details | Plan name and amount | Light text, emerald for amounts |
| Card View (Grid) | Member cards | Glass background with light text |
| Table View | Member rows | Dark background with light text |

### ✅ Payments Page (`/payments`)
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Page Background | Overall background | Dark theme applied |
| Stats Bar | Total/Paid/Count | Light text labels, values visible |
| Payment Cards | Member names | Light/white text |
| Payment Amounts | ₹ amounts | White text |
| Date Info Cards | Due Date, Paid Date | Light text on glass cards |
| Empty State | "No payments" message | Light text with visible icon |

### ✅ Calendar Page (`/calendar`)
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Page Background | Overall background | Dark theme applied |
| Calendar Grid | Day cells | Dark glass background |
| Day Numbers | Date numbers | Light/visible text |
| Events | Event cards | Visible with light text |
| Navigation | Month navigation | Light text |

### ✅ Popup Dialogs
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Member Popup | Background | Dark popup background |
| Member Info | Name, phone | White text on header |
| Detail Cards | Plan, Amount, Dates | Light text on dark cards |
| Action Buttons | WhatsApp, Call, Payment, etc. | Colored with proper contrast |
| Payment Form | Labels and inputs | Light labels, dark input backgrounds |
| Deactivate Confirmation | Message text | Light text on dark background |

### ✅ Bottom Navigation
| Component | What to Check | Expected Behavior (Dark Theme) |
|-----------|---------------|-------------------------------|
| Background | Nav bar background | Glass effect with dark tint |
| Icons | Home, Members, Calendar, Payments, Settings | Visible icons |
| Labels | Nav labels | Light/muted text |
| Active State | Selected item | Highlighted with accent color |

---

## Quick Visual Test Steps

### Test 1: Settings Tab Visibility (Mobile)
1. Open app on mobile or resize browser to mobile width
2. Go to Settings
3. Look at the top tab row
4. **Swipe left** - all 9 tabs should be scrollable
5. ✅ Pass: Can see and tap all tabs
6. ❌ Fail: Can only see 4-5 tabs with no scroll

### Test 2: Dark Theme Text Readability
1. Go to Settings → Theme
2. Select "Midnight Ocean"
3. Navigate to Members page
4. **Check**: Stats cards show "Total", "Active", "Inactive" in light text
5. **Check**: Member names are readable (white/light color)
6. **Check**: Phone numbers are visible but muted
7. ✅ Pass: All text readable on dark background
8. ❌ Fail: Black text on dark background (unreadable)

### Test 3: Payments Page Theme
1. With Midnight Ocean theme active
2. Go to Payments page
3. **Check**: Page background is dark blue
4. **Check**: Payment cards have glass effect
5. **Check**: Member names and amounts are white/light
6. **Check**: Date info cards are readable
7. ✅ Pass: Full dark theme applied
8. ❌ Fail: White cards or black text

### Test 4: Member Popup
1. With dark theme active
2. Go to Members or Dashboard
3. Click on any member
4. **Check**: Popup background is dark (not white)
5. **Check**: Plan, Amount, Date cards have dark background
6. **Check**: All labels and values readable
7. ✅ Pass: Popup themed correctly
8. ❌ Fail: White popup or unreadable text

---

## CSS Variables Reference

The following CSS variables control theme appearance:

```css
--theme-bg           /* Page background */
--theme-blob-1       /* Animated blob color 1 */
--theme-blob-2       /* Animated blob color 2 */
--theme-text-primary /* Main text color */
--theme-text-secondary /* Secondary text */
--theme-text-muted   /* Muted/subtle text */
--theme-glass-bg     /* Glass card background */
--theme-glass-border /* Glass card border */
--theme-input-bg     /* Input field background */
--theme-input-border /* Input field border */
--theme-card-bg      /* Solid card background */
--theme-popup-bg     /* Popup/modal background */
```

---

## Troubleshooting

### Issue: Theme not applying after change
- **Solution**: Clear browser cache and refresh
- Service Worker may be caching old styles

### Issue: Specific page not themed
- **Solution**: Check if page components use CSS variables
- Look for hardcoded colors like `text-slate-800` or `bg-white`

### Issue: Popup has wrong colors
- **Solution**: Check if `--theme-popup-bg` and `--theme-card-bg` are defined in theme CSS

---

## Theme File Locations
- Default: `src/styles/themes/default.css`
- Mocha: `src/styles/themes/mocha.css`
- Ocean: `src/styles/themes/ocean.css`
- Aurora: `src/styles/themes/aurora.css`
- AMOLED: `src/styles/themes/amoled.css`

---

*Last Updated: January 2025*
