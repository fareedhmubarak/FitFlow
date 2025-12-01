import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from './ActionButton';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
  rightContent?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Consistent page header with title, back button, and actions
 * 
 * Design System:
 * - Title: text-base font-bold text-gray-800
 * - Subtitle: text-[10px] font-medium text-gray-500
 * - Icon buttons: glass style
 * - Animation: fade in from top
 */
export function PageHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showRefresh = false,
  onRefresh,
  refreshing = false,
  showLogout = false,
  onLogout,
  rightContent,
  icon,
  className = ''
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-shrink-0 px-3 pt-3 pb-2 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <IconButton 
              icon={ArrowLeft} 
              onClick={handleBack}
              variant="glass"
              size="sm"
            />
          )}
          
          {icon && (
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
            >
              {icon}
            </motion.div>
          )}
          
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base font-bold text-gray-800"
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[10px] font-medium text-gray-500"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightContent}
          
          {showRefresh && (
            <IconButton 
              icon={RefreshCw} 
              onClick={onRefresh}
              variant="glass"
              size="sm"
              className={refreshing ? 'animate-spin' : ''}
            />
          )}
          
          {showLogout && (
            <IconButton 
              icon={LogOut} 
              onClick={onLogout}
              variant="glass"
              size="sm"
              color="text-red-500"
            />
          )}
        </div>
      </div>
    </motion.header>
  );
}

export default PageHeader;
