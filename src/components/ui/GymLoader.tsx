import { motion } from 'framer-motion';

interface GymLoaderProps {
  message?: string;
}

export function GymLoader({ message = 'Loading...' }: GymLoaderProps) {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen flex items-center justify-center font-[Urbanist]"
      style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}
    >
      {/* Background Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full blur-[80px] opacity-50 pointer-events-none"
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full blur-[80px] opacity-50 pointer-events-none"
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Loader Content */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center relative z-10"
      >
        {/* Animated Dumbbell Icon */}
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

        {/* Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
        />

        {/* Loading Message */}
        <p className="text-sm font-semibold mt-3" style={{ color: 'var(--theme-text-secondary, #4B5563)' }}>{message}</p>
      </motion.div>
    </div>
  );
}

export default GymLoader;
