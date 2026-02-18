import { motion } from 'framer-motion';
import { Cake, MessageCircle, Send } from 'lucide-react';
import { useBirthdayMembers, useUpcomingBirthdays } from '@/hooks/useDashboardData';
import { useAuthStore } from '@/stores/authStore';
import { gymService } from '@/lib/gymService';
import type { Member } from '@/types/database';

interface BirthdayCardProps {
  onSendAll?: (members: Member[]) => void;
}

export default function BirthdayCard({ onSendAll }: BirthdayCardProps) {
  const { gym } = useAuthStore();
  const { data: todayBirthdays = [] } = useBirthdayMembers();
  const { data: upcomingBirthdays = [] } = useUpcomingBirthdays(7);

  if (todayBirthdays.length === 0 && upcomingBirthdays.length === 0) return null;

  const handleWhatsAppWish = (member: Member) => {
    const message = `Happy Birthday ${member.full_name}! 🎂🎉 Wishing you a wonderful year ahead! Stay fit & healthy 💪\n- ${gym?.name || 'Your Gym'}`;
    const link = gymService.generateWhatsAppLink(member.phone, message);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const getAge = (dob: string | Date) => {
    const d = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  return (
    <div className="space-y-2">
      {/* Today's Birthdays */}
      {todayBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-2xl p-3 shadow-md border border-white/30"
          style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Cake className="w-4 h-4 text-pink-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                🎂 {todayBirthdays.length} Birthday{todayBirthdays.length > 1 ? 's' : ''} Today
              </span>
            </div>
            {todayBirthdays.length > 1 && onSendAll && (
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => onSendAll(todayBirthdays)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-bold shadow-sm">
                <Send className="w-3 h-3" /> Send All
              </motion.button>
            )}
          </div>
          <div className="space-y-1.5">
            {todayBirthdays.map(member => (
              <div key={member.id} className="flex items-center gap-2.5 py-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.full_name}</p>
                  {member.date_of_birth && (
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Turns {getAge(member.date_of_birth)} today 🎉</p>
                  )}
                </div>
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => handleWhatsAppWish(member)}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl rounded-2xl p-3 shadow-md border border-white/30"
          style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
              🎈 Upcoming ({upcomingBirthdays.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {upcomingBirthdays.slice(0, 5).map(member => {
              const dob = new Date(member.date_of_birth!);
              const month = dob.toLocaleString('en', { month: 'short' });
              const day = dob.getDate();
              return (
                <div key={member.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/50 border border-white/30">
                  <span className="text-[10px] font-semibold truncate max-w-[60px]" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.full_name.split(' ')[0]}</span>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{month} {day}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
