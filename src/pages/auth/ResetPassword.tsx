import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { auditLogger } from '../../lib/auditLogger';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase sets the session from the URL hash/params automatically
    // We just need to verify that a session exists (meaning user clicked the reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      if (!session) {
        toast.error('Invalid or expired reset link. Please request a new one.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // Log password change
      const { data: { user } } = await supabase.auth.getUser();
      auditLogger.log({
        category: 'AUTH',
        action: 'password_changed',
        resourceType: 'user',
        resourceId: user?.id,
        resourceName: user?.email || 'unknown',
        success: true,
        metadata: { type: 'password_reset_completed' },
      });

      setIsSuccess(true);
      toast.success('Password updated successfully!');
      
      // Sign out after password reset so user logs in with new password
      await supabase.auth.signOut();
      
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update password';
      toast.error(message);
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
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100/60 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#0f172a]">Password Updated!</h2>
              <p className="text-[#64748b] text-sm">
                Your password has been changed successfully. Redirecting to login...
              </p>
            </div>
          ) : hasSession === false ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100/60 mb-4">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#0f172a]">Invalid Reset Link</h2>
              <p className="text-[#64748b] text-sm">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 px-6 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/30"
              >
                Request New Link
              </motion.button>
            </div>
          ) : hasSession === null ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto"></div>
              <p className="text-[#64748b] text-sm mt-4">Verifying reset link...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-4 shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Set New Password</h1>
                <p className="text-[#64748b] text-sm">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full pl-12 pr-12 py-3 rounded-[18px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Repeat password"
                      className="w-full pl-12 pr-12 py-3 rounded-[18px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                      Updating...
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </motion.button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
