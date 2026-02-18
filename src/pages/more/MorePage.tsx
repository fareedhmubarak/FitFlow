import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, BarChart3, Users2, UserPlus, QrCode, 
  BookOpen, Dumbbell, UtensilsCrossed, Wallet, CalendarDays,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FeatureCard {
  label: string;
  icon: typeof Settings;
  route: string;
  gradient: string;
  description?: string;
}

const featureCards: FeatureCard[] = [
  { label: 'Settings', icon: Settings, route: '/settings', gradient: 'from-slate-500 to-slate-600' },
  { label: 'Expenses', icon: Wallet, route: '/expenses', gradient: 'from-emerald-500 to-teal-600' },
  { label: 'Diet Plans', icon: UtensilsCrossed, route: '/diet-plans', gradient: 'from-orange-400 to-red-500' },
  { label: 'Workouts', icon: Dumbbell, route: '/workout-plans', gradient: 'from-blue-500 to-indigo-600' },
  { label: 'Reports', icon: BarChart3, route: '/reports', gradient: 'from-purple-500 to-fuchsia-600' },
  { label: 'Staff', icon: Users2, route: '/staff', gradient: 'from-cyan-500 to-blue-500' },
  { label: 'Leads', icon: UserPlus, route: '/leads', gradient: 'from-pink-500 to-rose-600' },
  { label: 'Check-in', icon: QrCode, route: '/checkin', gradient: 'from-amber-500 to-orange-600' },
  { label: 'Plans', icon: BookOpen, route: '/plans', gradient: 'from-teal-500 to-green-600' },
  { label: 'Classes', icon: CalendarDays, route: '/classes', gradient: 'from-violet-500 to-purple-600' },
];

export default function MorePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-text-primary, #0f172a)' }} />
          </motion.button>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
            More
          </h1>
        </div>
      </header>

      {/* Feature Grid */}
      <div className="px-4 pt-2">
        <div className="grid grid-cols-3 gap-3">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.route}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate(card.route)}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl backdrop-blur-xl shadow-md border border-white/30"
                style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span
                  className="text-[11px] font-semibold leading-tight text-center"
                  style={{ color: 'var(--theme-text-primary, #1e293b)' }}
                >
                  {card.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
