import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

export default function Sidebar() {
  const { t } = useTranslation();
  const gym = useAuthStore((state) => state.gym);

  const navigation = [
    { name: t('nav.dashboard'), to: '/dashboard', icon: '📊' },
    { name: t('nav.members'), to: '/members', icon: '👥' },
    { name: t('nav.payments'), to: '/payments', icon: '💰' },
    { name: t('nav.classes'), to: '/classes', icon: '🏋️' },
    { name: t('nav.staff'), to: '/staff', icon: '👔' },
    { name: t('nav.leads'), to: '/leads', icon: '🎯' },
    { name: t('nav.reports'), to: '/reports', icon: '📈' },
    { name: t('nav.settings'), to: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-primary">
          {t('common.appName')}
        </h1>
      </div>

      {/* Gym Name */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {gym?.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} className="w-10 h-10 rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              {gym?.name?.charAt(0) || 'G'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {gym?.name || 'My Gym'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {gym?.city || 'India'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
          v1.0.0 • Made with ❤️ in India
        </div>
      </div>
    </div>
  );
}
