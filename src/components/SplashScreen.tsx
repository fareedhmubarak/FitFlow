import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppReady } from '../contexts/AppReadyContext';

/**
 * Headless Splash Controller
 * ──────────────────────────
 * Renders NOTHING visual. The HTML pre-splash in index.html is the one
 * and only splash animation. This component just manages its lifecycle:
 *   • Waits for minimum display time (3.5s) so the entrance animation plays fully
 *   • Waits for dashboard data readiness (or non-dashboard route)
 *   • Fades out the HTML pre-splash with a scale-up transition
 *   • Signals isSplashComplete so the dashboard can render
 */
export default function SplashScreen() {
  const { isDataReady, setSplashComplete, shouldShowSplash } = useAppReady();
  const [minReached, setMinReached] = useState(false);
  const exitingRef = useRef(false);

  const exitSplash = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    const el = document.getElementById('pre-splash');
    if (el) {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.remove();
        setSplashComplete();
      }, 500);
    } else {
      setSplashComplete();
    }
  }, [setSplashComplete]);

  // Minimum display time + safety timeout
  useEffect(() => {
    if (!shouldShowSplash) {
      const el = document.getElementById('pre-splash');
      if (el) el.remove();
      setSplashComplete();
      return;
    }
    const minTimer = setTimeout(() => setMinReached(true), 3500);
    const safety = setTimeout(() => exitSplash(), 6000);
    return () => { clearTimeout(minTimer); clearTimeout(safety); };
  }, [shouldShowSplash, setSplashComplete, exitSplash]);

  // Exit when data ready + min time elapsed
  useEffect(() => {
    if (!shouldShowSplash || exitingRef.current || !minReached) return;
    const path = window.location.pathname;
    const isDashboard = path === '/' || path === '';
    if (!isDashboard || isDataReady) {
      exitSplash();
    }
  }, [minReached, isDataReady, shouldShowSplash, exitSplash]);

  return null;
}
