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
      className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]"
      style={{ 
        backgroundColor: 'var(--theme-bg, #E0F2FE)',
        paddingBottom: showBottomNav ? 'calc(5rem + env(safe-area-inset-bottom))' : '0'
      }}
    >
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob"
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000"
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
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
