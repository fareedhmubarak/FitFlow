import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Building2, Save, Upload, RefreshCw, ArrowLeft } from 'lucide-react';
import { settingsService } from '../../lib/settingsService';

export default function GymProfilePage() {
  const navigate = useNavigate();
  const { gym, refreshGym } = useAuthStore();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [gymForm, setGymForm] = useState({
    name: gym?.name || '',
    email: gym?.email || '',
    phone: gym?.phone || '',
    address: gym?.address || '',
    city: gym?.city || '',
    state: gym?.state || '',
    pincode: gym?.pincode || '',
    timezone: gym?.timezone || 'Asia/Kolkata',
  });

  useEffect(() => {
    if (gym) {
      setGymForm({
        name: gym.name || '',
        email: gym.email || '',
        phone: gym.phone || '',
        address: gym.address || '',
        city: gym.city || '',
        state: gym.state || '',
        pincode: gym.pincode || '',
        timezone: gym.timezone || 'Asia/Kolkata',
      });
    }
  }, [gym]);

  const updateGymMutation = useMutation({
    mutationFn: (updates: typeof gymForm) => settingsService.updateGymProfile(updates),
    onSuccess: () => {
      toast.success('Gym profile updated!');
      refreshGym?.();
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      await settingsService.uploadLogo(file);
      toast.success('Logo uploaded successfully!');
      refreshGym?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-12 pb-2"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
            Gym Profile
          </h1>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-4 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-[24px] p-5 shadow-lg"
          style={{
            backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))',
            borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
            borderWidth: '1px'
          }}
        >
          {/* Logo Upload */}
          <div className="flex items-center gap-3 pb-4" style={{ borderBottomWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="relative">
              {gym?.logo_url ? (
                <img
                  src={gym.logo_url}
                  alt="Gym Logo"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-white/50 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-xl flex items-center justify-center border-2 border-white/50 shadow-lg">
                  <Building2 className="w-6 h-6 text-emerald-500" />
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
              >
                {isUploadingLogo ? (
                  <RefreshCw className="w-2.5 h-2.5 text-white animate-spin" />
                ) : (
                  <Upload className="w-2.5 h-2.5 text-white" />
                )}
              </motion.button>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{gym?.name || 'Your Gym'}</p>
              <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Tap icon to upload logo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Gym Name *</label>
              <input
                type="text"
                value={gymForm.name}
                onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Email</label>
              <input
                type="email"
                value={gymForm.email}
                onChange={(e) => setGymForm({ ...gymForm, email: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Phone</label>
              <input
                type="tel"
                value={gymForm.phone}
                onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Timezone</label>
              <select
                value={gymForm.timezone}
                onChange={(e) => setGymForm({ ...gymForm, timezone: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Address</label>
              <textarea
                rows={2}
                value={gymForm.address}
                onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                placeholder="Street address, building name..."
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">City</label>
              <input
                type="text"
                value={gymForm.city}
                onChange={(e) => setGymForm({ ...gymForm, city: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">State</label>
              <input
                type="text"
                value={gymForm.state}
                onChange={(e) => setGymForm({ ...gymForm, state: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Pincode</label>
              <input
                type="text"
                value={gymForm.pincode}
                onChange={(e) => setGymForm({ ...gymForm, pincode: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => updateGymMutation.mutate(gymForm)}
            disabled={updateGymMutation.isPending}
            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updateGymMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Profile
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
