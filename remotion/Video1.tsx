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
  white: "#ffffff",
  glass: "rgba(255,255,255,0.82)",
  glassBorder: "rgba(255,255,255,0.3)",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#cbd5e1",
};

/* ─── WALLPAPER GRADIENT (matches the app) ──────────── */
const AppWallpaper: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 15%, #06b6d4 25%, #a3e635 40%, #fbbf24 55%, #f97316 70%, #ef4444 85%, #c084fc 100%)",
      opacity: 0.3,
    }}
  />
);

/* ─── PHONE MOCKUP ──────────────────────────────────── */
const PhoneMockup: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      width: 380,
      height: 780,
      borderRadius: 52,
      border: "8px solid #1e1e2e",
      overflow: "hidden",
      position: "relative",
      background: "#000",
      boxShadow:
        "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)",
      ...style,
    }}
  >
    {/* Dynamic Island */}
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        width: 100,
        height: 28,
        backgroundColor: "#000",
        borderRadius: 20,
        zIndex: 20,
      }}
    />
    {/* Screen */}
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: 44,
      }}
    >
      {children}
    </div>
  </div>
);

/* ─── STAT CARD ─────────────────────────────────────── */
const StatCard: React.FC<{
  label: string;
  value: string;
  color: string;
  delay: number;
}> = ({ label, value, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        background: C.glass,
        borderRadius: 14,
        padding: "10px 8px",
        textAlign: "center",
        transform: `scale(${s}) translateY(${(1 - s) * 30}px)`,
        opacity: s,
        border: `1px solid ${C.glassBorder}`,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: C.slate }}>
        {label}
      </div>
    </div>
  );
};

/* ─── MEMBER AVATAR ─────────────────────────────────── */
const Avatar: React.FC<{
  initials: string;
  color: string;
  size?: number;
  borderColor?: string;
}> = ({ initials, color, size = 44, borderColor }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.36,
      fontWeight: 700,
      color: C.white,
      border: borderColor ? `2.5px solid ${borderColor}` : "none",
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

/* ─── BOTTOM NAV ────────────────────────────────────── */
const BottomNav: React.FC<{ active: string }> = ({ active }) => {
  const items = [
    { icon: "⊞", label: "Dashboard" },
    { icon: "👥", label: "Members" },
    { icon: "📅", label: "Calendar" },
    { icon: "💳", label: "Payments" },
    { icon: "⚙", label: "Settings" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "rgba(255,255,255,0.68)",
        backdropFilter: "blur(30px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        borderTop: "1px solid rgba(255,255,255,0.3)",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 18,
              filter:
                active === item.label
                  ? "none"
                  : "grayscale(1) opacity(0.5)",
            }}
          >
            {item.icon}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: active === item.label ? 700 : 500,
              color: active === item.label ? C.teal : C.slate,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── SCREEN: DASHBOARD ─────────────────────────────── */
const DashboardScreen: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 70%, #fecdd3 100%)",
      fontFamily: "Urbanist, sans-serif",
      position: "relative",
      padding: "48px 14px 72px",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 17,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 14,
      }}
    >
      Dashboard
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <StatCard label="Active" value="38" color={C.green} delay={0} />
      <StatCard label="Due Today" value="12" color={C.amber} delay={4} />
      <StatCard label="Overdue" value="5" color={C.red} delay={8} />
    </div>
    {/* Due Today Card */}
    <div
      style={{
        background: C.glass,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        border: `1px solid ${C.glassBorder}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.navy,
          marginBottom: 10,
        }}
      >
        🔔 Due Today
      </div>
      {["Ahmed K.", "Fatima R.", "Mohammed S."].map((name, i) => (
        <div
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: i < 2 ? 8 : 0,
          }}
        >
          <Avatar
            initials={name[0]}
            color={[C.teal, C.coral, C.green][i]}
            size={32}
            borderColor={C.amber}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
              {name}
            </div>
            <div style={{ fontSize: 10, color: C.slate }}>3/6/12M Plan</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 11,
              fontWeight: 700,
              color: C.amber,
            }}
          >
            ₹1,500
          </div>
        </div>
      ))}
    </div>
    {/* Overdue Card */}
    <div
      style={{
        background: C.glass,
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${C.glassBorder}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.navy,
          marginBottom: 10,
        }}
      >
        ⚠️ Overdue
      </div>
      {["Ravi P.", "Suresh M."].map((name, i) => (
        <div
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: i < 1 ? 8 : 0,
          }}
        >
          <Avatar
            initials={name[0]}
            color={[C.red, "#8b5cf6"][i]}
            size={32}
            borderColor={C.red}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
              {name}
            </div>
            <div style={{ fontSize: 10, color: C.red }}>5 days overdue</div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="Dashboard" />
  </div>
);

/* ─── SCREEN: MEMBERS ───────────────────────────────── */
const MembersScreen: React.FC = () => {
  const members = [
    { name: "Ahmed", color: C.teal },
    { name: "Fatima", color: "#ec4899" },
    { name: "Ravi", color: C.coral },
    { name: "Suresh", color: C.green },
    { name: "Priya", color: "#8b5cf6" },
    { name: "Aisha", color: "#06b6d4" },
    { name: "Kumar", color: C.amber },
    { name: "Sara", color: "#f43f5e" },
    { name: "Omar", color: "#3b82f6" },
    { name: "Noor", color: "#a855f7" },
    { name: "Raj", color: "#14b8a6" },
    { name: "Zain", color: "#f97316" },
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 70%, #fecdd3 100%)",
        fontFamily: "Urbanist, sans-serif",
        position: "relative",
        padding: "48px 14px 72px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 17,
          fontWeight: 700,
          color: C.navy,
          marginBottom: 10,
        }}
      >
        Members
      </div>
      {/* Search bar */}
      <div
        style={{
          background: C.glass,
          borderRadius: 12,
          padding: "8px 12px",
          marginBottom: 14,
          fontSize: 12,
          color: C.slate,
          border: `1px solid ${C.glassBorder}`,
        }}
      >
        🔍 Search members...
      </div>
      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: "rgba(20,184,166,0.15)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: C.teal,
          }}
        >
          Active: 38
        </div>
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: C.red,
          }}
        >
          Overdue: 5
        </div>
      </div>
      {/* Member Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        {members.map((m) => (
          <div
            key={m.name}
            style={{
              background: C.glass,
              borderRadius: 14,
              padding: "12px 6px",
              textAlign: "center",
              border: `1px solid ${C.glassBorder}`,
            }}
          >
            <Avatar
              initials={m.name[0]}
              color={m.color}
              size={40}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.navy,
                marginTop: 6,
              }}
            >
              {m.name}
            </div>
            <div style={{ fontSize: 9, color: C.green }}>Active</div>
          </div>
        ))}
      </div>
      <BottomNav active="Members" />
    </div>
  );
};

/* ─── SCREEN: CALENDAR ──────────────────────────────── */
const CalendarScreen: React.FC = () => {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const highlightDays: Record<number, string> = {
    1: C.red,
    2: C.red,
    3: C.green,
    5: C.red,
    7: C.green,
    10: C.green,
    13: C.red,
    15: C.teal,
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 70%, #fecdd3 100%)",
        fontFamily: "Urbanist, sans-serif",
        position: "relative",
        padding: "48px 14px 72px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 17,
          fontWeight: 700,
          color: C.navy,
          marginBottom: 8,
        }}
      >
        Calendar
      </div>
      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {[
          { label: "Active", value: "38", color: C.teal },
          { label: "Paid", value: "2", color: C.green },
          { label: "Unpaid", value: "12", color: C.red },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.glass,
              borderRadius: 10,
              padding: "6px 4px",
              textAlign: "center",
              border: `1px solid ${C.glassBorder}`,
            }}
          >
            <div
              style={{ fontSize: 16, fontWeight: 800, color: s.color }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: C.slate }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Month pill */}
      <div
        style={{
          background: "rgba(255,255,255,0.6)",
          borderRadius: 20,
          padding: "4px 16px",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          color: C.navy,
          marginBottom: 8,
          width: "fit-content",
          margin: "0 auto 8px",
        }}
      >
        ← February 2026 →
      </div>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 9,
              fontWeight: 600,
              color: C.slate,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}
      >
        {days.map((day) => (
          <div
            key={day}
            style={{
              background: highlightDays[day]
                ? `${highlightDays[day]}15`
                : C.glass,
              borderRadius: 8,
              padding: "6px 2px",
              textAlign: "center",
              minHeight: 36,
              border: `1px solid ${C.glassBorder}`,
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: highlightDays[day] || C.navy,
              }}
            >
              {day}
            </div>
            {highlightDays[day] && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: highlightDays[day],
                  margin: "2px auto 0",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <BottomNav active="Calendar" />
    </div>
  );
};

/* ─── SCREEN: PAYMENTS ──────────────────────────────── */
const PaymentsScreen: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 40%, #fed7aa 70%, #fecdd3 100%)",
      fontFamily: "Urbanist, sans-serif",
      position: "relative",
      padding: "48px 14px 72px",
    }}
  >
    <div
      style={{
        textAlign: "center",
        fontSize: 17,
        fontWeight: 700,
        color: C.navy,
        marginBottom: 14,
      }}
    >
      Payments
    </div>
    {/* Summary */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 14,
      }}
    >
      {[
        { label: "Collected", value: "₹45,000", color: C.green },
        { label: "Pending", value: "₹18,000", color: C.amber },
      ].map((s) => (
        <div
          key={s.label}
          style={{
            background: C.glass,
            borderRadius: 14,
            padding: 12,
            border: `1px solid ${C.glassBorder}`,
          }}
        >
          <div style={{ fontSize: 10, color: C.slate, marginBottom: 2 }}>
            {s.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
    {/* Payment List */}
    <div
      style={{
        background: C.glass,
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${C.glassBorder}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.navy,
          marginBottom: 10,
        }}
      >
        Recent Payments
      </div>
      {[
        {
          name: "Ahmed K.",
          amount: "₹3,000",
          status: "Paid",
          color: C.green,
          avatar: C.teal,
        },
        {
          name: "Fatima R.",
          amount: "₹1,500",
          status: "Paid",
          color: C.green,
          avatar: "#ec4899",
        },
        {
          name: "Ravi P.",
          amount: "₹2,500",
          status: "Overdue",
          color: C.red,
          avatar: C.coral,
        },
        {
          name: "Suresh M.",
          amount: "₹1,500",
          status: "Due",
          color: C.amber,
          avatar: C.green,
        },
        {
          name: "Priya D.",
          amount: "₹3,500",
          status: "Paid",
          color: C.green,
          avatar: "#8b5cf6",
        },
      ].map((p, i) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            borderTop: i > 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
          }}
        >
          <Avatar initials={p.name[0]} color={p.avatar} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
              {p.name}
            </div>
            <div style={{ fontSize: 10, color: C.slate }}>Monthly Plan</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
              {p.amount}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: p.color,
                background: `${p.color}15`,
                borderRadius: 8,
                padding: "1px 6px",
              }}
            >
              {p.status}
            </div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="Payments" />
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN VIDEO COMPOSITION
   ═══════════════════════════════════════════════════════ */

/* ─── Scene 1: Title Intro (0–3s / frames 0–90) ────── */
const TitleIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 10, mass: 0.8 } });
  const titleOp = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleOp = interpolate(frame, [40, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [40, 70], [30, 0], {
    extrapolateRight: "clamp",
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
      {/* Animated gradient orb */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.teal}30 0%, transparent 70%)`,
          transform: `scale(${logoScale * 1.5})`,
          filter: "blur(60px)",
        }}
      />
      {/* Logo circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          boxShadow: `0 20px 60px ${C.teal}40`,
          marginBottom: 30,
        }}
      >
        <span style={{ fontSize: 52, fontWeight: 900, color: C.white }}>
          H
        </span>
      </div>
      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: C.white,
          opacity: titleOp,
          letterSpacing: -2,
        }}
      >
        Haefit
      </div>
      {/* Subtitle */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 400,
          color: C.slateLight,
          opacity: subtitleOp,
          transform: `translateY(${subtitleY}px)`,
          marginTop: 8,
        }}
      >
        Gym Management, Reimagined
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 2: Dashboard Reveal (3–8s / frames 90–240) */
const DashboardReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneY = spring({
    frame,
    fps,
    config: { damping: 12, mass: 1.2 },
  });
  const rotateY = interpolate(frame, [0, 60], [25, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const rotateX = interpolate(frame, [0, 60], [-8, 3], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const scale = interpolate(frame, [0, 45], [0.7, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Label animation
  const labelOp = interpolate(frame, [60, 85], [0, 1], {
    extrapolateRight: "clamp",
  });
  const labelX = interpolate(frame, [60, 85], [-30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, #0d2137 0%, ${C.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 80,
          opacity: labelOp,
          transform: `translateX(${labelX}px)`,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: C.white,
            lineHeight: 1.1,
          }}
        >
          Smart
          <br />
          Dashboard
        </div>
        <div style={{ fontSize: 18, color: C.slateLight, marginTop: 8 }}>
          Everything at a glance
        </div>
      </div>
      <div
        style={{
          transform: `
            perspective(1200px)
            rotateY(${rotateY}deg)
            rotateX(${rotateX}deg)
            scale(${scale})
            translateY(${(1 - phoneY) * 600}px)
          `,
          marginTop: 200,
        }}
      >
        <PhoneMockup>
          <DashboardScreen />
        </PhoneMockup>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 3: Members Page (8–13s / frames 240–390) ─ */
const MembersReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14 } });
  const rotateY = interpolate(frame, [0, 50], [-20, 8], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const phoneX = interpolate(frame, [0, 50], [400, 60], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const labelOp = interpolate(frame, [40, 65], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 50%, #071a2b 0%, ${C.bg} 70%)`,
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      {/* Label - right side */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 400,
          opacity: labelOp,
          textAlign: "right",
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, color: C.white }}>
          38 Active
          <br />
          Members
        </div>
        <div style={{ fontSize: 18, color: C.slateLight, marginTop: 8 }}>
          Track everyone easily
        </div>
      </div>
      <div
        style={{
          transform: `
            perspective(1200px)
            rotateY(${rotateY}deg)
            translateX(${phoneX}px)
            scale(${enter * 0.2 + 0.8})
          `,
          marginTop: 300,
          marginRight: 300,
        }}
      >
        <PhoneMockup>
          <MembersScreen />
        </PhoneMockup>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 4: Calendar (13–18s / frames 390–540) ──── */
const CalendarReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 12 } });
  const rotateY = interpolate(frame, [0, 50], [15, -5], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const phoneScale = interpolate(frame, [0, 40], [0.6, 1.05], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const labelOp = interpolate(frame, [35, 60], [0, 1], {
    extrapolateRight: "clamp",
  });
  const labelY = interpolate(frame, [35, 60], [40, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 60% 40%, #1a1040 0%, ${C.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 160,
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, color: C.white }}>
          Visual Calendar
        </div>
        <div style={{ fontSize: 18, color: C.slateLight, marginTop: 8 }}>
          See payments at a glance
        </div>
      </div>
      <div
        style={{
          transform: `
            perspective(1200px)
            rotateY(${rotateY}deg)
            scale(${phoneScale * enter})
          `,
          marginTop: 100,
        }}
      >
        <PhoneMockup>
          <CalendarScreen />
        </PhoneMockup>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 5: Payments (18–23s / frames 540–690) ──── */
const PaymentsReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.9 } });
  const rotateZ = interpolate(frame, [0, 50], [-6, 2], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const phoneY = interpolate(frame, [0, 40], [300, -40], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const labelOp = interpolate(frame, [50, 75], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 40% 60%, #1a2810 0%, ${C.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 200,
          opacity: labelOp,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, color: C.white }}>
          Payment Tracking
        </div>
        <div style={{ fontSize: 18, color: C.slateLight, marginTop: 8 }}>
          Never miss a payment
        </div>
      </div>
      <div
        style={{
          transform: `
            perspective(1200px)
            rotateZ(${rotateZ}deg)
            translateY(${phoneY}px)
            scale(${enter})
          `,
        }}
      >
        <PhoneMockup>
          <PaymentsScreen />
        </PhoneMockup>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 6: CTA Ending (23–30s / frames 690–900) ── */
const CTAEnding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Multiple phones in a row
  const enter = spring({ frame, fps, config: { damping: 12 } });
  const textOp = interpolate(frame, [40, 70], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [40, 70], [40, 0], {
    extrapolateRight: "clamp",
  });
  const ctaScale = spring({
    frame: frame - 80,
    fps,
    config: { damping: 8, mass: 0.6 },
  });

  const screens = [
    { screen: <DashboardScreen />, rot: -15 },
    { screen: <MembersScreen />, rot: 0 },
    { screen: <PaymentsScreen />, rot: 15 },
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
      {/* Three phones in a row */}
      <div
        style={{
          display: "flex",
          gap: -20,
          transform: `scale(${enter * 0.35 + 0.15})`,
          marginBottom: 80,
        }}
      >
        {screens.map((s, i) => (
          <div
            key={i}
            style={{
              transform: `
                perspective(800px)
                rotateY(${s.rot}deg)
                translateZ(${i === 1 ? 40 : 0}px)
              `,
              marginLeft: i > 0 ? -40 : 0,
              zIndex: i === 1 ? 2 : 1,
            }}
          >
            <PhoneMockup
              style={{
                width: 260,
                height: 530,
                borderRadius: 36,
              }}
            >
              {s.screen}
            </PhoneMockup>
          </div>
        ))}
      </div>
      {/* CTA Text */}
      <div
        style={{
          textAlign: "center",
          opacity: textOp,
          transform: `translateY(${textY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: C.white,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Your Gym.
          <br />
          <span style={{ color: C.teal }}>Your Way.</span>
        </div>
        <div style={{ fontSize: 22, color: C.slateLight, marginBottom: 30 }}>
          Start managing smarter today
        </div>
      </div>
      {/* CTA Button */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`,
          borderRadius: 50,
          padding: "16px 48px",
          fontSize: 24,
          fontWeight: 700,
          color: C.white,
          transform: `scale(${Math.max(0, ctaScale)})`,
          boxShadow: `0 10px 40px ${C.teal}50`,
        }}
      >
        Get Haefit →
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════ */
export const ProductDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <FontLoader />

      {/* Scene 1: Title (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <TitleIntro />
      </Sequence>

      {/* Scene 2: Dashboard (3-8s) */}
      <Sequence from={90} durationInFrames={150}>
        <DashboardReveal />
      </Sequence>

      {/* Scene 3: Members (8-13s) */}
      <Sequence from={240} durationInFrames={150}>
        <MembersReveal />
      </Sequence>

      {/* Scene 4: Calendar (13-18s) */}
      <Sequence from={390} durationInFrames={150}>
        <CalendarReveal />
      </Sequence>

      {/* Scene 5: Payments (18-23s) */}
      <Sequence from={540} durationInFrames={150}>
        <PaymentsReveal />
      </Sequence>

      {/* Scene 6: CTA (23-30s) */}
      <Sequence from={690} durationInFrames={210}>
        <CTAEnding />
      </Sequence>
    </AbsoluteFill>
  );
};
