import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, BarChart3, Users2, BookOpen, Dumbbell, UtensilsCrossed,
  ArrowLeft, Wallet, Building2, Paintbrush, MessageCircle, MessageSquareText
} from 'lucide-react';

interface FeatureCard {
  label: string;
  icon: typeof Settings;
  route: string;
  bg: string;
}

const featureCards: FeatureCard[] = [
  { label: 'Gym Profile', icon: Building2, route: '/gym-profile', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { label: 'Theme', icon: Paintbrush, route: '/theme', bg: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
  { label: 'Diet Plans', icon: UtensilsCrossed, route: '/diet-plans', bg: 'linear-gradient(135deg, #fb923c, #ef4444)' },
  { label: 'Workouts', icon: Dumbbell, route: '/workout-plans', bg: 'linear-gradient(135deg, #3b82f6, #4f46e5)' },
  { label: 'Reports', icon: BarChart3, route: '/reports', bg: 'linear-gradient(135deg, #a855f7, #c026d3)' },
  { label: 'Staff', icon: Users2, route: '/staff', bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { label: 'Plans', icon: BookOpen, route: '/plans', bg: 'linear-gradient(135deg, #14b8a6, #16a34a)' },
  { label: 'Expenses', icon: Wallet, route: '/expenses', bg: 'linear-gradient(135deg, #10b981, #0d9488)' },
  { label: 'Send Messages', icon: MessageCircle, route: '/send-messages', bg: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { label: 'WhatsApp Messages', icon: MessageSquareText, route: '/message-templates', bg: 'linear-gradient(135deg, #16a34a, #0d9488)' },
  { label: 'Settings', icon: Settings, route: '/settings', bg: 'linear-gradient(135deg, #64748b, #475569)' },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 px-4 pt-16 pb-2"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
            More
          </h1>
        </div>
      </header>

      {/* Feature Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-24" style={{ overscrollBehavior: 'contain' }}>
        <div className="grid grid-cols-3 gap-3">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.route}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate(card.route)}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl shadow-md border border-white/40"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: card.bg }}
                >
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
