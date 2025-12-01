import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CalendarCheck, Receipt, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: CalendarCheck, label: 'Tracker', href: '/payments' },
    { icon: Receipt, label: 'Records', href: '/payments/records' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-area-pb">
      {/* Neomorphic Navigation Bar */}
      <div className="neo-raised rounded-[28px] px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = path === item.href || (item.href !== '/' && path.startsWith(item.href) && item.href !== '/payments') 
              || (item.href === '/payments' && path === '/payments')
              || (item.href === '/payments/records' && path === '/payments/records');

            return (
              <Link key={item.href} to={item.href} className="flex-1 flex flex-col items-center justify-center py-2">
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-br from-[#B8F3D8] to-[#A8E6E3] shadow-md" 
                      : "hover:bg-[#F8F9FA]"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-[#1A1A1A]" : "text-[#666666]"
                    )} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium mt-0.5 transition-colors",
                  isActive ? "text-[#1A1A1A]" : "text-[#666666]"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
