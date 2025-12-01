import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { updateAllMembersWithPhotos } from '../../lib/memberPhoto';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ChevronLeft, Building2, Palette, Zap, Bell, Save, Upload, RefreshCw, LogOut, User, Mail, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, gym, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'general' | 'branding' | 'features' | 'notifications'>('profile');
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUpdateMemberPhotos = async () => {
    setIsUpdatingPhotos(true);
    try {
      const result = await updateAllMembersWithPhotos();
      toast.success(`Updated ${result.updated} member photos!`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (error) {
      console.error('Error updating photos:', error);
      toast.error('Failed to update member photos');
    } finally {
      setIsUpdatingPhotos(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'My Profile', icon: User },
    { id: 'general', name: t('settings.gymSettings'), icon: Building2 },
    { id: 'branding', name: t('settings.branding'), icon: Palette },
    { id: 'features', name: t('settings.features'), icon: Zap },
    { id: 'notifications', name: t('settings.notifications'), icon: Bell },
  ];

  const features = [
    { id: 'biometric', name: t('settings.biometricAccess'), enabled: false },
    { id: 'classBooking', name: t('settings.classBooking'), enabled: true },
    { id: 'personalTraining', name: t('settings.personalTraining'), enabled: true },
    { id: 'pos', name: t('settings.pos'), enabled: false },
    { id: 'nutrition', name: t('settings.nutritionTracking'), enabled: false },
    { id: 'leads', name: t('settings.leadManagement'), enabled: true },
    { id: 'sms', name: t('settings.smsNotifications'), enabled: true },
    { id: 'email', name: t('settings.emailMarketing'), enabled: false },
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden">
      {/* Safe Area Background Extensions */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-[#E0F2FE] z-[200]" />
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-[#E0F2FE] z-[200]" />

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

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-5 pb-3 relative z-10"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-[#1e293b]"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#0f172a]">{t('settings.title')}</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Tab Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 backdrop-blur-xl rounded-[24px] p-5 shadow-lg border border-white/50 mb-4"
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* User Info Card */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-white/30">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-3">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2 className="text-xl font-bold text-[#0f172a]">
                  {user?.full_name || 'User'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-600 capitalize">
                    {user?.role || 'Staff'}
                  </span>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#0f172a]">Account Details</h3>
                
                <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-white/40">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#64748b]">Email</p>
                    <p className="text-sm font-semibold text-[#0f172a] truncate">
                      {user?.email || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-white/40">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#64748b]">Gym</p>
                    <p className="text-sm font-semibold text-[#0f172a] truncate">
                      {gym?.name || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-4 border-t border-white/30">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </>
                  )}
                </motion.button>
                <p className="text-xs text-center text-[#64748b] mt-2">
                  You are signed in as <span className="font-semibold">{user?.email}</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    {t('settings.gymName')}
                  </label>
                  <input
                    type="text"
                    defaultValue={gym?.name || ''}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={gym?.email || ''}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    defaultValue={gym?.phone || ''}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    {t('settings.timezone')}
                  </label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm">
                    <option>Asia/Kolkata (IST)</option>
                    <option>Asia/Dubai (GST)</option>
                    <option>America/New_York (EST)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={gym?.address || ''}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t('common.save')} {t('settings.gymSettings')}
              </motion.button>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-2">
                  {t('settings.logo')}
                </label>
                <div className="flex items-center gap-4">
                  {gym?.logo_url ? (
                    <img src={gym.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border-2 border-white/50 shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 bg-white/40 rounded-xl flex items-center justify-center text-slate-400 border border-white/50">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-white/60 text-[#0f172a] rounded-xl hover:bg-white/80 transition-colors flex items-center gap-2 text-sm font-semibold"
                  >
                    <Upload className="w-4 h-4" />
                    Upload New Logo
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    {t('settings.primaryColor')}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      defaultValue="#10b981"
                      className="w-12 h-10 rounded-lg border border-white/40 bg-white/60"
                    />
                    <input
                      type="text"
                      defaultValue="#10b981"
                      className="flex-1 px-3 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    {t('settings.secondaryColor')}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      defaultValue="#06b6d4"
                      className="w-12 h-10 rounded-lg border border-white/40 bg-white/60"
                    />
                    <input
                      type="text"
                      defaultValue="#06b6d4"
                      className="flex-1 px-3 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t('common.save')} {t('settings.branding')}
              </motion.button>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748b] font-medium mb-3">
                Enable or disable features for your gym
              </p>

              {/* Member Photos Update Section */}
              <div className="mb-4 p-4 bg-blue-100/60 backdrop-blur-md border-2 border-blue-200/50 rounded-[16px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Update Member Photos
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Generate realistic profile photos for all members based on their gender
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateMemberPhotos}
                    disabled={isUpdatingPhotos}
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold whitespace-nowrap"
                  >
                    {isUpdatingPhotos ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Update All
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-3 bg-white/40 rounded-[16px] border border-white/50"
                  >
                    <span className="text-xs font-semibold text-[#0f172a]">
                      {feature.name}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={feature.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <p className="text-xs text-[#64748b] font-medium mb-3">
                Configure notification preferences
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/40 rounded-[16px] border border-white/50">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">
                      Email Notifications
                    </p>
                    <p className="text-xs text-[#64748b]">
                      Receive email updates about payments and members
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/40 rounded-[16px] border border-white/50">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">
                      SMS Reminders
                    </p>
                    <p className="text-xs text-[#64748b]">
                      Send SMS reminders for payments and classes
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/40 rounded-[16px] border border-white/50">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">
                      WhatsApp Notifications
                    </p>
                    <p className="text-xs text-[#64748b]">
                      Send updates via WhatsApp Business API
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
