# FitFlow Popup Style Guide

**Last Updated:** 2024-12-13

This document defines the consistent styling standards for all popup/modal/dialog components in the FitFlow application. All popups should follow these specifications to ensure a unified user experience.

---

## 🎨 Core Styling Tokens

### Container
```css
/* Modal Container */
className="w-[90vw] max-w-[340px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl bg-white"

/* With flex layout (for scrollable content + fixed footer) */
className="w-[90vw] max-w-[340px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
```

### Safe Area Padding
```tsx
style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
```

### Backdrop
```tsx
<motion.div
  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
/>
```

---

## 🏷️ Header Section

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-slate-50/80">
  <div className="flex items-center gap-3">
    {/* Icon */}
    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
      <Icon className="w-5 h-5 text-emerald-600" />
    </div>
    {/* Text */}
    <div>
      <h3 className="text-sm font-bold text-slate-800">Title</h3>
      <p className="text-xs text-slate-500">Subtitle</p>
    </div>
  </div>
  {/* Close Button */}
  <button className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
    <X className="w-3.5 h-3.5 text-slate-500" />
  </button>
</div>
```

---

## 📝 Form Elements

### Labels
```tsx
<label className="block text-xs font-semibold text-slate-600 mb-1.5">
  Field Label <span className="text-red-500">*</span>
</label>
```

### Text Inputs
```tsx
<input
  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
/>
```

### Select Dropdowns
```tsx
<select
  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
>
```

### Textareas
```tsx
<textarea
  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
/>
```

### Date Inputs
```tsx
<input
  type="date"
  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm [color-scheme:light]"
/>
```

### Read-only / Disabled Inputs
```tsx
<input
  disabled
  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-bold cursor-not-allowed"
/>
```

---

## 🔘 Buttons

### Selection Buttons (Plan, Gender, Payment Method)
```tsx
{/* Unselected */}
<button className="py-3 px-2 rounded-xl text-sm font-semibold transition-all border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">

{/* Selected */}
<button className="py-3 px-2 rounded-xl text-sm font-semibold transition-all border bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30">
```

### Primary Action Button
```tsx
<button className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
  Action Text
</button>
```

### Secondary / Cancel Button
```tsx
<button className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50">
  Cancel
</button>
```

---

## ⚠️ Status Messages

### Success (Green)
```tsx
<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
  <div className="flex items-center gap-1.5">
    <Icon className="w-4 h-4 text-emerald-600" />
    <span className="text-xs font-semibold text-emerald-800">Success Message</span>
  </div>
  <p className="text-[9px] text-emerald-700/70 mt-1">Additional info</p>
</div>
```

### Warning (Amber)
```tsx
<div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
  <p className="text-xs text-amber-700">Warning message text</p>
</div>
```

### Error (Red)
```tsx
<div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
  <p className="text-xs text-red-600">Error message text</p>
</div>
```

---

## 📐 Footer Section

```tsx
<div className="flex-shrink-0 px-4 py-3 border-t border-slate-200/60 bg-slate-50/80">
  <div className="flex gap-3">
    {/* Cancel Button */}
    <button className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200">
      Cancel
    </button>
    {/* Primary Action */}
    <button className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 transition-all">
      Confirm
    </button>
  </div>
</div>
```

---

## 🎯 Complete Popup Template

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
        onClick={onClose}
      >
        <div 
          className="w-[90vw] max-w-[340px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-slate-50/80">
            {/* ... header content ... */}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ... form fields ... */}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200/60 bg-slate-50/80">
            {/* ... buttons ... */}
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

## ✅ Popups Updated to This Standard

| Popup | File | Status |
|-------|------|--------|
| Add Member | `MembersList.tsx` | ✅ Done |
| Edit Member | `EditMemberDialog.tsx` | ✅ Done |
| Record Payment | `UnifiedMemberPopup.tsx` | ✅ Done |
| Member Details | `UnifiedMemberPopup.tsx` | ✅ Done |
| Mark Inactive | `MarkInactiveDialog.tsx` | ✅ Done |
| Rejoin Member | `RejoinMemberModal.tsx` | ✅ Done |
| Progress History | `ProgressHistoryModal.tsx` | ✅ Done |
| Add Progress | `AddProgressModal.tsx` | ✅ Done |
| Membership History | `MembershipHistoryModal.tsx` | ✅ Done |
| Image Preview | `ImagePreviewModal.tsx` | ✅ Skipped (already good) |
| Confirm Modal | `ConfirmModal.tsx` | ✅ Done |
| Payment Day | `PaymentDayModal.tsx` | ✅ Done |

---

## 📱 Z-Index Hierarchy

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base Modal Backdrop | `z-[200]` | Standard popups |
| Base Modal Content | `z-[201]` | Standard popups |
| Nested Modal Backdrop | `z-[400]` | Modals opened from other modals |
| Nested Modal Content | `z-[401]` | Modals opened from other modals |
| Camera/Photo Capture | `z-[10000]` | Full-screen camera view |
