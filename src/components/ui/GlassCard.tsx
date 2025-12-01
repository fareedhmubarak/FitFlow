import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "dark" | "light";
  hoverEffect?: boolean;
}

export function GlassCard({ 
  className, 
  variant = "default", 
  hoverEffect = true,
  children, 
  ...props 
}: GlassCardProps) {
  const variants = {
    default: "bg-white/10 border-white/20 text-white",
    dark: "bg-black/20 border-white/10 text-white",
    light: "bg-white/20 border-white/30 text-gray-800"
  };

  return (
    <motion.div
      initial={hoverEffect ? { scale: 1 } : undefined}
      whileHover={hoverEffect ? { scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" } : undefined}
      whileTap={hoverEffect ? { scale: 0.98 } : undefined}
      className={cn(
        "backdrop-blur-md border shadow-xl rounded-2xl transition-colors duration-300",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
