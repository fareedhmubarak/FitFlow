import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from './BottomNavigation';
import { debugLogger } from '../../lib/debugLogger';

// ── Page transition variants ─────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export default function MobileLayout() {
  const location = useLocation();
  const previousPath = useRef<string>(location.pathname);

  // Track navigation changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      const currentPath = location.pathname;
      if (previousPath.current !== currentPath) {
        debugLogger.logNavigationEvent(previousPath.current, currentPath, 'push');
        previousPath.current = currentPath;
      }
    }
  }, [location.pathname]);

  // Dashboard renders its own full-screen layout with BottomNav
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  if (isDashboard) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen font-[Urbanist]" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Page Content with transitions */}
      <main className="pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
