import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auditLogger } from '@/lib/auditLogger';

interface MemberCardProps {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string | null;
  amount?: number;
  date?: string;
  dateLabel?: string;
  status?: 'active' | 'inactive' | 'overdue' | 'due_today' | 'upcoming';
  planName?: string;
  showActions?: boolean;
  onClick?: () => void;
  onWhatsApp?: (e: React.MouseEvent) => void;
  onCall?: (e: React.MouseEvent) => void;
  delay?: number;
}

/**
 * MemberCard - Compact member card for lists with optional actions
 * 
 * Design System:
 * - Background: bg-white/25 backdrop-blur-md
 * - Border: border border-white/40 rounded-2xl
 * - Avatar: 36x36 with colored ring based on status
 * - Name: text-xs font-semibold text-gray-800
 * - Date: text-[10px] font-medium text-gray-500
 * - Amount: text-xs font-bold (color based on type)
 * - Action buttons: compact gradient pills
 */
export function MemberCard({
  id,
  name,
  phone,
  photoUrl,
  amount,
  date,
  dateLabel,
  status = 'active',
  planName,
  showActions = true,
  onClick,
  onWhatsApp,
  onCall,
  delay = 0
}: MemberCardProps) {
  
  const getStatusStyles = () => {
    switch (status) {
      case 'overdue':
        return { ring: 'ring-red-400', dot: 'bg-red-500', amountColor: 'text-red-600' };
      case 'due_today':
        return { ring: 'ring-amber-400', dot: 'bg-amber-500', amountColor: 'text-amber-600' };
      case 'upcoming':
        return { ring: 'ring-blue-400', dot: 'bg-blue-500', amountColor: 'text-blue-600' };
      case 'inactive':
        return { ring: 'ring-gray-400', dot: 'bg-gray-500', amountColor: 'text-gray-600' };
      default:
        return { ring: 'ring-emerald-400', dot: 'bg-emerald-500', amountColor: 'text-emerald-600' };
    }
  };

  const styles = getStatusStyles();

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWhatsApp) {
      onWhatsApp(e);
    } else {
      const message = `Hi ${name}, this is a reminder regarding your gym membership.`;
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
      auditLogger.logWhatsAppShared(id, name, 'membership_reminder');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCall) {
      onCall(e);
    } else {
      window.open(`tel:${phone}`, '_self');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`bg-white/25 backdrop-blur-md border border-white/40 rounded-2xl p-2.5 shadow-lg ${onClick ? 'cursor-pointer active:bg-white/30' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar with status ring */}
        <div className="relative flex-shrink-0">
          <Avatar className={`w-9 h-9 ring-2 ${styles.ring}`}>
            <AvatarImage src={photoUrl || undefined} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 text-xs font-bold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Status dot */}
          <motion.div 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${styles.dot} rounded-full border-2 border-white`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Member info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-gray-800 truncate">{name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {date && (
              <span className="text-[10px] font-medium text-gray-500">
                {dateLabel && `${dateLabel}: `}{date}
              </span>
            )}
            {planName && !date && (
              <span className="text-[10px] font-medium text-gray-500 capitalize">
                {planName.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        {amount !== undefined && (
          <div className="text-right flex-shrink-0">
            <p className={`text-xs font-bold ${styles.amountColor}`}>
              ₹{amount.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-1 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleWhatsApp}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm shadow-green-400/30"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCall}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-sm shadow-blue-400/30"
            >
              <Phone className="w-3.5 h-3.5 text-white" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default MemberCard;
