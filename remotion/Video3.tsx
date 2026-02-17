/**
 * Video3.tsx — Cinematic Promo Video for Haefit
 * ──────────────────────────────────────────────
 * 60-second (1800 frames @ 30fps) portrait promo video
 * using the RDL Liquid Glass theme from the actual app.
 *
 * Scene Flow:
 *   1. Hook       (0-5s)    — "Still managing with pen & paper?"
 *   2. Pain       (5-10s)   — Three pain points
 *   3. Reveal     (10-15s)  — Dark→Light transition, Haefit intro
 *   4. Dashboard  (15-22s)  — Glass stat cards, member list
 *   5. Members    (22-28s)  — Grid view, search, filters
 *   6. Calendar   (28-34s)  — Month view with payment indicators
 *   7. Payments   (34-40s)  — Collection stats & records
 *   8. Montage    (40-48s)  — 7 extra features rapid showcase
 *   9. Closing    (48-54s)  — Emotional close + stats
 *  10. CTA        (54-60s)  — "Try Free Today"
 */

import React, { useEffect, useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const FONT_FAMILY = 'Urbanist, system-ui, -apple-system, sans-serif';
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap';

/** RDL Liquid Glass Theme — exact colors from src/lib/themes.ts */
const C = {
  bg: '#E8F6F8',
  blob1: '#38BDF8',
  blob2: '#F59E0B',
  primary: '#0D9488',
  primaryHover: '#0F766E',
  primaryLight: '#CCFBF1',
  cardBg: 'rgba(255, 255, 255, 0.50)',
  cardBorder: 'rgba(255, 255, 255, 0.35)',
  textPrimary: '#111111',
  textSecondary: '#3a3a3a',
  textMuted: '#7a7a7a',
  success: '#45C461',
  warning: '#F5A623',
  error: '#FF5557',
  dark: '#0A0F1A',
  darkText: '#E2E8F0',
  darkMuted: '#94A3B8',
  white: '#FFFFFF',
  gradientEnd: '#059669',
} as const;

/** Scene frame map (30 fps, 1800 total) */
const S = {
  hook:      { from: 0,    dur: 150 },
  pain:      { from: 150,  dur: 150 },
  reveal:    { from: 300,  dur: 150 },
  dashboard: { from: 450,  dur: 210 },
  members:   { from: 660,  dur: 180 },
  calendar:  { from: 840,  dur: 180 },
  payments:  { from: 1020, dur: 180 },
  montage:   { from: 1200, dur: 240 },
  closing:   { from: 1440, dur: 150 },
  cta:       { from: 1590, dur: 210 },
} as const;

/** Demo data — realistic Indian gym */
const DEMO = {
  members: [
    { name: 'Rahul S.', plan: '3M', color: '#38BDF8', paid: true },
    { name: 'Priya R.', plan: '1M', color: '#EC4899', paid: false },
    { name: 'Arjun P.', plan: '6M', color: '#0D9488', paid: true },
    { name: 'Sneha N.', plan: '1M', color: '#F59E0B', paid: true },
    { name: 'Vikram S.', plan: '3M', color: '#8B5CF6', paid: false },
    { name: 'Anil K.', plan: '1M', color: '#F97316', paid: true },
    { name: 'Kavitha R.', plan: '3M', color: '#06B6D4', paid: true },
    { name: 'Ravi T.', plan: '6M', color: '#10B981', paid: false },
  ],
};

// ════════════════════════════════════════════════════════════════
// HOOKS & HELPERS
// ════════════════════════════════════════════════════════════════

const CLAMP = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const useFontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = FONT_URL;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
};

const fi = (f: number, start: number, dur = 20) =>
  dur <= 0 ? 1 : interpolate(f, [start, start + dur], [0, 1], CLAMP);

const fo = (f: number, start: number, dur = 20) =>
  dur <= 0 ? 1 : interpolate(f, [start, start + dur], [1, 0], CLAMP);

const slideY = (f: number, start: number, dist = 50, dur = 22) =>
  interpolate(f, [start, start + dur], [dist, 0], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });

const slideX = (f: number, start: number, dist = 60, dur = 22) =>
  interpolate(f, [start, start + dur], [dist, 0], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });

const pop = (f: number, fps: number, delay = 0) =>
  spring({
    frame: Math.max(0, f - delay),
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });

/** Fade-in at start + fade-out at end of scene */
const envelope = (f: number, dur: number, inDur = 15, outDur = 18) =>
  Math.min(fi(f, 0, inDur), fo(f, dur - outDur, outDur));

// ════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════

/* Floating ambient particles */
const Particles: React.FC<{
  frame: number;
  count?: number;
  color?: string;
  speed?: number;
}> = ({ frame, count = 18, color = 'rgba(255,255,255,0.25)', speed = 1 }) => {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i * 53 + 17) % 100,
        y: (i * 71 + 31) % 100,
        r: 2 + (i % 4) * 2,
        d: i * 7,
        drift: ((i % 3) - 1) * 0.3,
      })),
    [count],
  );
  return (
    <>
      {dots.map((p, i) => {
        const y = ((p.y - ((frame + p.d) * 0.15 * speed) % 130) + 130) % 130 - 15;
        const x = p.x + Math.sin((frame + p.d) * 0.02) * 4 * p.drift;
        const o = interpolate(y, [-10, 8, 95, 115], [0, 0.55, 0.55, 0], CLAMP);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: p.r,
              height: p.r,
              borderRadius: '50%',
              background: color,
              opacity: o,
            }}
          />
        );
      })}
    </>
  );
};

/* Animated liquid-glass gradient (three pulsating blobs on #E8F6F8) */
const LiquidBG: React.FC<{ frame: number }> = ({ frame }) => {
  const b1x = 30 + Math.sin(frame * 0.014) * 14;
  const b1y = 25 + Math.cos(frame * 0.011) * 12;
  const b2x = 70 + Math.cos(frame * 0.017) * 12;
  const b2y = 72 + Math.sin(frame * 0.013) * 14;
  const b3x = 50 + Math.sin(frame * 0.01) * 18;
  const b3y = 48 + Math.cos(frame * 0.015) * 16;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: `${b1x}%`,
          top: `${b1y}%`,
          width: '55%',
          height: '55%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blob1}40, transparent 70%)`,
          transform: 'translate(-50%,-50%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${b2x}%`,
          top: `${b2y}%`,
          width: '48%',
          height: '48%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blob2}35, transparent 70%)`,
          transform: 'translate(-50%,-50%)',
          filter: 'blur(36px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${b3x}%`,
          top: `${b3y}%`,
          width: '42%',
          height: '42%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.primary}22, transparent 65%)`,
          transform: 'translate(-50%,-50%)',
          filter: 'blur(32px)',
        }}
      />
    </div>
  );
};

/* Frosted glass card */
const Glass: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: C.cardBg,
      borderRadius: 16,
      border: `1px solid ${C.cardBorder}`,
      padding: '12px 16px',
      ...style,
    }}
  >
    {children}
  </div>
);

// ════════════════════════════════════════════════════════════════
// SVG ICON LIBRARY  (no emojis — clean vector icons)
// ════════════════════════════════════════════════════════════════

const Icon = {
  grid: (s = 24, c = C.primary) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={c} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={c} opacity={0.55} />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={c} opacity={0.55} />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={c} />
    </svg>
  ),
  people: (s = 24, c = C.primary) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill={c} />
      <path d="M2.5 20v-1.5A5 5 0 0 1 7 14h4a5 5 0 0 1 4.5 4.5V20" fill={c} opacity={0.5} />
      <circle cx="17" cy="9" r="2.5" fill={c} opacity={0.45} />
      <path d="M17.5 14h.5a3.5 3.5 0 0 1 3.5 3.5V20" stroke={c} strokeWidth="1.5" opacity={0.4} />
    </svg>
  ),
  cal: (s = 24, c = C.primary) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" fill={c} opacity={0.12} stroke={c} strokeWidth="1.5" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.5" fill={c} />
      <circle cx="12" cy="15" r="1.5" fill={c} opacity={0.5} />
      <circle cx="16" cy="15" r="1.5" fill={c} />
    </svg>
  ),
  rupee: (s = 24, c = C.primary) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h10M7 8h10M7 4c0 4 3 8 8 12M7 4c0 6 3 10 8 14"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  qr: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={c} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={c} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={c} />
      <rect x="14" y="14" width="4" height="4" rx="1" fill={c} />
      <rect x="20" y="14" width="1" height="4" fill={c} />
      <rect x="14" y="20" width="7" height="1" fill={c} />
    </svg>
  ),
  staff: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" fill={c} />
      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" fill={c} opacity={0.5} />
    </svg>
  ),
  funnel: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 4h18l-3 7H6L3 4z" fill={c} opacity={0.3} />
      <path d="M6 11h12l-2 5H8L6 11z" fill={c} opacity={0.6} />
      <path d="M8 16h8l-1 4H9L8 16z" fill={c} />
    </svg>
  ),
  chart: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <polyline
        points="3,18 8,12 13,15 21,5"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="5" r="2" fill={c} />
    </svg>
  ),
  bar: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1" fill={c} opacity={0.4} />
      <rect x="10" y="6" width="4" height="15" rx="1" fill={c} opacity={0.7} />
      <rect x="17" y="2" width="4" height="19" rx="1" fill={c} />
    </svg>
  ),
  globe: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={c} strokeWidth="1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={c} strokeWidth="1.5" />
    </svg>
  ),
  phone: (s = 24, c = C.white) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke={c} strokeWidth="2" />
      <line x1="10" y1="19" x2="14" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// ════════════════════════════════════════════════════════════════
// PHONE MOCKUP  (premium frame with Dynamic Island + shine)
// ════════════════════════════════════════════════════════════════

const PHONE_W = 380;
const PHONE_H = 760;

const PhoneMockup: React.FC<{
  children: React.ReactNode;
  frame: number;
  fps: number;
  enterDelay?: number;
  perspective?: boolean;
  style?: React.CSSProperties;
}> = ({ children, frame, fps, enterDelay = 0, perspective, style }) => {
  const sc = spring({
    frame: Math.max(0, frame - enterDelay),
    fps,
    from: 0.82,
    to: 1,
    config: { damping: 14, stiffness: 70 },
  });
  const op = fi(frame, enterDelay, 15);
  const yOff = spring({
    frame: Math.max(0, frame - enterDelay),
    fps,
    from: 120,
    to: 0,
    config: { damping: 14, stiffness: 55 },
  });

  const tiltY = perspective ? Math.sin(frame * 0.007) * 2 : 0;
  const tiltX = perspective ? Math.cos(frame * 0.005) * 1.2 : 0;

  // diagonal shine streak
  const shineX = interpolate(frame % 180, [0, 180], [-60, 140], CLAMP);

  return (
    <div
      style={{
        position: 'relative',
        width: PHONE_W,
        height: PHONE_H,
        opacity: op,
        transform: `translateY(${yOff}px) scale(${sc}) perspective(1200px) rotateY(${tiltY}deg) rotateX(${tiltX}deg)`,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* shadow */}
      <div
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: 50,
          background: 'rgba(0,0,0,0.18)',
          filter: 'blur(22px)',
          transform: 'translateY(10px)',
        }}
      />
      {/* body */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 42,
          background: '#1A1A1A',
          padding: 8,
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* screen area */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 34,
            overflow: 'hidden',
            position: 'relative',
            background: C.bg,
          }}
        >
          {children}

          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 96,
              height: 26,
              borderRadius: 20,
              background: '#000',
              zIndex: 20,
            }}
          />
          {/* status bar */}
          <div
            style={{
              position: 'absolute',
              top: 7,
              left: 22,
              right: 22,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: C.textPrimary,
              fontFamily: FONT_FAMILY,
              zIndex: 21,
            }}
          >
            <span>9:41</span>
            <span style={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 9 }}>
              5G ●●●●
            </span>
          </div>
        </div>
        {/* shine overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 42,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-100%',
              left: `${shineX}%`,
              width: '35%',
              height: '300%',
              background:
                'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
              transform: 'rotate(18deg)',
            }}
          />
        </div>
      </div>
      {/* side buttons */}
      <div
        style={{
          position: 'absolute',
          right: -2,
          top: 130,
          width: 3,
          height: 36,
          background: '#333',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -2,
          top: 185,
          width: 3,
          height: 36,
          background: '#333',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -2,
          top: 155,
          width: 3,
          height: 55,
          background: '#333',
          borderRadius: '2px 0 0 2px',
        }}
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SCREEN RECREATIONS  (RDL Liquid Glass, miniature)
// ════════════════════════════════════════════════════════════════

/* ── Dashboard ── */
const ScreenDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      {/* blobs */}
      <div style={{ position: 'absolute', top: '8%', left: '15%', width: 160, height: 160, borderRadius: '50%', background: `${C.blob1}28`, filter: 'blur(36px)' }} />
      <div style={{ position: 'absolute', bottom: '18%', right: '8%', width: 140, height: 140, borderRadius: '50%', background: `${C.blob2}22`, filter: 'blur(30px)' }} />

      {/* header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.gradientEnd})`,
          padding: '46px 18px 18px',
          borderRadius: '0 0 22px 22px',
        }}
      >
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Good Morning 👋</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>FitZone Gym</div>
      </div>

      {/* 3 stat cards */}
      <div style={{ display: 'flex', gap: 7, padding: '14px 12px 6px' }}>
        {[
          { lbl: 'Till Today', val: '₹45,500', sub: '67 members' },
          { lbl: 'Today', val: '8', sub: '3 paid' },
          { lbl: 'Tomorrow', val: '5', sub: 'upcoming' },
        ].map((c, i) => {
          const s = pop(frame, fps, 6 + i * 5);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: C.cardBg,
                borderRadius: 13,
                padding: '10px 8px',
                border: `1px solid ${C.cardBorder}`,
                textAlign: 'center',
                transform: `scale(${s})`,
              }}
            >
              <div style={{ fontSize: 8, color: C.textMuted, fontWeight: 500 }}>{c.lbl}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.primary, marginTop: 1 }}>{c.val}</div>
              <div style={{ fontSize: 7, color: C.textMuted }}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Due Today list */}
      <div style={{ padding: '6px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Due Today</div>
        {DEMO.members.slice(0, 4).map((m, i) => {
          const d = 18 + i * 5;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                marginBottom: 5,
                background: C.cardBg,
                borderRadius: 11,
                border: `1px solid ${C.cardBorder}`,
                opacity: fi(frame, d, 10),
                transform: `translateX(${slideX(frame, d, 24, 14)}px)`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}99)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {m.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary }}>{m.name}</div>
                <div style={{ fontSize: 8, color: C.textMuted }}>{m.plan} Plan</div>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: C.primary,
                  background: C.primaryLight,
                  padding: '2px 7px',
                  borderRadius: 7,
                }}
              >
                ₹1,500
              </div>
            </div>
          );
        })}
      </div>

      {/* bottom nav */}
      <BottomNav active={0} />
    </div>
  );
};

/* ── Members ── */
const ScreenMembers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '5%', right: '8%', width: 120, height: 120, borderRadius: '50%', background: `${C.blob1}22`, filter: 'blur(28px)' }} />
      <div style={{ position: 'absolute', bottom: '25%', left: '5%', width: 110, height: 110, borderRadius: '50%', background: `${C.blob2}18`, filter: 'blur(24px)' }} />

      <div style={{ padding: '46px 14px 8px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary }}>Members</div>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 7, padding: '0 14px 8px' }}>
        {[
          { lbl: 'Active', val: '134', clr: C.success },
          { lbl: 'Inactive', val: '5', clr: C.error },
          { lbl: 'Total', val: '139', clr: C.primary },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: C.cardBg,
              borderRadius: 10,
              padding: 7,
              border: `1px solid ${C.cardBorder}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: s.clr }}>{s.val}</div>
            <div style={{ fontSize: 7, color: C.textMuted }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* search */}
      <div style={{ padding: '0 14px 8px' }}>
        <div
          style={{
            background: C.cardBg,
            borderRadius: 10,
            padding: '8px 12px',
            border: `1px solid ${C.cardBorder}`,
            fontSize: 10,
            color: C.textMuted,
          }}
        >
          🔍 Search members...
        </div>
      </div>

      {/* filter pills */}
      <div style={{ display: 'flex', gap: 5, padding: '0 14px 8px' }}>
        {['All', '1M', '3M', '6M', '12M'].map((f, i) => (
          <div
            key={i}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: 9,
              fontWeight: 600,
              background: i === 0 ? C.primary : C.cardBg,
              color: i === 0 ? C.white : C.textSecondary,
              border: `1px solid ${i === 0 ? C.primary : C.cardBorder}`,
            }}
          >
            {f}
          </div>
        ))}
      </div>

      {/* member grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 14px' }}>
        {DEMO.members.slice(0, 6).map((m, i) => {
          const s = pop(frame, fps, 4 + i * 3);
          return (
            <div
              key={i}
              style={{
                width: 'calc(50% - 4px)',
                background: C.cardBg,
                borderRadius: 13,
                padding: '12px 8px',
                border: `1px solid ${C.cardBorder}`,
                textAlign: 'center',
                transform: `scale(${s})`,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`,
                  margin: '0 auto 5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.white,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {m.name[0]}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textPrimary }}>{m.name}</div>
              <div
                style={{
                  display: 'inline-block',
                  marginTop: 3,
                  fontSize: 7,
                  padding: '1.5px 7px',
                  borderRadius: 7,
                  background: m.paid ? `${C.success}20` : `${C.warning}20`,
                  color: m.paid ? C.success : C.warning,
                  fontWeight: 600,
                }}
              >
                {m.plan} Plan
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav active={1} />
    </div>
  );
};

/* ── Calendar ── */
const ScreenCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paid = [1, 3, 5, 8, 12, 15, 18, 21, 25];
  const overdue = [2, 7, 10, 14, 20, 23, 27];
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '12%', left: '12%', width: 130, height: 130, borderRadius: '50%', background: `${C.blob1}20`, filter: 'blur(28px)' }} />

      <div style={{ padding: '46px 14px 6px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary }}>Calendar</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>February 2026</div>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 14px' }}>
        {[
          { lbl: 'Active', v: '134', clr: C.primary },
          { lbl: 'Paid', v: '67', clr: C.success },
          { lbl: 'Unpaid', v: '62', clr: C.error },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: C.cardBg,
              borderRadius: 9,
              padding: '5px 6px',
              border: `1px solid ${C.cardBorder}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: s.clr }}>{s.v}</div>
            <div style={{ fontSize: 7, color: C.textMuted }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* calendar grid */}
      <div style={{ padding: '6px 14px' }}>
        <Glass style={{ padding: 8 }}>
          <div style={{ display: 'flex', marginBottom: 4 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 7, fontWeight: 600, color: C.textMuted }}>
                {d}
              </div>
            ))}
          </div>
          {[0, 1, 2, 3].map((w) => (
            <div key={w} style={{ display: 'flex', marginBottom: 3 }}>
              {Array.from({ length: 7 }, (_, di) => {
                const day = w * 7 + di + 1;
                if (day > 28) return <div key={di} style={{ flex: 1 }} />;
                const isPaid = paid.includes(day);
                const isOver = overdue.includes(day);
                const cs = pop(frame, fps, 8 + day * 0.7);
                return (
                  <div
                    key={di}
                    style={{
                      flex: 1,
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 7,
                      transform: `scale(${cs})`,
                      background: isPaid ? `${C.success}14` : isOver ? `${C.error}10` : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.textPrimary }}>{day}</div>
                    {(isPaid || isOver) && (
                      <div
                        style={{
                          width: 3.5,
                          height: 3.5,
                          borderRadius: '50%',
                          background: isPaid ? C.success : C.error,
                          marginTop: 1,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Glass>
      </div>

      <BottomNav active={2} />
    </div>
  );
};

/* ── Payments ── */
const ScreenPayments: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: '22%', right: '5%', width: 130, height: 130, borderRadius: '50%', background: `${C.blob2}18`, filter: 'blur(28px)' }} />

      <div style={{ padding: '46px 14px 6px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary }}>Payments</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>February 2026</div>
      </div>

      {/* stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '6px 14px' }}>
        {[
          { lbl: 'This Month', val: '₹1,13,500', clr: C.primary },
          { lbl: 'Collected', val: '₹45,500', clr: C.success },
          { lbl: 'On Time', val: '52', clr: C.primary },
          { lbl: 'Late', val: '15', clr: C.warning },
        ].map((c, i) => {
          const s = pop(frame, fps, 4 + i * 4);
          return (
            <div
              key={i}
              style={{
                width: 'calc(50% - 4px)',
                background: C.cardBg,
                borderRadius: 13,
                padding: 10,
                border: `1px solid ${C.cardBorder}`,
                transform: `scale(${s})`,
              }}
            >
              <div style={{ fontSize: 7, color: C.textMuted, fontWeight: 500 }}>{c.lbl}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: c.clr, marginTop: 3 }}>{c.val}</div>
            </div>
          );
        })}
      </div>

      {/* recent payments */}
      <div style={{ padding: '6px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Recent Payments</div>
        {DEMO.members
          .filter((m) => m.paid)
          .slice(0, 4)
          .map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 5,
                background: C.cardBg,
                borderRadius: 11,
                border: `1px solid ${C.cardBorder}`,
                opacity: fi(frame, 22 + i * 4, 10),
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {m.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textPrimary }}>{m.name}</div>
                <div style={{ fontSize: 7, color: C.textMuted }}>UPI • {m.plan} Plan</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.success }}>₹1,500</div>
            </div>
          ))}
      </div>

      <BottomNav active={3} />
    </div>
  );
};

/* ── Shared bottom nav strip ── */
const BottomNav: React.FC<{ active: number }> = ({ active }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 50,
      background: 'rgba(255,255,255,0.72)',
      borderTop: `1px solid ${C.cardBorder}`,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 4,
    }}
  >
    {['Home', 'Members', 'Calendar', 'Payments', 'Settings'].map((lbl, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 5,
            background: i === active ? C.primary : 'transparent',
            opacity: i === active ? 1 : 0.35,
          }}
        />
        <span
          style={{
            fontSize: 6,
            fontWeight: i === active ? 700 : 400,
            color: i === active ? C.primary : C.textMuted,
            fontFamily: FONT_FAMILY,
          }}
        >
          {lbl}
        </span>
      </div>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════════
// SCENES
// ════════════════════════════════════════════════════════════════

/* ─── Scene 1: Hook ─── (0-5 s) */
const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const env = envelope(f, S.hook.dur);
  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: FONT_FAMILY, opacity: env }}>
      <Particles frame={f} color="rgba(56,189,248,0.12)" count={14} speed={0.5} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: C.darkText,
            textAlign: 'center',
            lineHeight: 1.25,
            opacity: fi(f, 10, 20),
            transform: `translateY(${slideY(f, 10, 36)}px)`,
          }}
        >
          Still managing your gym
        </div>
        <div
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: C.blob1,
            textAlign: 'center',
            lineHeight: 1.25,
            opacity: fi(f, 38, 20),
            transform: `translateY(${slideY(f, 38, 36)}px)`,
          }}
        >
          with pen &amp; paper?
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 2: Pain Points ─── (5-10 s) */
const ScenePain: React.FC = () => {
  const f = useCurrentFrame();
  const env = envelope(f, S.pain.dur);
  const pains = [
    { text: 'Missed payments drain revenue', delay: 12 },
    { text: 'Member records scattered everywhere', delay: 34 },
    { text: 'Zero insights into your business', delay: 56 },
  ];
  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: FONT_FAMILY, opacity: env }}>
      <Particles frame={f} color="rgba(255,85,87,0.10)" count={10} speed={0.3} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 48px',
          gap: 32,
        }}
      >
        {pains.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              opacity: fi(f, p.delay, 14),
              transform: `translateX(${slideX(f, p.delay, 50, 18)}px)`,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `${C.error}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <line x1="4" y1="4" x2="14" y2="14" stroke={C.error} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="14" y1="4" x2="4" y2="14" stroke={C.error} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: 26, fontWeight: 600, color: C.darkText, lineHeight: 1.35 }}>
              {p.text}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 3: Reveal (dark → liquid glass) ─── (10-15 s) */
const SceneReveal: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const env = envelope(f, S.reveal.dur, 12, 18);

  const bg = interpolate(f, [0, 45], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const logoSc = spring({ frame: Math.max(0, f - 25), fps, from: 0, to: 1, config: { damping: 10, stiffness: 80 } });
  const nameOp = fi(f, 50, 18);
  const nameY = slideY(f, 50, 28, 18);
  const tagOp = fi(f, 72, 18);
  const tagY = slideY(f, 72, 20, 16);

  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, opacity: env }}>
      <div style={{ position: 'absolute', inset: 0, background: C.dark, opacity: 1 - bg }} />
      <div style={{ position: 'absolute', inset: 0, opacity: bg }}>
        <LiquidBG frame={f} />
      </div>
      <Particles frame={f} color={bg > 0.5 ? `${C.primary}28` : 'rgba(56,189,248,0.14)'} count={16} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        {/* logo */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.primary}, ${C.gradientEnd})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${logoSc})`,
            boxShadow: `0 20px 60px ${C.primary}40`,
          }}
        >
          <span style={{ fontSize: 50, fontWeight: 900, color: C.white }}>H</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: bg > 0.5 ? C.textPrimary : C.white,
            letterSpacing: -1,
            opacity: nameOp,
            transform: `translateY(${nameY}px)`,
          }}
        >
          Haefit
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: bg > 0.5 ? C.textSecondary : C.darkMuted,
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
          }}
        >
          Your Gym. Simplified.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Feature Scene wrapper ─── */
interface FeatureProps {
  Screen: React.FC;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  dur: number;
}

const FeatureScene: React.FC<FeatureProps> = ({ Screen, title, subtitle, icon, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const env = envelope(f, dur);
  const titleOp = fi(f, 8, 14);
  const titleY = slideY(f, 8, 22, 14);
  const subOp = fi(f, 20, 14);

  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, opacity: env }}>
      <LiquidBG frame={f} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '55px 36px 36px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 6,
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {icon}
          <span style={{ fontSize: 34, fontWeight: 800, color: C.textPrimary }}>{title}</span>
        </div>
        <div style={{ fontSize: 17, color: C.textSecondary, marginBottom: 28, opacity: subOp, textAlign: 'center' }}>
          {subtitle}
        </div>
        <PhoneMockup frame={f} fps={fps} enterDelay={12} perspective>
          <Screen />
        </PhoneMockup>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 8: Feature Montage ─── (40-48 s) */
const SceneMontage: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const env = envelope(f, S.montage.dur);

  const features = [
    { icon: Icon.qr(32, C.white), lbl: 'QR Check-In', desc: 'Instant entry tracking', clr: '#0D9488' },
    { icon: Icon.staff(32, C.white), lbl: 'Staff Manager', desc: 'Roles & permissions', clr: '#8B5CF6' },
    { icon: Icon.funnel(32, C.white), lbl: 'Lead Pipeline', desc: 'Convert prospects', clr: '#F59E0B' },
    { icon: Icon.chart(32, C.white), lbl: 'Progress Track', desc: 'Body measurements', clr: '#EC4899' },
    { icon: Icon.bar(32, C.white), lbl: 'Analytics', desc: 'Revenue reports', clr: '#38BDF8' },
    { icon: Icon.globe(32, C.white), lbl: '4 Languages', desc: 'EN · HI · TE · TA', clr: '#10B981' },
    { icon: Icon.phone(32, C.white), lbl: 'Install as App', desc: 'Works like native', clr: '#F97316' },
  ];

  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, opacity: env }}>
      <LiquidBG frame={f} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '70px 36px',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: C.textPrimary,
            marginBottom: 6,
            opacity: fi(f, 6, 14),
            transform: `translateY(${slideY(f, 6, 22)}px)`,
            textAlign: 'center',
          }}
        >
          And So Much More
        </div>
        <div
          style={{
            fontSize: 17,
            color: C.textSecondary,
            marginBottom: 36,
            opacity: fi(f, 16, 14),
            textAlign: 'center',
          }}
        >
          Everything your gym needs — in one app
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 640 }}>
          {features.map((ft, i) => {
            const delay = 22 + i * 14;
            const s = pop(f, fps, delay);
            const op = fi(f, delay, 10);
            return (
              <div
                key={i}
                style={{
                  width: 280,
                  padding: '20px 18px',
                  background: C.cardBg,
                  borderRadius: 18,
                  border: `1px solid ${C.cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transform: `scale(${s})`,
                  opacity: op,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${ft.clr}, ${ft.clr}BB)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 6px 20px ${ft.clr}30`,
                  }}
                >
                  {ft.icon}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary }}>{ft.lbl}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{ft.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 9: Closing ─── (48-54 s) */
const SceneClosing: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const env = envelope(f, S.closing.dur);

  const stats = [
    { v: '15+', l: 'Features' },
    { v: '4', l: 'Languages' },
    { v: 'PWA', l: 'Install' },
    { v: '∞', l: 'Members' },
  ];

  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY, opacity: env }}>
      <LiquidBG frame={f} />
      <Particles frame={f} color={`${C.primary}22`} count={20} speed={0.4} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 50px',
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: C.textPrimary,
            textAlign: 'center',
            lineHeight: 1.2,
            opacity: fi(f, 12, 18),
            transform: `translateY(${slideY(f, 12, 32)}px)`,
          }}
        >
          Focus on training.
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: C.primary,
            textAlign: 'center',
            lineHeight: 1.2,
            opacity: fi(f, 36, 18),
            transform: `translateY(${slideY(f, 36, 32)}px)`,
          }}
        >
          We handle the rest.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 36, opacity: fi(f, 58, 18) }}>
          {stats.map((st, i) => {
            const s = pop(f, fps, 62 + i * 7);
            return (
              <div
                key={i}
                style={{
                  width: 108,
                  padding: '18px 10px',
                  background: C.cardBg,
                  borderRadius: 16,
                  border: `1px solid ${C.cardBorder}`,
                  textAlign: 'center',
                  transform: `scale(${s})`,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 900, color: C.primary }}>{st.v}</div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{st.l}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 10: CTA ─── (54-60 s) */
const SceneCTA: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSc = spring({ frame: Math.max(0, f - 8), fps, from: 0, to: 1, config: { damping: 12, stiffness: 80 } });
  const nameOp = fi(f, 24, 18);
  const nameY = slideY(f, 24, 28, 16);
  const btnSc = spring({ frame: Math.max(0, f - 52), fps, from: 0, to: 1, config: { damping: 10, stiffness: 100 } });
  const tagOp = fi(f, 80, 18);
  const pulse = 0.97 + Math.sin(f * 0.12) * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: FONT_FAMILY }}>
      <LiquidBG frame={f} />
      <Particles frame={f} color={`${C.primary}25`} count={22} speed={0.35} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        {/* logo */}
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.primary}, ${C.gradientEnd})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${logoSc})`,
            boxShadow: `0 18px 52px ${C.primary}40`,
          }}
        >
          <span style={{ fontSize: 46, fontWeight: 900, color: C.white }}>H</span>
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: C.textPrimary,
            letterSpacing: -1,
            opacity: nameOp,
            transform: `translateY(${nameY}px)`,
          }}
        >
          Haefit
        </div>

        {/* CTA button */}
        <div
          style={{
            padding: '18px 56px',
            background: `linear-gradient(135deg, ${C.primary}, ${C.gradientEnd})`,
            borderRadius: 50,
            transform: `scale(${btnSc * pulse})`,
            boxShadow: `0 14px 44px ${C.primary}48`,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: C.white }}>Try Free Today</span>
        </div>

        <div
          style={{
            fontSize: 17,
            color: C.textMuted,
            opacity: tagOp,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Built for Indian Gyms 🇮🇳
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPOSITION  (exported for Root.tsx)
// ════════════════════════════════════════════════════════════════

export const CinematicPromo: React.FC = () => {
  useFontLoader();

  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: FONT_FAMILY }}>
      {/* 1 — Hook */}
      <Sequence from={S.hook.from} durationInFrames={S.hook.dur}>
        <SceneHook />
      </Sequence>

      {/* 2 — Pain Points */}
      <Sequence from={S.pain.from} durationInFrames={S.pain.dur}>
        <ScenePain />
      </Sequence>

      {/* 3 — Reveal */}
      <Sequence from={S.reveal.from} durationInFrames={S.reveal.dur}>
        <SceneReveal />
      </Sequence>

      {/* 4 — Dashboard */}
      <Sequence from={S.dashboard.from} durationInFrames={S.dashboard.dur}>
        <FeatureScene
          Screen={ScreenDashboard}
          title="Dashboard"
          subtitle="Complete overview at a glance"
          icon={Icon.grid(30, C.primary)}
          dur={S.dashboard.dur}
        />
      </Sequence>

      {/* 5 — Members */}
      <Sequence from={S.members.from} durationInFrames={S.members.dur}>
        <FeatureScene
          Screen={ScreenMembers}
          title="Members"
          subtitle="Smart member management"
          icon={Icon.people(30, C.primary)}
          dur={S.members.dur}
        />
      </Sequence>

      {/* 6 — Calendar */}
      <Sequence from={S.calendar.from} durationInFrames={S.calendar.dur}>
        <FeatureScene
          Screen={ScreenCalendar}
          title="Calendar"
          subtitle="Never miss a payment date"
          icon={Icon.cal(30, C.primary)}
          dur={S.calendar.dur}
        />
      </Sequence>

      {/* 7 — Payments */}
      <Sequence from={S.payments.from} durationInFrames={S.payments.dur}>
        <FeatureScene
          Screen={ScreenPayments}
          title="Payments"
          subtitle="Intelligent billing system"
          icon={Icon.rupee(30, C.primary)}
          dur={S.payments.dur}
        />
      </Sequence>

      {/* 8 — Feature Montage */}
      <Sequence from={S.montage.from} durationInFrames={S.montage.dur}>
        <SceneMontage />
      </Sequence>

      {/* 9 — Closing */}
      <Sequence from={S.closing.from} durationInFrames={S.closing.dur}>
        <SceneClosing />
      </Sequence>

      {/* 10 — CTA */}
      <Sequence from={S.cta.from} durationInFrames={S.cta.dur}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
