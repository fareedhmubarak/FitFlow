import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import BottomNavigation from './BottomNavigation';
import { debugLogger } from '../../lib/debugLogger';

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

  return (
    <div className="min-h-screen bg-[#E0F2FE] font-[Urbanist]">
      {/* Page Content */}
      <main className="pb-20">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
