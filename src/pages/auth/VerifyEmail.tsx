import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseRaw } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Mail, Dumbbell, RefreshCw } from 'lucide-react';

type VerificationStatus = 'waiting' | 'verifying' | 'success' | 'error' | 'expired';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('waiting');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Check if we're on the verification page after clicking email link
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || 'Verification failed');
      return;
    }

    if (type === 'signup' || type === 'email') {
      // This is a verification callback
      setStatus('verifying');
      handleVerification();
    } else {
      // This is just showing the "check your email" page
      const pendingEmail = searchParams.get('email');
      if (pendingEmail) {
        setEmail(pendingEmail);
      }
      // User is waiting to click email link - show waiting state
      setStatus('waiting');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleVerification = async () => {
    try {
      // Get the session after email verification
      const { data: { session }, error } = await supabaseRaw.auth.getSession();
      
      if (error) {
        throw error;
      }

      if (session) {
        setStatus('success');
        setTimeout(() => {
          navigate('/auth/callback', { replace: true });
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage('Verification link has expired or is invalid');
      }
    } catch (error: unknown) {
      console.error('Verification error:', error);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Verification failed. Please try again.';
      setErrorMessage(message);
    }
  };

  const handleResendEmail = async () => {
    if (!email || isResending) return;
    
    setIsResending(true);
    setResendSuccess(false);
    
    try {
      const { error } = await supabaseRaw.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
    } catch (error: unknown) {
      console.error('Resend error:', error);
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login', { replace: true });
  };

  // If we have an email, show the "check your email" page
  if (email && status === 'waiting') {
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md px-6 text-center"
        >
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-6 shadow-lg">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>

          {/* Email Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100">
              <Mail className="w-12 h-12 text-emerald-600" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-[#0f172a] mb-3">
            Verify your email
          </h1>
          
          <p className="text-[#64748b] mb-2">
            We've sent a verification link to:
          </p>
          
          <p className="text-emerald-600 font-semibold mb-6">
            {email}
          </p>

          <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-4 mb-6 border border-white/50">
            <p className="text-sm text-[#64748b]">
              Click the link in the email to verify your account. 
              If you don't see it, check your spam folder.
            </p>
          </div>

          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-100 text-emerald-700 rounded-xl p-3 mb-4 text-sm font-medium"
            >
              Verification email sent successfully!
            </motion.div>
          )}

          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-xl border border-white/40 rounded-full font-semibold text-[#0f172a] hover:bg-white/80 transition-all disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Resend verification email
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleBackToLogin}
              className="w-full px-4 py-3 text-[#64748b] font-semibold hover:text-[#0f172a] transition-colors"
            >
              Back to login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show verification status
  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex items-center justify-center">
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

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center px-6"
      >
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-6 shadow-lg">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>

        {/* Status Content */}
        {status === 'verifying' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Verifying your email...
            </h2>
            <p className="text-[#64748b]">
              Please wait while we confirm your email address
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Email Verified!
            </h2>
            <p className="text-[#64748b]">
              Redirecting to complete your setup...
            </p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Verification Failed
            </h2>
            <p className="text-red-600 text-sm max-w-sm mx-auto">
              {errorMessage}
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleBackToLogin}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Back to Login
            </motion.button>
          </motion.div>
        )}

        {status === 'expired' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <XCircle className="w-16 h-16 text-amber-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Link Expired
            </h2>
            <p className="text-[#64748b] text-sm max-w-sm mx-auto">
              The verification link has expired. Please request a new one.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleBackToLogin}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Back to Login
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
