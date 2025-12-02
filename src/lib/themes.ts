// FitFlow Theme System - 5 Beautiful Themes with Glassmorphism & Animated Gradients

export interface ThemeColors {
  // Main background
  background: string;
  
  // Animated gradient blobs
  blob1: string;
  blob2: string;
  
  // Glass card surfaces
  cardBg: string;
  cardBorder: string;
  
  // Primary accent (buttons, active states)
  primary: string;
  primaryHover: string;
  primaryLight: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Sidebar/Navigation
  sidebarBg: string;
  sidebarActive: string;
  sidebarText: string;
  
  // Input fields
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  
  // Icon background colors (for dashboard cards)
  iconBg1: string;
  iconBg2: string;
  iconBg3: string;
  iconBg4: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    blob1: string;
    blob2: string;
    accent: string;
    card: string;
  };
  colors: ThemeColors;
}

// Theme 1: Default (Current) - Light Pastel with Mint & Coral
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Fresh Mint',
  description: 'Light & refreshing with mint green accents',
  preview: {
    bg: '#E0F2FE',
    blob1: '#6EE7B7',
    blob2: '#FCA5A5',
    accent: '#10b981',
    card: 'rgba(255, 255, 255, 0.6)',
  },
  colors: {
    background: '#E0F2FE',
    blob1: '#6EE7B7',
    blob2: '#FCA5A5',
    cardBg: 'rgba(255, 255, 255, 0.6)',
    cardBorder: 'rgba(255, 255, 255, 0.5)',
    primary: '#10b981',
    primaryHover: '#059669',
    primaryLight: 'rgba(16, 185, 129, 0.15)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    sidebarBg: 'rgba(255, 255, 255, 0.8)',
    sidebarActive: 'rgba(16, 185, 129, 0.15)',
    sidebarText: '#0f172a',
    inputBg: 'rgba(255, 255, 255, 0.6)',
    inputBorder: 'rgba(255, 255, 255, 0.4)',
    inputFocus: 'rgba(16, 185, 129, 0.5)',
    iconBg1: '#d1fae5',
    iconBg2: '#dbeafe',
    iconBg3: '#fef3c7',
    iconBg4: '#fce7f3',
  },
};

// Theme 2: Mocha Mousse - Warm Brown with Terracotta
export const mochaTheme: Theme = {
  id: 'mocha',
  name: 'Mocha Mousse',
  description: 'Warm & cozy with earthy brown tones',
  preview: {
    bg: '#1a1412',
    blob1: '#A47764',
    blob2: '#D4A574',
    accent: '#A47764',
    card: 'rgba(42, 32, 28, 0.7)',
  },
  colors: {
    background: '#1a1412',
    blob1: '#A47764',
    blob2: '#D4A574',
    cardBg: 'rgba(42, 32, 28, 0.7)',
    cardBorder: 'rgba(164, 119, 100, 0.3)',
    primary: '#A47764',
    primaryHover: '#8B6355',
    primaryLight: 'rgba(164, 119, 100, 0.2)',
    textPrimary: '#faf5f2',
    textSecondary: '#d4c4bc',
    textMuted: '#9a8a82',
    success: '#84cc16',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    sidebarBg: 'rgba(26, 20, 18, 0.95)',
    sidebarActive: 'rgba(164, 119, 100, 0.25)',
    sidebarText: '#faf5f2',
    inputBg: 'rgba(42, 32, 28, 0.8)',
    inputBorder: 'rgba(164, 119, 100, 0.4)',
    inputFocus: 'rgba(164, 119, 100, 0.6)',
    iconBg1: 'rgba(164, 119, 100, 0.3)',
    iconBg2: 'rgba(212, 165, 116, 0.3)',
    iconBg3: 'rgba(251, 191, 36, 0.2)',
    iconBg4: 'rgba(244, 114, 182, 0.2)',
  },
};

// Theme 3: Midnight Ocean - Deep Navy with Cyan
export const oceanTheme: Theme = {
  id: 'ocean',
  name: 'Midnight Ocean',
  description: 'Deep & calm with ocean blue vibes',
  preview: {
    bg: '#0a1628',
    blob1: '#0891b2',
    blob2: '#7c3aed',
    accent: '#06b6d4',
    card: 'rgba(14, 30, 52, 0.8)',
  },
  colors: {
    background: '#0a1628',
    blob1: '#0891b2',
    blob2: '#7c3aed',
    cardBg: 'rgba(14, 30, 52, 0.8)',
    cardBorder: 'rgba(6, 182, 212, 0.2)',
    primary: '#06b6d4',
    primaryHover: '#0891b2',
    primaryLight: 'rgba(6, 182, 212, 0.2)',
    textPrimary: '#f0f9ff',
    textSecondary: '#bae6fd',
    textMuted: '#7dd3fc',
    success: '#22d3ee',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#38bdf8',
    sidebarBg: 'rgba(10, 22, 40, 0.95)',
    sidebarActive: 'rgba(6, 182, 212, 0.2)',
    sidebarText: '#f0f9ff',
    inputBg: 'rgba(14, 30, 52, 0.9)',
    inputBorder: 'rgba(6, 182, 212, 0.3)',
    inputFocus: 'rgba(6, 182, 212, 0.6)',
    iconBg1: 'rgba(6, 182, 212, 0.2)',
    iconBg2: 'rgba(124, 58, 237, 0.2)',
    iconBg3: 'rgba(56, 189, 248, 0.2)',
    iconBg4: 'rgba(244, 114, 182, 0.2)',
  },
};

// Theme 4: Aurora Purple - Deep Purple with Violet
export const auroraTheme: Theme = {
  id: 'aurora',
  name: 'Aurora Purple',
  description: 'Vibrant & creative with purple hues',
  preview: {
    bg: '#13111a',
    blob1: '#8b5cf6',
    blob2: '#ec4899',
    accent: '#a855f7',
    card: 'rgba(30, 24, 44, 0.8)',
  },
  colors: {
    background: '#13111a',
    blob1: '#8b5cf6',
    blob2: '#ec4899',
    cardBg: 'rgba(30, 24, 44, 0.8)',
    cardBorder: 'rgba(139, 92, 246, 0.25)',
    primary: '#a855f7',
    primaryHover: '#9333ea',
    primaryLight: 'rgba(168, 85, 247, 0.2)',
    textPrimary: '#faf5ff',
    textSecondary: '#e9d5ff',
    textMuted: '#c4b5fd',
    success: '#a855f7',
    warning: '#fbbf24',
    error: '#f43f5e',
    info: '#e879f9',
    sidebarBg: 'rgba(19, 17, 26, 0.95)',
    sidebarActive: 'rgba(168, 85, 247, 0.2)',
    sidebarText: '#faf5ff',
    inputBg: 'rgba(30, 24, 44, 0.9)',
    inputBorder: 'rgba(139, 92, 246, 0.35)',
    inputFocus: 'rgba(168, 85, 247, 0.6)',
    iconBg1: 'rgba(139, 92, 246, 0.25)',
    iconBg2: 'rgba(236, 72, 153, 0.25)',
    iconBg3: 'rgba(251, 191, 36, 0.2)',
    iconBg4: 'rgba(56, 189, 248, 0.2)',
  },
};

// Theme 5: Pure AMOLED - True Black with Minimal Accents
export const amoledTheme: Theme = {
  id: 'amoled',
  name: 'Pure AMOLED',
  description: 'Minimal & clean true black design',
  preview: {
    bg: '#000000',
    blob1: '#22d3ee',
    blob2: '#a78bfa',
    accent: '#22d3ee',
    card: 'rgba(18, 18, 18, 0.9)',
  },
  colors: {
    background: '#000000',
    blob1: '#22d3ee',
    blob2: '#a78bfa',
    cardBg: 'rgba(18, 18, 18, 0.95)',
    cardBorder: 'rgba(63, 63, 70, 0.5)',
    primary: '#22d3ee',
    primaryHover: '#06b6d4',
    primaryLight: 'rgba(34, 211, 238, 0.15)',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    success: '#4ade80',
    warning: '#facc15',
    error: '#f87171',
    info: '#38bdf8',
    sidebarBg: 'rgba(0, 0, 0, 0.98)',
    sidebarActive: 'rgba(34, 211, 238, 0.15)',
    sidebarText: '#fafafa',
    inputBg: 'rgba(18, 18, 18, 0.95)',
    inputBorder: 'rgba(63, 63, 70, 0.6)',
    inputFocus: 'rgba(34, 211, 238, 0.5)',
    iconBg1: 'rgba(34, 211, 238, 0.15)',
    iconBg2: 'rgba(167, 139, 250, 0.15)',
    iconBg3: 'rgba(250, 204, 21, 0.15)',
    iconBg4: 'rgba(248, 113, 113, 0.15)',
  },
};

// All themes collection
export const themes: Theme[] = [
  defaultTheme,
  mochaTheme,
  oceanTheme,
  auroraTheme,
  amoledTheme,
];

// Get theme by ID
export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) || defaultTheme;
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Set CSS variables (matching the CSS theme file variable names)
  root.style.setProperty('--theme-bg', theme.colors.background);
  root.style.setProperty('--theme-blob-1', theme.colors.blob1);
  root.style.setProperty('--theme-blob-2', theme.colors.blob2);
  root.style.setProperty('--theme-card-bg', theme.colors.cardBg);
  root.style.setProperty('--theme-glass-bg', theme.colors.cardBg);
  root.style.setProperty('--theme-glass-border', theme.colors.cardBorder);
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-primary-light', theme.colors.primaryLight);
  root.style.setProperty('--theme-text-primary', theme.colors.textPrimary);
  root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
  root.style.setProperty('--theme-success', theme.colors.success);
  root.style.setProperty('--theme-warning', theme.colors.warning);
  root.style.setProperty('--theme-error', theme.colors.error);
  root.style.setProperty('--theme-info', theme.colors.info);
  root.style.setProperty('--theme-sidebar-bg', theme.colors.sidebarBg);
  root.style.setProperty('--theme-sidebar-active', theme.colors.sidebarActive);
  root.style.setProperty('--theme-sidebar-text', theme.colors.sidebarText);
  root.style.setProperty('--theme-input-bg', theme.colors.inputBg);
  root.style.setProperty('--theme-input-border', theme.colors.inputBorder);
  root.style.setProperty('--theme-input-focus', theme.colors.inputFocus);
  root.style.setProperty('--theme-icon-bg1', theme.colors.iconBg1);
  root.style.setProperty('--theme-icon-bg2', theme.colors.iconBg2);
  root.style.setProperty('--theme-icon-bg3', theme.colors.iconBg3);
  root.style.setProperty('--theme-icon-bg4', theme.colors.iconBg4);
  
  // Set theme class on body for additional styling
  document.body.setAttribute('data-theme', theme.id);
  
  // Store in localStorage
  localStorage.setItem('fitflow-theme', theme.id);
}

// Get stored theme ID
export function getStoredThemeId(): string {
  return localStorage.getItem('fitflow-theme') || 'default';
}

// Initialize theme on app load
export function initializeTheme(): Theme {
  const themeId = getStoredThemeId();
  const theme = getThemeById(themeId);
  applyTheme(theme);
  return theme;
}
