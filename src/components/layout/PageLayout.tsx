import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  backLink?: string;
  rightElement?: ReactNode;
  headerIcon?: ReactNode;
  showBottomNav?: boolean;
}

export function PageLayout({ 
  children, 
  title, 
  subtitle, 
  backLink,
  rightElement,
  headerIcon,
  showBottomNav = true
}: PageLayoutProps) {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist]"
      style={{ paddingBottom: showBottomNav ? 'calc(5rem + env(safe-area-inset-bottom))' : '0' }}
    >
      {/* Safe Area Background Extensions */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-[#E0F2FE] z-[200]" />
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-[#E0F2FE] z-[200]" />

      {/* Animated Background Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-10"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          {backLink && (
            <Link to={backLink} className="p-2 -ml-2 rounded-xl hover:bg-white/50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {headerIcon && (
            <div className="text-emerald-600">{headerIcon}</div>
          )}
          {rightElement}
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-auto relative z-10 px-4">
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
