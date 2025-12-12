/**
 * FitFlow Popup Design System
 * 
 * All popups/modals/dialogs should use these standardized styles for consistency.
 * This ensures a professional look across the entire app.
 * 
 * Created: 2025-12-12
 */

// =============================================================================
// POPUP SIZE VARIANTS
// =============================================================================

export const POPUP_SIZES = {
  /** Small popups - confirmation dialogs, simple choices */
  sm: 'w-[90vw] max-w-[300px]',
  
  /** Default size - most popups including member actions, forms */
  default: 'w-[90vw] max-w-[340px]',
  
  /** Medium - forms with more fields, progress tracking */
  md: 'w-[92vw] max-w-[380px]',
  
  /** Large - complex forms, tables, history views */
  lg: 'w-[95vw] max-w-[440px]',
  
  /** Full - calendar views, detailed reports (use sparingly) */
  full: 'w-[95vw] max-w-[600px]',
} as const;

export type PopupSize = keyof typeof POPUP_SIZES;

// =============================================================================
// POPUP CONTAINER STYLES
// =============================================================================

/** Backdrop/overlay that darkens the background */
export const POPUP_OVERLAY = 
  'fixed inset-0 bg-black/50 z-[100]';

/** Centered container for the popup */
export const POPUP_CONTAINER = 
  'fixed inset-0 z-[101] flex items-center justify-center p-4';

/** Mobile-safe bottom padding for popups (accounts for bottom nav) */
export const POPUP_CONTAINER_MOBILE = 
  'fixed inset-0 z-[101] flex items-center justify-center p-4 pb-20';

// =============================================================================
// POPUP CARD STYLES
// =============================================================================

/** Main popup card - glass morphism style */
export const POPUP_CARD = `
  rounded-2xl 
  overflow-hidden 
  shadow-2xl 
  blur-optimized
`;

/** Light theme popup background */
export const POPUP_CARD_LIGHT = `
  ${POPUP_CARD}
  bg-white/95
  border border-white/40
`;

/** Dark theme popup background (for forms) */
export const POPUP_CARD_DARK = `
  ${POPUP_CARD}
  bg-gradient-to-b from-slate-800 to-slate-900
  border border-slate-700/50
`;

// =============================================================================
// POPUP HEADER STYLES
// =============================================================================

/** Standard popup header with gradient */
export const POPUP_HEADER = `
  relative 
  px-4 py-3 
  bg-gradient-to-br from-emerald-500 to-teal-600
`;

/** Header title text */
export const POPUP_HEADER_TITLE = `
  text-base font-bold text-white
`;

/** Header subtitle text */
export const POPUP_HEADER_SUBTITLE = `
  text-xs text-white/80 mt-0.5
`;

/** Close button in header */
export const POPUP_CLOSE_BUTTON = `
  absolute top-3 right-3 
  w-8 h-8 
  rounded-full 
  bg-white/20 
  flex items-center justify-center 
  text-white 
  hover:bg-white/30 
  transition-colors
  active:scale-95
`;

// =============================================================================
// POPUP BODY STYLES
// =============================================================================

/** Standard popup body with padding */
export const POPUP_BODY = `
  p-4 
  max-h-[60vh] 
  overflow-y-auto 
  scroll-optimized
`;

/** Compact body (less padding) */
export const POPUP_BODY_COMPACT = `
  p-3 
  max-h-[65vh] 
  overflow-y-auto 
  scroll-optimized
`;

// =============================================================================
// POPUP FOOTER STYLES
// =============================================================================

/** Standard footer with action buttons */
export const POPUP_FOOTER = `
  flex gap-2 
  p-4 pt-3 
  border-t border-gray-100
`;

/** Dark theme footer */
export const POPUP_FOOTER_DARK = `
  flex gap-2 
  p-4 pt-3 
  border-t border-slate-700/50
`;

// =============================================================================
// POPUP BUTTON STYLES
// =============================================================================

/** Primary action button */
export const POPUP_BTN_PRIMARY = `
  flex-1 
  py-2.5 
  rounded-xl 
  bg-gradient-to-r from-emerald-500 to-teal-500 
  text-white text-sm font-semibold 
  shadow-lg shadow-emerald-500/30 
  active:scale-[0.98] 
  transition-transform
`;

/** Secondary/cancel button */
export const POPUP_BTN_SECONDARY = `
  flex-1 
  py-2.5 
  rounded-xl 
  bg-gray-100 
  text-gray-700 text-sm font-semibold 
  active:scale-[0.98] 
  transition-transform
`;

/** Danger/destructive button */
export const POPUP_BTN_DANGER = `
  flex-1 
  py-2.5 
  rounded-xl 
  bg-gradient-to-r from-red-500 to-rose-500 
  text-white text-sm font-semibold 
  shadow-lg shadow-red-500/30 
  active:scale-[0.98] 
  transition-transform
`;

// =============================================================================
// FORM INPUT STYLES (for popup forms)
// =============================================================================

/** Standard form input in dark popups */
export const POPUP_INPUT = `
  w-full 
  px-3 py-2 
  rounded-lg 
  border border-slate-600 
  bg-slate-800/80 
  text-white 
  placeholder-slate-400 
  text-sm 
  focus:outline-none 
  focus:ring-2 focus:ring-emerald-500/50 
  focus:border-emerald-500
  input-fast
`;

/** Form label */
export const POPUP_LABEL = `
  block 
  text-xs font-semibold 
  text-slate-300 
  mb-1.5
`;

/** Form field wrapper */
export const POPUP_FIELD = `
  mb-3
`;

// =============================================================================
// ANIMATION VARIANTS (for Framer Motion)
// =============================================================================

export const POPUP_ANIMATION = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 }
  },
  card: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { type: 'spring', damping: 25, stiffness: 400 }
  }
} as const;

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Get popup width classes based on size variant
 * @param size - Popup size variant
 * @returns Tailwind width classes
 */
export function getPopupWidth(size: PopupSize = 'default'): string {
  return POPUP_SIZES[size];
}

/**
 * Combine popup styles with custom classes
 * @param baseStyles - Base style constant
 * @param customClasses - Additional custom classes
 * @returns Combined class string
 */
export function popupClass(baseStyles: string, customClasses?: string): string {
  return customClasses ? `${baseStyles} ${customClasses}` : baseStyles;
}
