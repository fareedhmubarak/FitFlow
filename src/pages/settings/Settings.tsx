import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { updateAllMembersWithPhotos } from '../../lib/memberPhoto';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Building2, Palette, Zap, Bell, Save, Upload, RefreshCw, LogOut, User, Mail, Shield, Download, Smartphone, Share, Plus, CheckCircle2, CreditCard, X, Trash2, Edit2, IndianRupee, Clock, MapPin, Phone, FileText, Paintbrush, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { settingsService, type MembershipPlan, type CreatePlanInput } from '../../lib/settingsService';
import ThemeSelector from '../../components/settings/ThemeSelector';
import { useTheme } from '../../contexts/ThemeContext';

// PWA Install Hook
function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { deferredPrompt, isInstalled, isIOS, isAndroid, isStandalone, promptInstall };
}

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, gym, logout, refreshGym } = useAuthStore();
  const queryClient = useQueryClient();
  const { theme: currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'app' | 'general' | 'plans' | 'theme' | 'notifications'>('profile');
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Gym Profile Form State
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

  // Basic Preferences Form State
  const [preferencesForm, setPreferencesForm] = useState({
    currency: '₹',
    invoice_prefix: 'INV-',
    grace_period_days: 7,
    gst_number: '',
  });

  // Membership Plan Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState<CreatePlanInput>({
    name: '',
    description: '',
    price: 0,
    base_duration_months: 1,
    bonus_duration_months: 0,
    is_active: true,
    features: [],
  });
  
  // Local state for input fields to allow clearing (empty string)
  const [baseDurationInput, setBaseDurationInput] = useState<string>('1');
  const [bonusMonthsInput, setBonusMonthsInput] = useState<string>('0');

  // Update form when gym changes
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

  // Fetch Membership Plans
  const { data: membershipPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => settingsService.getMembershipPlans(),
  });

  // Create Plan Mutation
  const createPlanMutation = useMutation({
    mutationFn: (input: CreatePlanInput) => settingsService.createMembershipPlan(input),
    onSuccess: () => {
      toast.success('Plan created successfully!');
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      setShowPlanModal(false);
      resetPlanForm();
      setBaseDurationInput('1');
      setBonusMonthsInput('0');
    },
    onError: () => toast.error('Failed to create plan'),
  });

  // Update Plan Mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreatePlanInput> }) =>
      settingsService.updateMembershipPlan(id, updates),
    onSuccess: () => {
      toast.success('Plan updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      setShowPlanModal(false);
      setEditingPlan(null);
      resetPlanForm();
      setBaseDurationInput('1');
      setBonusMonthsInput('0');
    },
    onError: () => toast.error('Failed to update plan'),
  });

  // Delete Plan Mutation
  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteMembershipPlan(id),
    onSuccess: () => {
      toast.success('Plan deleted!');
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
    onError: () => toast.error('Failed to delete plan'),
  });

  // Toggle Plan Status
  const togglePlanMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsService.togglePlanActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });

  // Update Gym Profile Mutation
  const updateGymMutation = useMutation({
    mutationFn: (updates: typeof gymForm) => settingsService.updateGymProfile(updates),
    onSuccess: () => {
      toast.success('Gym profile updated!');
      refreshGym?.();
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // Upload Logo
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

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      price: 0,
      base_duration_months: 1,
      bonus_duration_months: 0,
      is_active: true,
      features: [],
    });
    setBaseDurationInput('1');
    setBonusMonthsInput('0');
  };

  const openEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    // Extract base and bonus months from plan (check if they exist, otherwise calculate)
    const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
    const bonusMonths = (plan as any).bonus_duration_months || 0;
    
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      base_duration_months: baseMonths,
      bonus_duration_months: bonusMonths,
      is_active: plan.is_active,
      features: plan.features || [],
    });
    setBaseDurationInput(String(baseMonths));
    setBonusMonthsInput(String(bonusMonths));
    setShowPlanModal(true);
  };

  const handlePlanSubmit = () => {
    // Sync input values to form before submission
    const baseMonths = parseInt(baseDurationInput) || 1;
    const bonusMonths = parseInt(bonusMonthsInput) || 0;
    
    const finalForm = {
      ...planForm,
      base_duration_months: baseMonths,
      bonus_duration_months: bonusMonths,
    };
    
    if (!finalForm.name || finalForm.price <= 0 || !finalForm.base_duration_months || finalForm.base_duration_months < 1) {
      toast.error('Please fill in plan name, price, and base duration');
      return;
    }
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, updates: finalForm });
    } else {
      createPlanMutation.mutate(finalForm);
    }
  };

  const getDurationLabel = (days: number | null) => {
    if (!days) return 'Custom';
    if (days <= 30) return `${days} Days`;
    if (days <= 90) return `${Math.round(days / 30)} Months`;
    if (days <= 180) return '6 Months';
    if (days <= 365) return '1 Year';
    return `${Math.round(days / 365)} Years`;
  };
  
  // PWA Install
  const { deferredPrompt, isInstalled, isIOS, isAndroid, isStandalone, promptInstall } = usePWAInstall();

  const handleInstall = async () => {
    if (isIOS) {
      // Show iOS instructions - can't programmatically install on iOS
      toast('Tap the Share button below, then "Add to Home Screen"', {
        icon: '📱',
        duration: 5000,
      });
    } else if (deferredPrompt) {
      const installed = await promptInstall();
      if (installed) {
        toast.success('App installed successfully!');
      }
    } else {
      toast('Open in Chrome/Edge browser to install', {
        icon: '💡',
        duration: 4000,
      });
    }
  };

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
    { id: 'app', name: 'Install App', icon: Download },
    { id: 'general', name: 'Gym Profile', icon: Building2 },
    { id: 'plans', name: 'Membership Plans', icon: CreditCard },
    { id: 'theme', name: 'Theme', icon: Paintbrush },
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
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Header - Line 1: Logo | Title | Profile */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-50 overflow-visible"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <div className="text-center">
            <h1 className="text-base font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{t('settings.title')}</h1>
          </div>
          <UserProfileDropdown />
        </div>

        {/* Header - Line 2: Tab Dropdown Menu for Mobile */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTabMenu(!showTabMenu)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm border"
            style={{ 
              backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.8))', 
              borderColor: 'var(--theme-primary, #10b981)',
              color: 'var(--theme-text-primary, #0f172a)'
            }}
          >
            <div className="flex items-center gap-3">
              {(() => {
                const currentTab = tabs.find(t => t.id === activeTab);
                const IconComponent = currentTab?.icon || User;
                return (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <span>{currentTab?.name || 'Select'}</span>
                  </>
                );
              })()}
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${showTabMenu ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted, #64748b)' }} />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showTabMenu && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTabMenu(false)}
                />
                
                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-xl overflow-hidden z-50 border"
                  style={{ 
                    backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.95))',
                    borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  {tabs.map((tab, index) => (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setShowTabMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                        activeTab === tab.id ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20' : ''
                      }`}
                      style={{ 
                        color: activeTab === tab.id ? 'var(--theme-primary, #10b981)' : 'var(--theme-text-primary, #0f172a)',
                        borderBottom: index < tabs.length - 1 ? '1px solid var(--theme-glass-border, rgba(0,0,0,0.05))' : 'none'
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeTab === tab.id 
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                          : ''
                      }`}
                      style={activeTab !== tab.id ? { backgroundColor: 'var(--theme-glass-bg, rgba(0,0,0,0.05))' } : {}}
                      >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : ''}`} 
                          style={activeTab !== tab.id ? { color: 'var(--theme-text-muted, #64748b)' } : {}}
                        />
                      </div>
                      <span>{tab.name}</span>
                      {activeTab === tab.id && (
                        <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-[24px] p-5 shadow-lg mb-4"
          style={{ 
            backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))', 
            borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
            borderWidth: '1px'
          }}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* User Info Card */}
              <div className="flex flex-col items-center text-center pb-4" style={{ borderBottomWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg mb-2">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                  {user?.full_name || 'User'}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 capitalize">
                    {user?.role || 'Staff'}
                  </span>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Account Details</h3>
                
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.5))', borderWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))' }}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Email</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                      {user?.email || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.5))', borderWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))' }}>
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Gym</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                      {gym?.name || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-3" style={{ borderTopWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-full font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </>
                  )}
                </motion.button>
                <p className="text-xs text-center mt-2" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                  You are signed in as <span className="font-semibold">{user?.email}</span>
                </p>
              </div>
            </div>
          )}

          {/* Install App Tab */}
          {activeTab === 'app' && (
            <div className="space-y-5">
              {/* App Icon & Status */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-white/30">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg mb-3">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#0f172a]">Haefit</h2>
                <p className="text-sm text-slate-500">Gym Management App</p>
                
                {isStandalone || isInstalled ? (
                  <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">App Installed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 px-4 py-2 bg-amber-100 rounded-full">
                    <Download className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">Not Installed</span>
                  </div>
                )}
              </div>

              {/* Installation Instructions */}
              {!isStandalone && !isInstalled && (
                <div className="space-y-3">
                  {/* iOS Instructions */}
                  {isIOS && (
                    <div className="bg-white/50 rounded-xl p-3 border border-white/40">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                        </div>
                        <h3 className="text-xs font-bold text-[#0f172a]">Install on iPhone/iPad</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
                          <div>
                            <p className="text-xs text-slate-700">Tap the <strong>Share</strong> button</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Share className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] text-slate-500">at the bottom of Safari</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
                          <div>
                            <p className="text-xs text-slate-700">Scroll and tap <strong>"Add to Home Screen"</strong></p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Plus className="w-3 h-3 text-slate-500" />
                              <span className="text-[10px] text-slate-500">with the plus icon</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</div>
                          <p className="text-xs text-slate-700">Tap <strong>"Add"</strong> to confirm</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Android Instructions */}
                  {isAndroid && (
                    <div className="space-y-2">
                      {deferredPrompt ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleInstall}
                          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Install Haefit App
                        </motion.button>
                      ) : (
                        <div className="bg-white/50 rounded-xl p-3 border border-white/40">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                              <Smartphone className="w-4 h-4 text-green-600" />
                            </div>
                            <h3 className="text-xs font-bold text-[#0f172a]">Install on Android</h3>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
                              <p className="text-xs text-slate-700">Tap the <strong>menu (⋮)</strong> in Chrome</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
                              <p className="text-xs text-slate-700">Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</div>
                              <p className="text-xs text-slate-700">Tap <strong>"Install"</strong> to confirm</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desktop/Generic */}
                  {!isIOS && !isAndroid && (
                    <div className="bg-white/50 rounded-xl p-3 border border-white/40">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Download className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-xs font-bold text-[#0f172a]">Install App</h3>
                      </div>
                      {deferredPrompt ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleInstall}
                          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Install Haefit
                        </motion.button>
                      ) : (
                        <p className="text-xs text-slate-600">
                          Open this site in Chrome, Edge, or Safari on mobile to install as an app.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Already Installed */}
              {(isStandalone || isInstalled) && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-bold text-emerald-800">You're all set!</h3>
                      <p className="text-[10px] text-emerald-600">Haefit is installed on your device.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* App Features */}
              <div className="space-y-2 pt-3 border-t border-white/30">
                <h3 className="text-xs font-bold text-[#0f172a]">App Benefits</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: '⚡', text: 'Faster Loading' },
                    { icon: '📴', text: 'Works Offline' },
                    { icon: '🔔', text: 'Push Notifications' },
                    { icon: '📱', text: 'Native Feel' },
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-2 bg-white/50 rounded-lg border border-white/40">
                      <span className="text-sm">{benefit.icon}</span>
                      <span className="text-[10px] font-medium text-slate-700">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-3">
              {/* Logo Upload Section */}
              <div className="flex flex-col items-center pb-3 border-b border-white/30">
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
                      className="w-18 h-18 rounded-xl object-cover border-2 border-white/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-18 h-18 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-xl flex items-center justify-center border-2 border-white/50 shadow-lg">
                      <Building2 className="w-8 h-8 text-emerald-500" />
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    {isUploadingLogo ? (
                      <RefreshCw className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 text-white" />
                    )}
                  </motion.button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Tap to upload logo (Max 2MB)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Gym Name *
                  </label>
                  <input
                    type="text"
                    value={gymForm.name}
                    onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={gymForm.email}
                    onChange={(e) => setGymForm({ ...gymForm, email: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={gymForm.phone}
                    onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Timezone
                  </label>
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
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={gymForm.address}
                    onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                    placeholder="Street address, building name..."
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={gymForm.city}
                    onChange={(e) => setGymForm({ ...gymForm, city: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={gymForm.state}
                    onChange={(e) => setGymForm({ ...gymForm, state: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">
                    Pincode
                  </label>
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
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-2.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateGymMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Gym Profile
              </motion.button>
            </div>
          )}

          {/* Membership Plans Tab */}
          {activeTab === 'plans' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0f172a]">Membership Plans</h3>
                  <p className="text-[10px] text-slate-500">Manage your gym's membership options</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    resetPlanForm();
                    setEditingPlan(null);
                    setShowPlanModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-3 h-3" />
                  Add Plan
                </motion.button>
              </div>

              {plansLoading ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : membershipPlans.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No membership plans yet</p>
                  <p className="text-[10px] text-slate-400">Create your first plan to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {membershipPlans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border ${plan.is_active ? 'bg-white/60 border-white/50' : 'bg-slate-100/60 border-slate-200/50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-[#0f172a]">{plan.name}</h4>
                            {!plan.is_active && (
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[8px] font-medium">
                                Inactive
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{plan.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold">
                              <IndianRupee className="w-3 h-3" />
                              {plan.price.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                              <Clock className="w-2.5 h-2.5" />
                              {(() => {
                                const planAny = plan as any;
                                const baseMonths = planAny.base_duration_months || planAny.duration_months || (planAny.duration_days ? Math.round(planAny.duration_days / 30) : 1);
                                const bonusMonths = planAny.bonus_duration_months || 0;
                                const totalMonths = baseMonths + bonusMonths;
                                if (bonusMonths > 0) {
                                  return `${totalMonths} months (${baseMonths} + ${bonusMonths} FREE)`;
                                }
                                return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEditPlan(plan)}
                            className="w-7 h-7 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this plan?')) {
                                deletePlanMutation.mutate(plan.id);
                              }
                            }}
                            className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0f172a]">App Theme</h3>
                  <p className="text-[10px] text-slate-500">Choose your preferred color theme</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/60 border border-white/50">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentTheme.preview.primary }}
                  />
                  <span className="text-[10px] font-medium text-[#0f172a]">{currentTheme.name}</span>
                </div>
              </div>

              <ThemeSelector />

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/50">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Theme Applied Instantly</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Your theme preference is saved automatically. The app will remember your choice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-2">
              <p className="text-[10px] text-[#64748b] font-medium mb-2">
                Configure notification preferences
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-white/40 rounded-xl border border-white/50">
                  <div>
                    <p className="text-xs font-semibold text-[#0f172a]">
                      Email Notifications
                    </p>
                    <p className="text-[10px] text-[#64748b]">
                      Receive email updates about payments and members
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white/40 rounded-xl border border-white/50">
                  <div>
                    <p className="text-xs font-semibold text-[#0f172a]">
                      SMS Reminders
                    </p>
                    <p className="text-[10px] text-[#64748b]">
                      Send SMS reminders for payments and classes
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white/40 rounded-xl border border-white/50">
                  <div>
                    <p className="text-xs font-semibold text-[#0f172a]">
                      WhatsApp Notifications
                    </p>
                    <p className="text-[10px] text-[#64748b]">
                      Send updates via WhatsApp Business API
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Membership Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowPlanModal(false);
              resetPlanForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPlan ? 'Edit Plan' : 'Add New Plan'}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowPlanModal(false);
                    resetPlanForm();
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g., Monthly Basic"
                    className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={planForm.description || ''}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Brief description of the plan..."
                    className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                      Base Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={baseDurationInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBaseDurationInput(val);
                        const numVal = parseInt(val);
                        if (!isNaN(numVal) && numVal >= 1) {
                          setPlanForm({ ...planForm, base_duration_months: numVal });
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (!val || val === '' || parseInt(val) < 1) {
                          setBaseDurationInput('1');
                          setPlanForm({ ...planForm, base_duration_months: 1 });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      placeholder="e.g., 12"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                      Bonus Months (FREE)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bonusMonthsInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBonusMonthsInput(val);
                        const numVal = parseInt(val);
                        if (!isNaN(numVal) && numVal >= 0) {
                          setPlanForm({ ...planForm, bonus_duration_months: numVal });
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (!val || val === '' || parseInt(val) < 0) {
                          setBonusMonthsInput('0');
                          setPlanForm({ ...planForm, bonus_duration_months: 0 });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                      placeholder="e.g., 8"
                    />
                  </div>
                </div>

                {/* Total Duration Preview */}
                {(() => {
                  const baseMonths = parseInt(baseDurationInput) || 1;
                  const bonusMonths = parseInt(bonusMonthsInput) || 0;
                  return bonusMonths > 0 && (
                    <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                      <p className="text-sm text-emerald-800">
                        <span className="font-semibold">Total Membership:</span> {baseMonths + bonusMonths} months
                        <span className="text-emerald-600 font-medium ml-1">
                          (Pay for {baseMonths}, Get {bonusMonths} FREE!)
                        </span>
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-sm font-medium text-slate-900">Active Plan</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.is_active}
                      onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-cyan-500"></div>
                  </label>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlanSubmit}
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
