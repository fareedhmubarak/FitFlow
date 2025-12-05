import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useAppReady } from '../contexts/AppReadyContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SplashScreen() {
  const { isDataReady, setSplashComplete, shouldShowSplash, setDataReady } = useAppReady();
  const [phase, setPhase] = useState<'logo' | 'expand' | 'waiting' | 'exit'>('logo');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const exitTriggeredRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication during splash
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
      setAuthChecked(true);
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (!shouldShowSplash) {
      setSplashComplete();
      return;
    }

    // Phase 1: Logo animation (0-1.2s)
    const logoTimer = setTimeout(() => {
      setPhase('expand');
    }, 1200);

    // Phase 2: Expand animation (1.2s-2s) then wait for data
    const expandTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(expandTimer);
    };
  }, [shouldShowSplash, setSplashComplete]);

  // Handle exit and navigation
  useEffect(() => {
    // Wait for both: min time elapsed AND auth checked
    if (minTimeElapsed && authChecked && !exitTriggeredRef.current) {
      // For dashboard route, also wait for data to be ready
      const isDashboardRoute = location.pathname === '/' || location.pathname === '';
      const shouldWaitForData = isDashboardRoute && isAuthenticated;
      
      if (shouldWaitForData && !isDataReady) {
        // Still waiting for dashboard data
        return;
      }
      
      exitTriggeredRef.current = true;
      
      // Trigger exit animation
      const exitTimer = setTimeout(() => {
        setPhase('exit');
      }, 10);
      
      // Complete and navigate after exit animation
      const completeTimer = setTimeout(() => {
        setSplashComplete();
        
        // Navigate based on auth status and current route
        if (!isAuthenticated) {
          // Not logged in - go to login
          if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/forgot-password') {
            navigate('/login', { replace: true });
          }
        } else {
          // Logged in - if on auth routes or invalid routes, go to dashboard
          const authRoutes = ['/login', '/signup', '/forgot-password'];
          if (authRoutes.includes(location.pathname)) {
            navigate('/', { replace: true });
          }
          // Otherwise stay on current route (dashboard, members, etc.)
        }
      }, 510);
      
      return () => {
        clearTimeout(exitTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [minTimeElapsed, authChecked, isAuthenticated, isDataReady, location.pathname, navigate, setSplashComplete]);

  // Auto-trigger data ready for non-dashboard routes after auth check
  useEffect(() => {
    if (authChecked && minTimeElapsed) {
      const isDashboardRoute = location.pathname === '/' || location.pathname === '';
      if (!isDashboardRoute || !isAuthenticated) {
        // For non-dashboard routes or unauthenticated users, signal data ready immediately
        setDataReady();
      }
    }
  }, [authChecked, minTimeElapsed, location.pathname, isAuthenticated, setDataReady]);

  // If splash shouldn't show, render nothing
  if (!shouldShowSplash) {
    return null;
  }

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          style={{ 
            background: 'var(--theme-bg, #E0F2FE)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Animated Background Blobs - matching theme */}
          <motion.div
            className="absolute w-[150vw] h-[150vh] rounded-full blur-[120px]"
            style={{
              background: 'var(--theme-blob1, #6EE7B7)',
              opacity: 0.6,
            }}
            initial={{ x: '-60%', y: '-60%', scale: 0.8 }}
            animate={{ 
              x: ['-60%', '-40%', '-60%'],
              y: ['-60%', '-50%', '-60%'],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
          
          <motion.div
            className="absolute w-[150vw] h-[150vh] rounded-full blur-[120px]"
            style={{
              background: 'var(--theme-blob2, #FCA5A5)',
              opacity: 0.5,
            }}
            initial={{ x: '40%', y: '40%', scale: 0.8 }}
            animate={{ 
              x: ['40%', '20%', '40%'],
              y: ['40%', '30%', '40%'],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: 'easeInOut',
              delay: 0.5 
            }}
          />

          {/* Center gradient glow */}
          <motion.div
            className="absolute w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, var(--theme-primary, #10b981) 0%, transparent 70%)',
              opacity: 0.3,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: phase === 'expand' ? 3 : 1, 
              opacity: phase === 'expand' ? 0.5 : 0.3 
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Logo Container */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, opacity: 0, rotateY: -180 }}
            animate={{ 
              scale: phase === 'expand' ? 1.5 : 1, 
              opacity: 1, 
              rotateY: 0 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 20,
              delay: 0.2
            }}
          >
            {/* Logo Icon with Glow Effect */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  'drop-shadow(0 0 20px var(--theme-primary, #10b981))',
                  'drop-shadow(0 0 40px var(--theme-primary, #10b981))',
                  'drop-shadow(0 0 20px var(--theme-primary, #10b981))',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Outer ring animation */}
              <motion.div
                className="absolute inset-[-20px] rounded-full"
                style={{
                  border: '3px solid var(--theme-primary, #10b981)',
                  opacity: 0.3,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              
              {/* Second ring */}
              <motion.div
                className="absolute inset-[-35px] rounded-full"
                style={{
                  border: '2px solid var(--theme-primary, #10b981)',
                  opacity: 0.2,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.6, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />

              {/* Main Logo Container */}
              <motion.div
                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, var(--theme-primary, #10b981) 0%, var(--theme-primary-hover, #059669) 100%)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={{ 
                    rotateZ: [0, 10, -10, 0],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: 'easeInOut' 
                  }}
                >
                  <Dumbbell className="w-12 h-12 text-white" strokeWidth={2.5} />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* App Name */}
            <motion.div
              className="mt-6 flex flex-col items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.h1
                className="text-4xl font-black tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--theme-primary, #10b981) 0%, var(--theme-text-primary, #0f172a) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                FitFlow
              </motion.h1>
              
              <motion.p
                className="text-sm font-medium mt-1"
                style={{ color: 'var(--theme-text-secondary, #475569)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Gym Management Made Simple
              </motion.p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              className="mt-8 flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--theme-primary, #10b981)' }}
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Bottom gradient fade */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: 'linear-gradient(to top, var(--theme-bg, #E0F2FE), transparent)',
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
