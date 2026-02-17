import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
  Easing,
} from "remotion";

/* ─── FONT LOADING ──────────────────────────────────── */
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap";

const FontLoader: React.FC = () => (
  <style>{`@import url('${FONT_URL}');`}</style>
);

/* ─── COLORS ────────────────────────────────────────── */
const C = {
  bg: "#0a0e1a",
  teal: "#14b8a6",
  tealLight: "#5eead4",
  coral: "#f97316",
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#10b981",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  pink: "#ec4899",
  white: "#ffffff",
  glass: "rgba(255,255,255,0.82)",
  glassBorder: "rgba(255,255,255,0.3)",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#cbd5e1",
};

/* ─── ANIMATED NUMBER COUNTER ──────────────────────── */
const CountUp: React.FC<{
  target: number;
  prefix?: string;
  suffix?: string;
  color: string;
  size?: number;
}> = ({ target, prefix = "", suffix = "", color, size = 72 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const value = Math.round(target * progress);
  return (
    <span style={{ fontSize: size, fontWeight: 900, color }}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─── FEATURE ICON COMPONENT ───────────────────────── */
const FeatureIcon: React.FC<{
  emoji: string;
  color: string;
  glowColor: string;
}> = ({ emoji, color, glowColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 8, mass: 0.6 } });
  const rotate = interpolate(frame, [0, 30], [-20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <div
      style={{
        width: 100,
        height: 100,
        borderRadius: 28,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        boxShadow: `0 20px 50px ${glowColor}60, 0 0 80px ${glowColor}20`,
      }}
    >
      {emoji}
    </div>
  );
};

/* ─── ANIMATED LINE/BAR ────────────────────────────── */
const AnimatedBar: React.FC<{
  width: string;
  color: string;
  delay: number;
  height?: number;
}> = ({ width, color, delay, height = 10 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        height,
        borderRadius: height / 2,
        background: `${color}20`,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: height / 2,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          width: `calc(${width} * ${progress})`,
        }}
      />
    </div>
  );
};

/* ─── MINI PHONE MOCKUP ────────────────────────────── */
const MiniPhone: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      width: 220,
      height: 440,
      borderRadius: 32,
      border: "5px solid #1e1e2e",
      overflow: "hidden",
      background: "#000",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      position: "relative",
      flexShrink: 0,
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 6,
        left: "50%",
        transform: "translateX(-50%)",
        width: 60,
        height: 16,
        backgroundColor: "#000",
        borderRadius: 12,
        zIndex: 20,
      }}
    />
    <div style={{ width: "100%", height: "100%", borderRadius: 27 }}>
      {children}
    </div>
  </div>
);

/* ─── MINI APP SCREENS ─────────────────────────────── */
const MiniDashboard: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 100%)",
      padding: "28px 8px 8px",
      fontFamily: "Urbanist, sans-serif",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 8,
      }}
    >
      Dashboard
    </div>
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      {[
        { v: "38", c: C.green },
        { v: "12", c: C.amber },
        { v: "5", c: C.red },
      ].map((s) => (
        <div
          key={s.v}
          style={{
            flex: 1,
            background: C.glass,
            borderRadius: 8,
            padding: "4px 2px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>
            {s.v}
          </div>
        </div>
      ))}
    </div>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          background: C.glass,
          borderRadius: 8,
          padding: 6,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: [C.teal, C.coral, C.purple][i - 1],
          }}
        />
        <div>
          <div
            style={{
              height: 6,
              width: 50 + i * 10,
              background: "#d1d5db",
              borderRadius: 3,
              marginBottom: 3,
            }}
          />
          <div
            style={{
              height: 4,
              width: 30 + i * 5,
              background: "#e5e7eb",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

const MiniMembers: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 100%)",
      padding: "28px 8px 8px",
      fontFamily: "Urbanist, sans-serif",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 8,
      }}
    >
      Members
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4,
      }}
    >
      {[
        C.teal,
        "#ec4899",
        C.coral,
        C.green,
        C.purple,
        "#06b6d4",
        C.amber,
        "#f43f5e",
        C.blue,
      ].map((c, i) => (
        <div
          key={i}
          style={{
            background: C.glass,
            borderRadius: 8,
            padding: "6px 2px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: c,
              margin: "0 auto 3px",
            }}
          />
          <div
            style={{
              height: 4,
              width: 28,
              background: "#d1d5db",
              borderRadius: 2,
              margin: "0 auto",
            }}
          />
        </div>
      ))}
    </div>
  </div>
);

const MiniCalendar: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 100%)",
      padding: "28px 8px 8px",
      fontFamily: "Urbanist, sans-serif",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 8,
      }}
    >
      Calendar
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 2,
      }}
    >
      {Array.from({ length: 28 }, (_, i) => (
        <div
          key={i}
          style={{
            background:
              [0, 1, 4, 12].includes(i) ? `${C.red}20` : C.glass,
            borderRadius: 4,
            padding: 2,
            textAlign: "center",
            fontSize: 7,
            fontWeight: 600,
            color: [0, 1, 4, 12].includes(i) ? C.red : C.navy,
            minHeight: 16,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);

const MiniPayments: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 100%)",
      padding: "28px 8px 8px",
      fontFamily: "Urbanist, sans-serif",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 8,
      }}
    >
      Payments
    </div>
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <div
        style={{
          flex: 1,
          background: C.glass,
          borderRadius: 8,
          padding: 6,
        }}
      >
        <div style={{ fontSize: 6, color: C.slate }}>Collected</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.green }}>
          ₹45K
        </div>
      </div>
      <div
        style={{
          flex: 1,
          background: C.glass,
          borderRadius: 8,
          padding: 6,
        }}
      >
        <div style={{ fontSize: 6, color: C.slate }}>Pending</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>
          ₹18K
        </div>
      </div>
    </div>
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        style={{
          background: C.glass,
          borderRadius: 6,
          padding: "4px 6px",
          marginBottom: 3,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: [C.teal, C.pink, C.coral, C.green][i - 1],
          }}
        />
        <div
          style={{
            height: 4,
            flex: 1,
            background: "#d1d5db",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: [C.green, C.green, C.red, C.amber][i - 1],
          }}
        >
          {["✓", "✓", "!", "⏳"][i - 1]}
        </div>
      </div>
    ))}
  </div>
);

const MiniGlass: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #7dd3fc 0%, #a3e635 30%, #fbbf24 60%, #f97316 100%)",
      padding: "28px 12px 12px",
      fontFamily: "Urbanist, sans-serif",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "rgba(255,255,255,0.7)",
        borderRadius: 16,
        padding: 14,
        width: "90%",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.4)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>
        Liquid Glass
      </div>
      <div style={{ fontSize: 8, color: C.slate, marginTop: 4 }}>
        Translucent • Blur • Saturate
      </div>
    </div>
    <div
      style={{
        background: "rgba(255,255,255,0.5)",
        borderRadius: 12,
        padding: 10,
        width: "80%",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.3)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: C.navy }}>
        Premium UI
      </div>
    </div>
    <div
      style={{
        background: "rgba(255,255,255,0.35)",
        borderRadius: 10,
        padding: 8,
        width: "70%",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div style={{ fontSize: 8, fontWeight: 600, color: C.navy }}>
        ✨ Glass
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   FEATURE CARD SCENE
   ═══════════════════════════════════════════════════════ */
const FeatureCard: React.FC<{
  emoji: string;
  title: string;
  description: string;
  stats: { label: string; value: string; color: string }[];
  color: string;
  glowColor: string;
  miniScreen: React.ReactNode;
  reversed?: boolean;
}> = ({
  emoji,
  title,
  description,
  stats,
  color,
  glowColor,
  miniScreen,
  reversed,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const slideX = interpolate(frame, [0, 30], [reversed ? -200 : 200, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const phoneSlide = interpolate(
    frame,
    [15, 45],
    [reversed ? 200 : -200, 0],
    {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );
  const phoneRotate = interpolate(frame, [15, 55], [15, -3], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const statDelay = 35;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${reversed ? "70%" : "30%"} 50%, ${glowColor}15 0%, ${C.bg} 60%)`,
        fontFamily: "Urbanist, sans-serif",
        padding: "0 60px",
        justifyContent: "center",
      }}
    >
      {/* Content side */}
      <div
        style={{
          position: "absolute",
          [reversed ? "right" : "left"]: 60,
          top: 300,
          opacity: enter,
          transform: `translateX(${slideX}px)`,
          width: 580,
        }}
      >
        <FeatureIcon emoji={emoji} color={color} glowColor={glowColor} />
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: C.white,
            marginTop: 20,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            color: C.slateLight,
            marginTop: 10,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 24,
          }}
        >
          {stats.map((s, i) => {
            const sEnter = spring({
              frame: frame - statDelay - i * 8,
              fps,
              config: { damping: 10 },
            });
            return (
              <div
                key={s.label}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "12px 20px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: sEnter,
                  transform: `translateY(${(1 - sEnter) * 20}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.slateLight,
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone side */}
      <div
        style={{
          position: "absolute",
          [reversed ? "left" : "right"]: 120,
          top: "50%",
          transform: `
            translateY(-50%)
            translateX(${phoneSlide}px)
            perspective(800px)
            rotateY(${reversed ? -phoneRotate : phoneRotate}deg)
          `,
        }}
      >
        <MiniPhone>{miniScreen}</MiniPhone>
      </div>
    </AbsoluteFill>
  );
};

/* ─── OPENING TITLE ─────────────────────────────────── */
const OpeningTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numberScale = spring({ frame, fps, config: { damping: 8 } });
  const textOp = interpolate(frame, [25, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const lineWidth = interpolate(frame, [35, 70], [0, 400], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #0d2137 0%, ${C.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.teal}25 0%, transparent 70%)`,
          top: 400,
          left: 100,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.coral}20 0%, transparent 70%)`,
          top: 600,
          right: 100,
          filter: "blur(40px)",
        }}
      />
      {/* Big number */}
      <div
        style={{
          fontSize: 200,
          fontWeight: 900,
          color: C.teal,
          opacity: 0.15,
          position: "absolute",
          transform: `scale(${numberScale})`,
        }}
      >
        5
      </div>
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          opacity: textOp,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: C.white,
            lineHeight: 1.2,
          }}
        >
          Everything You Need
          <br />
          <span style={{ color: C.teal }}>In One App</span>
        </div>
        {/* Animated line */}
        <div
          style={{
            height: 3,
            width: lineWidth,
            background: `linear-gradient(90deg, transparent, ${C.teal}, transparent)`,
            margin: "16px auto 0",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ─── CLOSING CTA ───────────────────────────────────── */
const ClosingCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 10 } });
  const textOp = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });
  const btnScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 8, mass: 0.5 },
  });

  // Feature icons floating
  const features = [
    { emoji: "📊", x: 150, y: 350, delay: 0 },
    { emoji: "👥", x: 750, y: 300, delay: 5 },
    { emoji: "📅", x: 200, y: 1200, delay: 10 },
    { emoji: "💳", x: 800, y: 1100, delay: 15 },
    { emoji: "✨", x: 500, y: 200, delay: 8 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #0d2137 0%, ${C.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      {/* Floating feature icons */}
      {features.map((f, i) => {
        const fEnter = spring({
          frame: frame - f.delay,
          fps,
          config: { damping: 10 },
        });
        const float = Math.sin((frame + i * 20) * 0.05) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: f.x,
              top: f.y + float,
              fontSize: 48,
              opacity: fEnter * 0.4,
              transform: `scale(${fEnter})`,
            }}
          >
            {f.emoji}
          </div>
        );
      })}

      {/* Logo */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${enter})`,
          boxShadow: `0 20px 60px ${C.teal}40`,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 900, color: C.white }}>
          H
        </span>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", opacity: textOp }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: C.white,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          Ready to Transform
          <br />
          <span style={{ color: C.teal }}>Your Gym?</span>
        </div>
        <div
          style={{
            fontSize: 22,
            color: C.slateLight,
            marginBottom: 36,
          }}
        >
          Join hundreds of gym owners using Haefit
        </div>
      </div>

      {/* CTA Button */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`,
          borderRadius: 50,
          padding: "18px 56px",
          fontSize: 26,
          fontWeight: 700,
          color: C.white,
          transform: `scale(${Math.max(0, btnScale)})`,
          boxShadow: `0 12px 40px ${C.teal}50`,
        }}
      >
        Get Started Free →
      </div>

      {/* Contact info */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          textAlign: "center",
          opacity: textOp,
        }}
      >
        <div style={{ fontSize: 16, color: C.slateLight }}>
          haefit.app • @haefit
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN VIDEO COMPOSITION
   ═══════════════════════════════════════════════════════ */
export const FeatureShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <FontLoader />

      {/* Scene 1: Opening Title (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <OpeningTitle />
      </Sequence>

      {/* Scene 2: Smart Dashboard (3-7.5s) */}
      <Sequence from={90} durationInFrames={135}>
        <FeatureCard
          emoji="📊"
          title="Smart Dashboard"
          description="All your key metrics in one beautiful view. Active members, payments due, and overdue alerts — instantly."
          stats={[
            { label: "Active Members", value: "38", color: C.green },
            { label: "Due Today", value: "12", color: C.amber },
            { label: "Revenue", value: "₹63K", color: C.teal },
          ]}
          color={C.teal}
          glowColor={C.teal}
          miniScreen={<MiniDashboard />}
        />
      </Sequence>

      {/* Scene 3: Member Management (7.5-12s) */}
      <Sequence from={225} durationInFrames={135}>
        <FeatureCard
          emoji="👥"
          title="Member Management"
          description="Track every member's journey. Photos, plans, payments, and check-ins — all organized beautifully."
          stats={[
            { label: "Members", value: "38", color: C.blue },
            { label: "Plans", value: "6", color: C.purple },
            { label: "Check-ins", value: "124", color: C.green },
          ]}
          color={C.blue}
          glowColor={C.blue}
          miniScreen={<MiniMembers />}
          reversed
        />
      </Sequence>

      {/* Scene 4: Payment Calendar (12-16.5s) */}
      <Sequence from={360} durationInFrames={135}>
        <FeatureCard
          emoji="📅"
          title="Payment Calendar"
          description="Visualize every payment due date on an intuitive calendar. Color-coded statuses make tracking effortless."
          stats={[
            { label: "Collected", value: "₹45K", color: C.green },
            { label: "Pending", value: "₹18K", color: C.amber },
            { label: "Overdue", value: "5", color: C.red },
          ]}
          color={C.purple}
          glowColor={C.purple}
          miniScreen={<MiniCalendar />}
        />
      </Sequence>

      {/* Scene 5: Payment Tracking (16.5-21s) */}
      <Sequence from={495} durationInFrames={135}>
        <FeatureCard
          emoji="💳"
          title="Payment Tracking"
          description="Automated installment plans, due date notifications, and complete payment history for every member."
          stats={[
            { label: "This Month", value: "₹63K", color: C.green },
            { label: "Auto-Split", value: "12", color: C.teal },
            { label: "On Time", value: "87%", color: C.blue },
          ]}
          color={C.amber}
          glowColor={C.amber}
          miniScreen={<MiniPayments />}
          reversed
        />
      </Sequence>

      {/* Scene 6: Liquid Glass Design (21-25.5s) */}
      <Sequence from={630} durationInFrames={135}>
        <FeatureCard
          emoji="✨"
          title="Liquid Glass Design"
          description="A premium UI experience inspired by Apple's design language. Frosted glass, smooth animations, and elegant typography."
          stats={[
            { label: "Themes", value: "3+", color: C.purple },
            { label: "Animations", value: "60fps", color: C.teal },
            { label: "Feel", value: "Premium", color: C.pink },
          ]}
          color={C.pink}
          glowColor={C.pink}
          miniScreen={<MiniGlass />}
        />
      </Sequence>

      {/* Scene 7: Closing CTA (25.5-30s) */}
      <Sequence from={765} durationInFrames={135}>
        <ClosingCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
