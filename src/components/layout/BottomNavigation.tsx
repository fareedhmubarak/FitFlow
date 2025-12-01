import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, Calendar, Receipt, Settings } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/payments/records', label: 'Payments', icon: Receipt },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNavigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    if (path === '/calendar') return location.pathname === '/calendar';
    if (path === '/payments/records') return location.pathname.startsWith('/payments');
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex items-center justify-around px-2 py-2 max-w-md mx-auto bg-white/20 backdrop-blur-2xl border border-white/30 shadow-xl rounded-3xl"
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex justify-center"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-0.5 py-1 px-2"
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${
                  active 
                    ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/30' 
                    : 'bg-transparent'
                }`}>
                  <Icon 
                    className={`w-[17px] h-[17px] transition-all duration-300 ${
                      active 
                        ? 'text-white stroke-[2.5]' 
                        : 'text-slate-500 stroke-[2]'
                    }`}
                  />
                </div>
                <span className={`text-[8px] font-semibold transition-all duration-300 ${
                  active 
                    ? 'text-emerald-600' 
                    : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
