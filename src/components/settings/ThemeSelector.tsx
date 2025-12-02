import { motion } from 'framer-motion';
import { Check, Sparkles, Coffee, Waves, Stars, Moon } from 'lucide-react';
import { useTheme, themeConfigs, ThemeConfig } from '../../contexts/ThemeContext';

// Theme icons mapping
const themeIcons: Record<string, React.ReactNode> = {
  default: <Sparkles className="w-5 h-5" />,
  mocha: <Coffee className="w-5 h-5" />,
  ocean: <Waves className="w-5 h-5" />,
  aurora: <Stars className="w-5 h-5" />,
  amoled: <Moon className="w-5 h-5" />,
};

export default function ThemeSelector() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themeConfigs.map((theme, index) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={themeId === theme.id}
            onSelect={() => setTheme(theme.id)}
            icon={themeIcons[theme.id]}
            delay={index * 0.08}
          />
        ))}
      </div>
    </div>
  );
}

interface ThemeCardProps {
  theme: ThemeConfig;
  isActive: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  delay: number;
}

function ThemeCard({ theme, isActive, onSelect, icon, delay }: ThemeCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onSelect}
      className={`relative w-full p-4 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
        isActive
          ? 'shadow-lg'
          : 'hover:scale-[1.02] hover:shadow-md'
      }`}
      style={{
        outline: isActive ? `2px solid ${theme.preview.primary}` : undefined,
        outlineOffset: isActive ? '2px' : undefined,
      }}
    >
      {/* Theme Preview Background */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: theme.preview.bg }}
      />
      
      {/* Animated Gradient Blobs Preview */}
      <div 
        className="absolute top-[-30%] left-[-20%] w-[60%] h-[60%] rounded-full blur-2xl opacity-50"
        style={{ 
          backgroundColor: theme.preview.blob1,
          animation: 'blob 8s ease-in-out infinite',
        }}
      />
      <div 
        className="absolute bottom-[-30%] right-[-20%] w-[50%] h-[50%] rounded-full blur-2xl opacity-50"
        style={{ 
          backgroundColor: theme.preview.blob2,
          animation: 'blob 10s ease-in-out infinite reverse',
        }}
      />
      
      {/* Glass Overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: theme.isDark 
            ? 'rgba(0,0,0,0.2)' 
            : 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(8px)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: theme.isDark 
                ? `${theme.preview.primary}30` 
                : `${theme.preview.primary}20`,
              color: theme.preview.primary,
            }}
          >
            {icon}
          </div>
          
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.preview.primary }}
            >
              <Check className="w-4 h-4" style={{ color: theme.isDark ? '#000' : '#fff' }} />
            </motion.div>
          )}
        </div>
        
        {/* Theme name & description */}
        <h3 
          className="font-bold text-sm mb-1"
          style={{ color: theme.preview.text }}
        >
          {theme.name}
        </h3>
        <p 
          className="text-xs opacity-70"
          style={{ color: theme.preview.text }}
        >
          {theme.description}
        </p>
        
        {/* Color palette dots */}
        <div className="flex items-center gap-2 mt-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ 
              backgroundColor: theme.preview.bg,
              boxShadow: `0 0 0 2px ${theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            }}
            title="Background"
          />
          <div 
            className="w-4 h-4 rounded-full"
            style={{ 
              backgroundColor: theme.preview.blob1,
              boxShadow: `0 0 0 2px ${theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            }}
            title="Accent 1"
          />
          <div 
            className="w-4 h-4 rounded-full"
            style={{ 
              backgroundColor: theme.preview.blob2,
              boxShadow: `0 0 0 2px ${theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            }}
            title="Accent 2"
          />
          <div 
            className="w-4 h-4 rounded-full"
            style={{ 
              backgroundColor: theme.preview.primary,
              boxShadow: `0 0 0 2px ${theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            }}
            title="Primary"
          />
        </div>
        
        {/* Dark mode indicator */}
        {theme.isDark && (
          <span 
            className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.preview.text,
            }}
          >
            Dark
          </span>
        )}
      </div>
      
      {/* Glow effect when active */}
      {isActive && (
        <div 
          className="absolute -inset-1 rounded-2xl opacity-20 blur-xl -z-10"
          style={{ backgroundColor: theme.preview.primary }}
        />
      )}
    </motion.button>
  );
}
