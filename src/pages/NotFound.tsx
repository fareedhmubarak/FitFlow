import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Users, CreditCard, Dumbbell, Settings } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex items-center justify-center overflow-hidden">
      {/* Background Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-9xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <motion.div
            animate={{
              rotate: [0, 10, -10, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg flex items-center justify-center">
              <span className="text-5xl">😵</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 border border-white/50 mb-6"
        >
          <h2 className="text-3xl font-bold text-[#0f172a] mb-4">
            Page Not Found
          </h2>
          <p className="text-base text-[#64748b] mb-6">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </motion.button>
            </Link>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/60 text-[#0f172a] font-bold rounded-full border border-white/40 hover:bg-white/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-[#64748b] font-semibold mb-4">
            Need help? Here are some helpful links:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/members">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/40 backdrop-blur-md text-[#0f172a] text-sm font-semibold rounded-full border border-white/50 hover:bg-white/60 transition-colors"
              >
                <Users className="w-4 h-4" />
                Members
              </motion.button>
            </Link>
            <Link to="/payments">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/40 backdrop-blur-md text-[#0f172a] text-sm font-semibold rounded-full border border-white/50 hover:bg-white/60 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Payments
              </motion.button>
            </Link>
            <Link to="/classes">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/40 backdrop-blur-md text-[#0f172a] text-sm font-semibold rounded-full border border-white/50 hover:bg-white/60 transition-colors"
              >
                <Dumbbell className="w-4 h-4" />
                Classes
              </motion.button>
            </Link>
            <Link to="/settings">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/40 backdrop-blur-md text-[#0f172a] text-sm font-semibold rounded-full border border-white/50 hover:bg-white/60 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
