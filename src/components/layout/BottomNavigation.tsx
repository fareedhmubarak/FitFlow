import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Calendar, Receipt, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';

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

/* Hidden SVG filters for liquid glass water-drop distortion */
const LiquidGlassFilters = () => (
  <svg
    style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Nav container liquid glass — subtle water refraction, not heavy warp */}
    <filter id="nav-liquid-glass" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.008 0.008"
        numOctaves={2}
        seed={92}
        result="noise"
      />
      <feGaussianBlur in="noise" stdDeviation={0.02} result="blur" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="blur"
        scale={0}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
);

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
            onClick={() => haptics.tap()}
            className="flex-1 flex justify-center relative z-[2]"
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-all duration-300 ${
                isRDL && active ? 'rdl-nav-active-pill' : ''
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-7 transition-all duration-300 z-[1]">
                <Icon 
                  className={`transition-all duration-300 ${
                    active 
                      ? (isRDL ? 'w-[20px] h-[20px] stroke-[2.2]' : 'w-[17px] h-[17px] text-white stroke-[2.5]')
                      : 'w-[17px] h-[17px] stroke-[1.5]'
                  }`}
                  style={active 
                    ? (isRDL ? { color: '#1a1a2e' } : undefined)
                    : { color: isRDL ? 'rgba(30, 30, 50, 0.50)' : 'var(--theme-text-muted, #64748b)' }
                  }
                />
              </div>
              <span 
                className={`relative z-[1] text-[9px] transition-all duration-300 ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
                style={{ 
                  color: active 
                    ? '#1a1a2e' 
                    : (isRDL ? 'rgba(30, 30, 50, 0.45)' : 'var(--theme-text-muted, #94a3b8)'),
                  letterSpacing: '0.02em',
                }}
              >
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </>
  );

  /* ── Non-RDL theme fallback ───────────────────────── */
  if (!isRDL) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', background: 'transparent' }}>
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex items-center justify-around px-2 py-2 max-w-md mx-auto backdrop-blur-xl shadow-2xl rounded-3xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {navContent}
        </motion.div>
      </nav>
    );
  }

  /* ── iOS Liquid Glass Bottom Nav (RDL theme) ──────── */
  return (
    <>
      {/* SVG filters must be in the DOM for CSS filter: url() to reference them */}
      <LiquidGlassFilters />
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[100] px-3 rdl-nav-outer" 
        style={{ 
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', 
          background: 'transparent', 
          backdropFilter: 'none', 
          WebkitBackdropFilter: 'none', 
          border: 'none', 
          boxShadow: 'none',
        }}
      >
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="rdl-bottom-nav rdl-liquid-nav flex items-center justify-around px-2 py-2.5 max-w-md mx-auto rounded-[28px]"
        >
          {navContent}
        </motion.div>
      </nav>
    </>
  );
}
