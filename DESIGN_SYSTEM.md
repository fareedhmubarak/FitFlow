# FitFlow Design System Guide

## Overview
This document defines the consistent design system used across all pages in FitFlow.

---

## 🎨 Color Palette

### Primary Background
- **Main Background**: `#E0F2FE` (Light Sky Blue)
- Used as the base background color for all pages

### Animated Gradient Blobs
| Blob | Color | Position | Animation Duration |
|------|-------|----------|-------------------|
| Blob 1 | `#6EE7B7` (Mint Green) | Top-left | 8 seconds |
| Blob 2 | `#FCA5A5` (Light Red/Pink) | Bottom-right | 10 seconds |

### Accent Colors
- **Primary**: Emerald (`emerald-500`, `emerald-600`)
- **Secondary**: Teal (`teal-500`, `teal-600`)
- **Danger/Overdue**: Red (`red-500`, `red-600`)
- **Warning**: Amber (`amber-500`)
- **Info**: Blue (`blue-500`)

---

## 📱 Typography

### Font Family
```css
font-family: 'Urbanist', system-ui, sans-serif;
```

### Text Colors
- **Primary Text**: `text-slate-800`
- **Secondary Text**: `text-slate-500`
- **Muted Text**: `text-slate-400`

---

## 🔮 Glassmorphism Components

### Standard Glass Card
```css
bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl
```

### Glass Input
```css
bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl focus:ring-2 focus:ring-emerald-400
```

### Glass Button (Secondary)
```css
bg-white/50 text-slate-600 backdrop-blur-md border border-white/40 rounded-xl
```

---

## 🎭 Animation Patterns

### Animated Background Blobs
```tsx
{/* Blob 1 - Mint Green */}
<motion.div
  animate={{
    x: [0, 80, -60, 0],
    y: [0, -60, 40, 0],
    scale: [1, 1.2, 0.9, 1],
  }}
  transition={{ 
    duration: 8, 
    repeat: Infinity, 
    repeatType: "reverse", 
    ease: "easeInOut" 
  }}
  className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none"
/>

{/* Blob 2 - Light Red */}
<motion.div
  animate={{
    x: [0, -60, 80, 0],
    y: [0, 70, -40, 0],
    scale: [1, 1.3, 0.85, 1],
  }}
  transition={{ 
    duration: 10, 
    repeat: Infinity, 
    repeatType: "reverse", 
    ease: "easeInOut" 
  }}
  className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none"
/>
```

### Page Transitions
```tsx
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
```

### Button Tap Animation
```tsx
whileTap={{ scale: 0.95 }}
```

---

## 📐 Layout Structure

### Full-Screen Page Layout
```tsx
<div 
  className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist]"
  style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
>
  {/* Safe Area Extensions */}
  <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-[#E0F2FE] z-[200]" />
  <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-[#E0F2FE] z-[200]" />
  
  {/* Animated Blobs */}
  {/* ... blob components ... */}
  
  {/* Header */}
  <motion.header
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex-shrink-0 px-4 pb-3 relative z-10"
    style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
  >
    {/* Header content */}
  </motion.header>
  
  {/* Content */}
  <div className="flex-1 overflow-auto px-4 relative z-10">
    {/* Page content */}
  </div>
</div>
```

---

## 🔄 Loading States

### GymLoader Component
Use `<GymLoader message="Loading..." />` for all loading states.

The loader features:
- Animated dumbbell icon with scale/rotate animation
- Animated progress bar
- Custom loading message
- Same background and blob animations as main pages

---

## 🧩 Reusable Components

### GymLoader
Location: `src/components/ui/GymLoader.tsx`
```tsx
import { GymLoader } from '@/components/ui/GymLoader';

// Usage
if (isLoading) {
  return <GymLoader message="Loading members..." />;
}
```

### PageLayout
Location: `src/components/layout/PageLayout.tsx`
```tsx
import { PageLayout } from '@/components/layout/PageLayout';

// Usage
<PageLayout 
  title="Page Title" 
  subtitle="Description"
  backLink="/"
>
  {/* Page content */}
</PageLayout>
```

---

## ✅ Implementation Checklist

When creating a new page, ensure:

- [ ] Use `font-[Urbanist]` on main container
- [ ] Background color is `bg-[#E0F2FE]`
- [ ] Include both animated blobs (8s and 10s duration)
- [ ] Safe area insets for iOS devices
- [ ] Use `GymLoader` component for loading states
- [ ] Header with proper safe-area padding
- [ ] Content area with `overflow-auto` and `relative z-10`
- [ ] Glass cards use `bg-white/60 backdrop-blur-xl border border-white/40`
- [ ] Buttons have `whileTap={{ scale: 0.95 }}` animation
- [ ] Emerald gradient for primary buttons: `from-emerald-500 to-teal-500`

---

## 📄 Updated Pages

The following pages have been updated with this design system:

1. ✅ Dashboard (`/`)
2. ✅ MembersList (`/members`)
3. ✅ AddMember (`/members/new`)
4. ✅ PaymentCalendar (`/payments`)
5. ✅ PaymentRecords (`/payments/records`)
6. ✅ PaymentsList (`/payments/list`)
7. ✅ Settings (`/settings`)
8. ✅ CheckIn (`/checkin`)
9. ✅ PlansPage (`/plans`)
10. ✅ CalendarPage (`/calendar`)
11. ✅ ReportsDashboard (`/reports`)
12. ✅ Login (`/login`)
13. ✅ Signup (`/signup`)
14. ✅ ForgotPassword (`/forgot-password`)
15. ✅ AuthCallback (`/auth/callback`)
16. ✅ VerifyEmail (`/auth/verify`)
17. ✅ GymOnboarding (`/onboarding`)
18. ✅ NotFound (`/*`)
