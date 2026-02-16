import { motion } from 'framer-motion';
import { Check, Sparkles, Coffee, Waves, Stars, Moon, Snowflake, Camera, Twitter, Music, Video, Clapperboard } from 'lucide-react';
import { useTheme, themeConfigs, ThemeConfig } from '../../contexts/ThemeContext';

// Theme icons mapping
const themeIcons: Record<string, React.ReactNode> = {
  default: <Sparkles className="w-4 h-4" />,
  mocha: <Coffee className="w-4 h-4" />,
  instagram: <Camera className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  spotify: <Music className="w-4 h-4" />,
  tiktok: <Video className="w-4 h-4" />,
  pearl: <Snowflake className="w-4 h-4" />,
  ocean: <Waves className="w-4 h-4" />,
  aurora: <Stars className="w-4 h-4" />,
  amoled: <Moon className="w-4 h-4" />,
  rondesignlab: <Clapperboard className="w-4 h-4" />,
};

export default function ThemeSelector() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2">
      {themeConfigs.map((theme, index) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          isActive={themeId === theme.id}
          onSelect={() => setTheme(theme.id)}
          icon={themeIcons[theme.id]}
          delay={index * 0.03}
        />
      ))}
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
  const isRDL = theme.id === 'rondesignlab';
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      onClick={onSelect}
      className={`relative w-full p-2.5 rounded-xl text-left transition-all duration-200 overflow-hidden ${
        isActive
          ? 'shadow-md'
          : 'hover:scale-[1.02] hover:shadow-sm'
      } ${isRDL ? 'col-span-2' : ''}`}
      style={{
        outline: isActive ? `2px solid ${theme.preview.primary}` : undefined,
        outlineOffset: isActive ? '1px' : undefined,
      }}
    >
      {/* Theme Preview Background */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: theme.preview.bg }}
      />

      {/* RDL: Background image thumbnail with dark gradient overlay */}
      {isRDL && (
        <>
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=60&auto=format&fit=crop)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.35,
            }}
          />
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,170,0.10) 0%, rgba(10,132,255,0.10) 100%)',
            }}
          />
        </>
      )}
      
      {/* Animated Gradient Blobs Preview */}
      <div 
        className="absolute top-[-40%] left-[-30%] w-[50%] h-[50%] rounded-full blur-xl opacity-40"
        style={{ backgroundColor: theme.preview.blob1 }}
      />
      <div 
        className="absolute bottom-[-40%] right-[-30%] w-[40%] h-[40%] rounded-full blur-xl opacity-40"
        style={{ backgroundColor: theme.preview.blob2 }}
      />
      
      {/* Glass Overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: theme.isDark 
            ? 'rgba(0,0,0,0.15)' 
            : 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon and check */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: theme.isDark 
                  ? `${theme.preview.primary}25` 
                  : `${theme.preview.primary}18`,
                color: theme.preview.primary,
              }}
            >
              {icon}
            </div>
            
            {/* RDL: Premium badge inline */}
            {isRDL && (
              <span 
                className="text-[7px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  letterSpacing: '0.1em',
                }}
              >
                ★ PREMIUM
              </span>
            )}
          </div>
          
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.preview.primary }}
            >
              <Check className="w-3 h-3" style={{ color: theme.isDark ? '#000' : '#fff' }} />
            </motion.div>
          )}
        </div>
        
        {/* Theme name */}
        <h3 
          className="font-bold text-[11px] leading-tight"
          style={{ color: theme.preview.text }}
        >
          {theme.name}
        </h3>
        <p 
          className="text-[9px] opacity-60 leading-tight mt-0.5 line-clamp-1"
          style={{ color: theme.preview.text }}
        >
          {theme.description}
        </p>
        
        {/* Color palette dots */}
        <div className="flex items-center gap-1 mt-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: theme.preview.bg,
              boxShadow: `0 0 0 1px ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
            }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: theme.preview.blob1,
              boxShadow: `0 0 0 1px ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
            }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: theme.preview.blob2,
              boxShadow: `0 0 0 1px ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
            }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: theme.preview.primary,
              boxShadow: `0 0 0 1px ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
            }}
          />
          
          {/* RDL: Extra visual — glass + image indicator */}
          {isRDL && (
            <span 
              className="ml-auto text-[8px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(13, 148, 136, 0.10)',
                color: '#0D9488',
                border: '1px solid rgba(13, 148, 136, 0.20)',
              }}
            >
              Liquid Glass
            </span>
          )}
        </div>
        
        {/* Dark mode indicator (non-RDL themes) */}
        {theme.isDark && !isRDL && (
          <span 
            className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.preview.text,
            }}
          >
            Dark
          </span>
        )}
      </div>
    </motion.button>
  );
}
