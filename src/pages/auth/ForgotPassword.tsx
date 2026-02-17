import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { auditLogger } from '../../lib/auditLogger';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // Log password reset request
      auditLogger.log({
        category: 'AUTH',
        action: 'password_changed',
        resourceType: 'user',
        resourceName: email,
        success: true,
        metadata: { type: 'password_reset_requested' },
      });

      setEmailSent(true);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="w-full max-w-md px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 border border-white/50"
        >
          {!emailSent ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-4 shadow-lg">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Forgot Password</h1>
                <p className="text-[#64748b] text-sm">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-[18px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                    />
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3.5 px-4 rounded-full font-bold hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-lg shadow-emerald-500/30"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </motion.button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100/60 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#0f172a]">Email Sent!</h2>
              <p className="text-[#64748b] text-sm">
                Check your inbox for a password reset link. If you don't see it, check your spam folder.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 px-6 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/30"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
