import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getThemeById, applyTheme as applyThemeColors } from '@/lib/themes';

// Theme definitions with metadata for UI display
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    blob1: string;
    blob2: string;
    primary: string;
    text: string;
  };
  isDark: boolean;
}

export const themeConfigs: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Sky Fresh',
    description: 'Light & refreshing with emerald accents',
    preview: {
      bg: '#E0F2FE',
      blob1: '#6EE7B7',
      blob2: '#FCA5A5',
      primary: '#10b981',
      text: '#0f172a',
    },
    isDark: false,
  },
  {
    id: 'mocha',
    name: 'Mocha Mousse',
    description: 'Warm & cozy with earthy tones',
    preview: {
      bg: '#F5EDE8',
      blob1: '#D4A574',
      blob2: '#E8C4A8',
      primary: '#A47764',
      text: '#3D2C24',
    },
    isDark: false,
  },
  {
    id: 'instagram',
    name: 'Instagram Sunset',
    description: 'Vibrant gradient like Instagram',
    preview: {
      bg: '#FFEEF8',
      blob1: '#E1306C',
      blob2: '#F77737',
      primary: '#C13584',
      text: '#262626',
    },
    isDark: false,
  },
  {
    id: 'twitter',
    name: 'Twitter Sky',
    description: 'Clean & modern Twitter blue',
    preview: {
      bg: '#E8F5FD',
      blob1: '#1D9BF0',
      blob2: '#8ECDF8',
      primary: '#1D9BF0',
      text: '#0F1419',
    },
    isDark: false,
  },
  {
    id: 'spotify',
    name: 'Spotify Pulse',
    description: 'Energetic green like Spotify',
    preview: {
      bg: '#121212',
      blob1: '#1ED760',
      blob2: '#1DB954',
      primary: '#1ED760',
      text: '#FFFFFF',
    },
    isDark: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok Vibe',
    description: 'Trendy cyan & pink like TikTok',
    preview: {
      bg: '#010101',
      blob1: '#25F4EE',
      blob2: '#FE2C55',
      primary: '#25F4EE',
      text: '#FFFFFF',
    },
    isDark: true,
  },
  {
    id: 'pearl',
    name: 'Frosted Pearl',
    description: 'Clean & futuristic with cool tones',
    preview: {
      bg: '#F8FAFC',
      blob1: '#94A3B8',
      blob2: '#CBD5E1',
      primary: '#64748B',
      text: '#1E293B',
    },
    isDark: false,
  },
  {
    id: 'ocean',
    name: 'Midnight Ocean',
    description: 'Deep & professional with cyan glow',
    preview: {
      bg: '#0F172A',
      blob1: '#0EA5E9',
      blob2: '#6366F1',
      primary: '#06B6D4',
      text: '#F1F5F9',
    },
    isDark: true,
  },
  {
    id: 'aurora',
    name: 'Aurora Purple',
    description: 'Vibrant & creative with purple magic',
    preview: {
      bg: '#13111C',
      blob1: '#A855F7',
      blob2: '#EC4899',
      primary: '#A855F7',
      text: '#FAF5FF',
    },
    isDark: true,
  },
  {
    id: 'amoled',
    name: 'Pure AMOLED',
    description: 'True black for battery saving',
    preview: {
      bg: '#000000',
      blob1: '#262626',
      blob2: '#171717',
      primary: '#FFFFFF',
      text: '#FAFAFA',
    },
    isDark: true,
  },
];

interface ThemeContextType {
  themeId: string;
  theme: ThemeConfig;
  setTheme: (themeId: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'haefit-theme';
const DEFAULT_THEME = 'default'; // Sky Fresh is the default theme

// Get gym-specific storage key
function getGymThemeKey(gymId: string | null): string {
  if (gymId) {
    return `${THEME_STORAGE_KEY}-${gymId}`;
  }
  return THEME_STORAGE_KEY;
}

// Get stored theme for a gym (or global fallback)
function getStoredTheme(gymId: string | null): string {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  // First try gym-specific theme
  if (gymId) {
    const gymTheme = localStorage.getItem(getGymThemeKey(gymId));
    if (gymTheme) return gymTheme;
  }
  
  // Fall back to default (Sky Fresh)
  return DEFAULT_THEME;
}

// Save theme for a gym
function saveTheme(gymId: string | null, themeId: string) {
  if (typeof window === 'undefined') return;
  
  if (gymId) {
    localStorage.setItem(getGymThemeKey(gymId), themeId);
  }
  // Also save as current active theme for initial load
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
}

// Apply theme synchronously (called immediately, not in useEffect)
function applyThemeToDocument(themeId: string, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  
  if (isDark) {
    root.classList.add('dark-theme');
  } else {
    root.classList.remove('dark-theme');
  }
  
  // Apply CSS variables from themes.ts
  const themeColors = getThemeById(themeId);
  applyThemeColors(themeColors);
  
  // CRITICAL: Keep theme-color transparent for mobile status bar
  // This allows the gradient blobs to show through naturally
  // The gradient is rendered by the page content (blobs at top: -10%)
  const themeConfig = themeConfigs.find(t => t.id === themeId);
  if (themeConfig) {
    // Always use transparent to let gradient content show through
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', 'transparent');
    }
    
    // Update Apple-specific meta tag - always use black-translucent
    // This overlays status bar icons on top of our gradient content
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute('content', 'black-translucent');
    }
    
    // Update msapplication-TileColor with theme blob color for Windows tiles
    let msTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
    if (msTileColor) {
      msTileColor.setAttribute('content', themeConfig.preview.blob1);
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { gym } = useAuthStore();
  const gymId = gym?.id || null;
  
  // Track previous gymId to detect changes
  const [prevGymId, setPrevGymId] = useState<string | null>(null);
  
  const [themeId, setThemeIdState] = useState<string>(() => {
    // Get from localStorage or default - initially use global theme
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
      // Apply theme immediately during initialization to prevent flicker
      const savedThemeConfig = themeConfigs.find((t) => t.id === savedTheme) || themeConfigs[0];
      applyThemeToDocument(savedTheme, savedThemeConfig.isDark);
      return savedTheme;
    }
    return DEFAULT_THEME;
  });

  // When gym changes, load their specific theme (using render-time check)
  if (gymId !== prevGymId) {
    setPrevGymId(gymId);
    const gymTheme = getStoredTheme(gymId);
    if (gymTheme !== themeId) {
      setThemeIdState(gymTheme);
    }
  }

  const theme = themeConfigs.find((t) => t.id === themeId) || themeConfigs[0];

  // Apply theme to document when it changes
  useEffect(() => {
    applyThemeToDocument(themeId, theme.isDark);
  }, [themeId, theme.isDark]);

  const setTheme = (newThemeId: string) => {
    const exists = themeConfigs.find((t) => t.id === newThemeId);
    if (exists) {
      setThemeIdState(newThemeId);
      saveTheme(gymId, newThemeId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme,
        setTheme,
        isDark: theme.isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get a specific theme by ID
export function useThemeConfig(id: string): ThemeConfig | undefined {
  return themeConfigs.find((t) => t.id === id);
}
