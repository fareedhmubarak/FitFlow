import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseRaw } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { User, Building2, Mail, Lock, AlertCircle, Dumbbell } from 'lucide-react';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    gymName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.weakPassword'));
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase Auth (with email verification)
      const { data: authData, error: authError } = await supabaseRaw.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          data: {
            full_name: formData.fullName,
            gym_name: formData.gymName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Check if email confirmation is required
      if (authData.user.identities?.length === 0) {
        setError('This email is already registered. Please login instead.');
        return;
      }

      // If email confirmation is required, redirect to verify page
      if (!authData.session) {
        navigate(`/auth/verify?email=${encodeURIComponent(formData.email)}`);
        return;
      }

      // If session exists (email confirmation disabled), create gym immediately
      // 2. Create gym
      const { data: gym, error: gymError } = await supabaseRaw
        .from('gym_gyms')
        .insert({
          name: formData.gymName,
          email: formData.email,
        })
        .select()
        .single();

      if (gymError) throw gymError;

      // 3. Create gym user (owner)
      const { error: userError } = await supabaseRaw
        .from('gym_users')
        .insert({
          gym_id: gym.id,
          auth_user_id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'owner',
          is_active: true,
        });

      if (userError) throw userError;

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-auto p-4"
      style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}
    >
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
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full blur-[80px] opacity-50 pointer-events-none"
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
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
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full blur-[80px] opacity-50 pointer-events-none"
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-3 shadow-lg">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] mb-1">
            {t('common.appName')}
          </h1>
          <p className="text-[#64748b] text-sm font-medium">
            {t('auth.signUpTitle')}
          </p>
        </motion.div>

        {/* Signup Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 border border-white/50"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-[#64748b] mb-1.5">
                {t('common.fullName') || 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Gym Name */}
            <div>
              <label htmlFor="gymName" className="block text-xs font-semibold text-[#64748b] mb-1.5">
                {t('settings.gymName')}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="gymName"
                  name="gymName"
                  type="text"
                  required
                  value={formData.gymName}
                  onChange={handleChange}
                  placeholder={t('auth.gymNamePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#64748b] mb-1.5">
                {t('common.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#64748b] mb-1.5">
                {t('common.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#64748b] mb-1.5">
                {t('common.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('common.confirmPassword')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100/60 border-2 border-red-200/50 rounded-[16px] p-3 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-xs font-medium">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 px-4 rounded-full font-bold hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-lg shadow-emerald-500/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  {t('common.loading')}
                </span>
              ) : (
                t('common.signup')
              )}
            </motion.button>
          </form>

          {/* Social Login Buttons */}
          <SocialLoginButtons 
            mode="signup" 
            onError={(err) => setError(err)}
            disabled={isLoading}
          />

          {/* Login Link */}
          <div className="mt-5 text-center">
            <p className="text-[#64748b] text-sm">
              {t('auth.alreadyHaveAccount')}{' '}
              <a href="/login" className="text-emerald-600 font-bold hover:text-emerald-700">
                {t('auth.signInHere')}
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
