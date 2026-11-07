import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { GymUser } from '@/types/database';

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
    id: 'rondesignlab',
    name: 'Liquid Glass',
    description: 'Premium frosted glass over vibrant fluid art',
    preview: {
      bg: '#E8F6F8',
      blob1: '#38BDF8',
      blob2: '#F59E0B',
      primary: '#0D9488',
      text: '#111111',
    },
    isDark: false,
  },
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
    name: 'Instagram Rose',
    description: 'Trendy rose gold & pink gradients',
    preview: {
      bg: '#FFF1F2',
      blob1: '#FB7185',
      blob2: '#F472B6',
      primary: '#E11D48',
      text: '#881337',
    },
    isDark: false,
  },
  {
    id: 'twitter',
    name: 'Twitter Blue',
    description: 'Clean sky blue & social vibes',
    preview: {
      bg: '#F0F9FF',
      blob1: '#38BDF8',
      blob2: '#818CF8',
      primary: '#0284C7',
      text: '#0C4A6E',
    },
    isDark: false,
  },
  {
    id: 'spotify',
    name: 'Spotify Mix',
    description: 'Energetic green & fresh composition',
    preview: {
      bg: '#F0FDF4',
      blob1: '#4ADE80',
      blob2: '#A3E635',
      primary: '#16A34A',
      text: '#14532D',
    },
    isDark: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok Viral',
    description: 'Modern monochrome with pop accents',
    preview: {
      bg: '#FAFAFA',
      blob1: '#F43F5E',
      blob2: '#2DD4BF',
      primary: '#171717',
      text: '#171717',
    },
    isDark: false,
  },
  {
    id: 'pearl',
    name: 'Pearl White',
    description: 'Elegant shimmering white & silver',
    preview: {
      bg: '#FFFFFF',
      blob1: '#E2E8F0',
      blob2: '#F1F5F9',
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
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'fitflow-theme'; // fast-paint cache read by index.html
const DEFAULT_THEME = 'rondesignlab'; // Liquid Glass is the default for every user

const isValidTheme = (id?: string | null): id is string =>
  !!id && themeConfigs.some((t) => t.id === id);

const userThemeKey = (userId: string) => `${THEME_STORAGE_KEY}:${userId}`;

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

// Theme is a per-USER preference:
//   logged out                -> Liquid Glass
//   user saved a theme (DB)   -> that theme
//   saved on this device only -> that theme (fallback if DB save failed)
//   never chosen              -> Liquid Glass
function resolveTheme(user: GymUser | null): string {
  if (!user) return DEFAULT_THEME;
  if (isValidTheme(user.theme)) return user.theme;
  const local = readLocal(userThemeKey(user.id));
  if (isValidTheme(local)) return local;
  return DEFAULT_THEME;
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
  
  // Update theme-color meta tag for PWA status bar/notch area
  const themeConfig = themeConfigs.find((t) => t.id === themeId) || themeConfigs[0];
  const bgColor = themeConfig.preview.bg;
  
  // Update theme-color meta tag
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', bgColor);
  
  // Update msapplication-TileColor for Windows
  let tileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]');
  if (!tileColorMeta) {
    tileColorMeta = document.createElement('meta');
    tileColorMeta.setAttribute('name', 'msapplication-TileColor');
    document.head.appendChild(tileColorMeta);
  }
  tileColorMeta.setAttribute('content', bgColor);
  
  // CRITICAL for iOS PWA: Ensure HTML and body background extends into safe areas
  root.style.setProperty('background-color', bgColor, 'important');
  document.body.style.setProperty('background-color', bgColor, 'important');
  
  // Update CSS variable for dynamic theming
  root.style.setProperty('--theme-bg', bgColor);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const userTheme = user?.theme ?? null;

  const [isSaving, setIsSaving] = useState(false);

  // Auth store is persisted synchronously, so the logged-in user's theme is
  // known on first render - apply it immediately to avoid a flash.
  const [themeId, setThemeIdState] = useState<string>(() => {
    const initial = resolveTheme(useAuthStore.getState().user);
    const cfg = themeConfigs.find((t) => t.id === initial)!;
    applyThemeToDocument(initial, cfg.isDark);
    return initial;
  });

  // Login / logout / switching accounts: follow the current user's preference
  useEffect(() => {
    const next = resolveTheme(useAuthStore.getState().user);
    setThemeIdState((prev) => (prev === next ? prev : next));
  }, [userId, userTheme]);

  const theme = themeConfigs.find((t) => t.id === themeId) || themeConfigs[0];

  // Apply to the document and keep the fast-paint cache in sync
  useEffect(() => {
    applyThemeToDocument(themeId, theme.isDark);
    writeLocal(THEME_STORAGE_KEY, themeId);
  }, [themeId, theme.isDark]);

  // setTheme: apply instantly, remember for this user, persist to DB in background
  const setTheme = useCallback(async (newThemeId: string) => {
    if (!isValidTheme(newThemeId)) return;

    setThemeIdState(newThemeId);

    const current = useAuthStore.getState().user;
    if (!current) return;

    writeLocal(userThemeKey(current.id), newThemeId);
    useAuthStore.getState().setUser({ ...current, theme: newThemeId });

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gym_users')
        .update({ theme: newThemeId })
        .eq('id', current.id);
      if (error) console.error('Failed to save theme preference:', error);
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme,
        setTheme,
        isDark: theme.isDark,
        isSaving,
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
