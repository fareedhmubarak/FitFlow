import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseRaw } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Dumbbell } from 'lucide-react';
import { auditLogger } from '../../lib/auditLogger';

type CallbackStatus = 'processing' | 'success' | 'error' | 'needs_gym';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const { setUser, setGym } = useAuthStore();

  useEffect(() => {
    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Check for error in URL params
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Get the session from Supabase
      const { data: { session }, error: sessionError } = await supabaseRaw.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        // Try to exchange the code for a session
        const { data, error: exchangeError } = await supabaseRaw.auth.exchangeCodeForSession(
          window.location.href
        );
        
        if (exchangeError) {
          throw exchangeError;
        }

        if (!data.session) {
          throw new Error('No session returned');
        }
      }

      // Get current session
      const { data: { user } } = await supabaseRaw.auth.getUser();
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a gym
      const { data: existingGymUser, error: gymUserError } = await supabaseRaw
        .from('gym_users')
        .select(`
          *,
          gym:gym_gyms(*)
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (gymUserError && gymUserError.code !== 'PGRST116') {
        console.error('Error fetching gym user:', gymUserError);
      }

      if (existingGymUser && existingGymUser.gym) {
        // User already has a gym, log them in
        setUser(existingGymUser);
        setGym(existingGymUser.gym);
        setStatus('success');

        auditLogger.log({
          category: 'AUTH',
          action: 'user_login',
          resourceType: 'user',
          resourceId: user.id,
          resourceName: user.email || '',
          success: true,
          metadata: { type: 'oauth_callback_completed', has_gym: true },
        });
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        // New user, needs to create/join a gym
        setStatus('needs_gym');

        auditLogger.log({
          category: 'AUTH',
          action: 'user_login',
          resourceType: 'user',
          resourceId: user.id,
          resourceName: user.email || '',
          success: true,
          metadata: { type: 'oauth_callback_completed', has_gym: false, needs_onboarding: true },
        });
        
        setTimeout(() => {
          navigate('/onboarding', { 
            replace: true,
            state: { 
              email: user.email,
              fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
              avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            }
          });
        }, 1500);
      }
    } catch (error: unknown) {
      console.error('Auth callback error:', error);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setErrorMessage(message);
    }
  };

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

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
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Signing you in...
            </h2>
            <p className="text-[#64748b]">
              Please wait while we verify your account
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
              Welcome back!
            </h2>
            <p className="text-[#64748b]">
              Redirecting to your dashboard...
            </p>
          </motion.div>
        )}

        {status === 'needs_gym' && (
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
              Account verified!
            </h2>
            <p className="text-[#64748b]">
              Let's set up your gym...
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
              Authentication Failed
            </h2>
            <p className="text-red-600 text-sm max-w-sm mx-auto">
              {errorMessage}
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
