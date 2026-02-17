/**
 * Haptic Feedback Utility
 * Provides tactile feedback on mobile devices using the Vibration API.
 * Gracefully degrades to no-op on desktop or unsupported browsers.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

function vibrate(pattern: number | number[]) {
  if (canVibrate) {
    try { navigator.vibrate(pattern); } catch { /* silently ignore */ }
  }
}

export const haptics = {
  /** Light tap — toggles, small buttons (10ms) */
  light: () => vibrate(10),
  /** Medium confirmation — selection, card tap (40ms) */
  medium: () => vibrate(40),
  /** Heavy impact — check-in, payment success (80ms) */
  heavy: () => vibrate(80),
  /** Success pattern — double pulse (50-pause-50) */
  success: () => vibrate([50, 30, 50]),
  /** Error / warning buzz (100-pause-100) */
  error: () => vibrate([100, 50, 100]),
  /** Navigation tap — bottom nav (15ms) */
  tap: () => vibrate(15),
};
