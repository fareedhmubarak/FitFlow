import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Calendar, Receipt, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/payments/records', label: 'Payments', icon: Receipt },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNavigation() {
  const location = useLocation();
  const { themeId } = useTheme();
  const isRDL = themeId === 'rondesignlab';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    if (path === '/calendar') return location.pathname === '/calendar';
    if (path === '/payments/records') return location.pathname.startsWith('/payments');
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <>
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
                  ? (isRDL ? 'bg-transparent' : 'bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/30')
                  : 'bg-transparent'
              }`}>
                <Icon 
                  className={`transition-all duration-300 ${
                    active 
                      ? (isRDL ? 'w-[19px] h-[19px] stroke-[2.5]' : 'w-[17px] h-[17px] text-white stroke-[2.5]')
                      : 'w-[17px] h-[17px] stroke-[2]'
                  }`}
                  style={active 
                    ? (isRDL ? { color: '#0D9488' } : undefined)
                    : { color: isRDL ? '#555555' : 'var(--theme-text-muted, #64748b)' }
                  }
                />
                {/* Subtle active dot indicator for glass theme */}
                {isRDL && active && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />
                )}
              </div>
              <span 
                className={`text-[8px] font-semibold transition-all duration-300 ${
                  active ? 'text-emerald-600' : ''
                }`}
                style={!active ? { color: isRDL ? '#555555' : 'var(--theme-text-muted, #94a3b8)' } : undefined}
              >
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', border: 'none', boxShadow: 'none' }}>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="rdl-bottom-nav flex items-center justify-around px-2 py-2 max-w-md mx-auto backdrop-blur-xl shadow-2xl rounded-3xl"
        style={{ 
          background: isRDL ? 'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.68) 100%)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
          backdropFilter: 'blur(60px) saturate(220%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(60px) saturate(220%) brightness(1.05)',
          border: isRDL ? '0.5px solid rgba(255,255,255,0.45)' : 'none',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)'
        }}
      >
        {navContent}
      </motion.div>
    </nav>
  );
}
