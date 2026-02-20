import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { RefreshCw, LogOut, Mail, Shield, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 px-4 pt-16 pb-2"
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
            {t('settings.title')}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-24" style={{ overscrollBehavior: 'contain' }}>
        <div
          className="backdrop-blur-xl rounded-[24px] p-5 shadow-lg"
          style={{
            backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))',
            borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
            borderWidth: '1px'
          }}
        >
          {/* User Info */}
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
          <div className="space-y-2 pt-4">
            <h3 className="text-xs font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Account Details</h3>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', borderWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))' }}>
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
          </div>

          {/* Sign Out */}
          <div className="pt-5">
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
      </div>
    </div>
  );
}
