import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ThemeSelector from '../../components/settings/ThemeSelector';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemePage() {
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-12 pb-2"
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
            App Theme
          </h1>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-4 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-[24px] p-5 shadow-lg"
          style={{
            backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))',
            borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
            borderWidth: '1px'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Choose Theme</h3>
              <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Pick your preferred color scheme</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/60 border border-white/50">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentTheme.preview.primary }}
              />
              <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{currentTheme.name}</span>
            </div>
          </div>

          <ThemeSelector />
        </motion.div>
      </div>
    </div>
  );
}
