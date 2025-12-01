import React from 'react';
import { motion } from 'framer-motion';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  showBottomNav?: boolean;
}

/**
 * PageLayout - Base layout component with animated gradient background
 * 
 * Design System:
 * - Background: #E0F2FE (Light Sky Blue)
 * - Animated blobs: #6EE7B7 (Mint Green) top-left, #FCA5A5 (Light Red) bottom-right
 * - Safe area handling for iOS notch
 * - Full viewport height with no scroll
 */
export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div 
      className={`fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist] ${className}`}
    >
      {/* Animated gradient blobs - extend into safe areas */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{ borderRadius: '9999px' }}
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{ borderRadius: '9999px' }}
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none z-0"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </div>
  );
}

/**
 * LoadingScreen - Consistent loading state with animated logo
 */
export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex items-center justify-center font-[Urbanist]">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <motion.div 
          className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-400/40 flex items-center justify-center mb-4"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
          </svg>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
        />
        <p className="text-sm font-semibold text-gray-600 mt-3">{message}</p>
      </motion.div>
    </div>
  );
}

export default PageLayout;
