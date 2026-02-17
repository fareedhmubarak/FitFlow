import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import LiquidGlass from 'liquid-glass-react';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Padding inside the glass container */
  padding?: string;
  /** Corner radius (default 24px) */
  cornerRadius?: number;
  /** Glass blur intensity (default 0.0625 = subtle) */
  blurAmount?: number;
  /** Color saturation (default 140) */
  saturation?: number;
  /** Displacement/refraction intensity (default 50) */
  displacementScale?: number;
  /** Chromatic aberration (default 1.5) */
  aberrationIntensity?: number;
  /** Elasticity / "liquid" feel (default 0.12) */
  elasticity?: number;
  /** Click handler */
  onClick?: () => void;
  /** Mouse container ref for tracking */
  mouseContainer?: React.RefObject<HTMLElement | null>;
}

/**
 * LiquidGlassCard — Wraps content in Apple's Liquid Glass effect
 * Only active when the "rondesignlab" (Liquid Glass) theme is selected.
 * Falls back to a standard frosted glass CSS card for other themes.
 */
export default function LiquidGlassCard({
  children,
  className = '',
  style,
  padding = '0px',
  cornerRadius = 24,
  blurAmount = 0.0625,
  saturation = 140,
  displacementScale = 50,
  aberrationIntensity = 1.5,
  elasticity = 0.12,
  onClick,
  mouseContainer,
}: LiquidGlassCardProps) {
  const { themeId } = useTheme();
  const isLiquidGlass = themeId === 'rondesignlab';

  // Only render the liquid glass effect for the RDL theme
  if (isLiquidGlass) {
    return (
      <LiquidGlass
        overLight={true}
        displacementScale={displacementScale}
        blurAmount={blurAmount}
        saturation={saturation}
        aberrationIntensity={aberrationIntensity}
        elasticity={elasticity}
        cornerRadius={cornerRadius}
        padding={padding}
        className={`rdl-liquid-card ${className}`}
        style={{
          ...style,
        }}
        onClick={onClick}
        mouseContainer={mouseContainer}
      >
        {children}
      </LiquidGlass>
    );
  }

  // Fallback: standard glass card (for non-RDL themes or if library fails)
  return (
    <div
      className={`rdl-glass-fallback ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.70)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        borderRadius: `${cornerRadius}px`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
        padding,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
