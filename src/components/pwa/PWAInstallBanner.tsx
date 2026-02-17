/**
 * PWAInstallBanner
 *
 * Global, smart install prompt that covers both Android & iOS.
 *
 * Android  – Captures the `beforeinstallprompt` event and shows a
 *            one-tap "Install" button.
 * iOS      – Detects Safari + non-standalone and shows step-by-step
 *            "Add to Home Screen" instructions.
 * Already installed / dismissed → hidden.
 *
 * The banner auto-appears 2 seconds after page load so it doesn't
 * flash before the app mounts.  It can be permanently dismissed
 * (localStorage flag avoids nagging).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus, Smartphone, ChevronRight } from 'lucide-react';

// Key in localStorage to remember dismissal
const DISMISS_KEY = 'haefit-pwa-dismissed';
// How many days before we re-show after dismiss
const DISMISS_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const diff = Date.now() - Number(ts);
    return diff < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch { /* quota */ }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getIOSVersion(): number | null {
  const m = navigator.userAgent.match(/OS (\d+)_/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Component ────────────────────────────────────────────

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|chrome/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  useEffect(() => {
    // Already installed or recently dismissed → bail
    if (isStandalone() || isDismissed()) return;

    // Android / Chrome – capture install prompt
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after small delay so the UI is stable
      timerRef.current = setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);

    // iOS Safari – show our custom guide after delay
    if (isIOS) {
      timerRef.current = setTimeout(() => setShow(true), 2000);
    }

    const handleInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Actions ────────────────────────────────────

  const handleInstallAndroid = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setShow(false);
    setShowIOSGuide(false);
  }, []);

  // ── Render ─────────────────────────────────────

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* ── iOS full-screen guide overlay ── */}
          <AnimatePresence>
            {showIOSGuide && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowIOSGuide(false)}
                  className="fixed inset-0 bg-black/60 z-[9998]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
                >
                  {/* Drag handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-200" />
                  </div>

                  <div className="px-5 pb-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                          <img
                            src="/icons/icon-192x192.png"
                            alt="Haefit"
                            className="w-8 h-8 rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-800">Install Haefit</h2>
                          <p className="text-[11px] text-slate-400">Add to your home screen</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowIOSGuide(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          1
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-800">
                            Tap the <span className="text-blue-600">Share</span> button
                          </p>
                          <div className="mt-2 flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <Share className="w-6 h-6 text-blue-500" />
                            <div>
                              <p className="text-xs text-slate-600">
                                Look for this icon at the <strong>bottom</strong> of Safari
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                (square with arrow pointing up)
                              </p>
                            </div>
                          </div>
                          {!isSafari && (
                            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                              <p className="text-[10px] text-amber-700 font-semibold">
                                You must use <strong>Safari</strong> browser. Open this link in Safari first.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          2
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-800">
                            Tap <span className="text-blue-600">"Add to Home Screen"</span>
                          </p>
                          <div className="mt-2 flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-slate-600" />
                            </div>
                            <p className="text-xs text-slate-600">
                              Scroll down in the share menu until you see it
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          3
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-800">
                            Tap <span className="text-emerald-600">"Add"</span> in the top right
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            The Haefit icon will appear on your home screen — open it like any other app!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Done note */}
                    <div className="mt-5 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <p className="text-xs text-emerald-700 font-semibold">
                        After installing, open the <strong>Haefit</strong> icon from your home screen.
                        It will work like a real app — full screen, fast, no browser bar!
                      </p>
                    </div>

                    <button
                      onClick={handleDismiss}
                      className="mt-4 w-full py-2.5 text-xs text-slate-400 font-semibold"
                    >
                      Maybe later
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Bottom banner (always visible until dismissed) ── */}
          {!showIOSGuide && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="fixed bottom-20 left-3 right-3 z-[9997] font-[Urbanist]"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden">
                {/* Gradient accent bar */}
                <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

                <div className="p-3.5 flex items-center gap-3">
                  {/* App icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shrink-0">
                    <img
                      src="/icons/icon-192x192.png"
                      alt=""
                      className="w-8 h-8 rounded-lg"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        // Show fallback letter
                        const parent = img.parentElement;
                        if (parent) {
                          parent.innerHTML = '<span class="text-white font-bold text-lg">H</span>';
                        }
                      }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">Install Haefit</p>
                    <p className="text-[10px] text-slate-400">
                      {isIOS
                        ? 'Add to home screen for the best experience'
                        : 'Install for faster access & offline support'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Dismiss */}
                    <button
                      onClick={handleDismiss}
                      className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {/* Install button */}
                    {isIOS ? (
                      <button
                        onClick={() => setShowIOSGuide(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1 hover:brightness-110 transition-all active:scale-[0.96]"
                      >
                        How to Install
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={handleInstallAndroid}
                        disabled={installing || !deferredPrompt}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 hover:brightness-110 transition-all active:scale-[0.96] disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {installing ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
