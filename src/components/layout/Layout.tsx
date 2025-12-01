import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Navbar - Hidden on mobile if we want a pure app feel, but let's keep it for now or simplify it */}
        <div className="hidden md:block">
          <Navbar />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide pb-20 md:pb-6 p-0 md:p-6">
          <Outlet />
        </main>

        {/* Bottom Nav - Visible only on mobile */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

