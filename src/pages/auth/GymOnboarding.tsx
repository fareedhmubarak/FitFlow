import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabaseRaw } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'framer-motion';
import { Building2, Phone, Globe, Loader2, Dumbbell, ChevronRight, Check } from 'lucide-react';

interface LocationState {
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee', symbol: '₹' },
  { value: 'USD', label: '$ US Dollar', symbol: '$' },
  { value: 'EUR', label: '€ Euro', symbol: '€' },
  { value: 'GBP', label: '£ British Pound', symbol: '£' },
  { value: 'AED', label: 'د.إ UAE Dirham', symbol: 'د.إ' },
  { value: 'SGD', label: 'S$ Singapore Dollar', symbol: 'S$' },
  { value: 'AUD', label: 'A$ Australian Dollar', symbol: 'A$' },
];

export default function GymOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const { setUser, setGym } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    gymName: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.gymName.trim()) {
      setError('Gym name is required');
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.gymName.trim()) {
      setError('Gym name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabaseRaw.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create gym
      const { data: gym, error: gymError } = await supabaseRaw
        .from('gym_gyms')
        .insert({
          name: formData.gymName,
          email: state?.email || user.email,
          phone: formData.phone || null,
          timezone: formData.timezone,
          currency: formData.currency,
          language: 'en',
        })
        .select()
        .single();

      if (gymError) {
        throw gymError;
      }

      // Create gym user (owner)
      const { data: gymUser, error: userError } = await supabaseRaw
        .from('gym_users')
        .insert({
          gym_id: gym.id,
          auth_user_id: user.id,
          email: state?.email || user.email,
          full_name: state?.fullName || user.user_metadata?.full_name || 'Gym Owner',
          role: 'owner',
          is_active: true,
        })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      // Update auth store
      setUser(gymUser);
      setGym(gym);

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('Onboarding error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create gym. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex items-center justify-center overflow-auto p-4">
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
          <h1 className="text-2xl font-bold text-[#0f172a] mb-1">
            Set up your gym
          </h1>
          <p className="text-[#64748b] text-sm">
            {state?.fullName ? `Welcome, ${state.fullName}!` : 'Welcome!'} Let's get started
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s !== 3 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s < step
                    ? 'bg-emerald-500 text-white'
                    : s === step
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                    : 'bg-white/60 text-[#64748b]'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s !== 3 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    s < step ? 'bg-emerald-500' : 'bg-white/60'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 border border-white/50"
        >
          {/* Step 1: Gym Name */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-[#0f172a]">What's your gym called?</h2>
                <p className="text-sm text-[#64748b]">This will be visible to your members</p>
              </div>

              <div>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="gymName"
                    value={formData.gymName}
                    onChange={handleChange}
                    placeholder="e.g., FitLife Gym"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-base"
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact & Location */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-[#0f172a]">Contact & Location</h2>
                <p className="text-sm text-[#64748b]">Optional but recommended</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g., +91 9876543210"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-base"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Timezone & Currency */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-[#0f172a]">Regional Settings</h2>
                <p className="text-sm text-[#64748b]">Set your timezone and currency</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-base appearance-none"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  Currency
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₹'}
                  </span>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-base appearance-none"
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-100/60 border-2 border-red-200/50 rounded-2xl p-3 text-center"
            >
              <p className="text-red-800 text-xs font-medium">{error}</p>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 py-3.5 px-4 rounded-full font-bold bg-white/60 text-[#64748b] hover:bg-white/80 transition-all border border-white/40"
              >
                Back
              </motion.button>
            )}
            
            {step < 3 ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Gym
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
