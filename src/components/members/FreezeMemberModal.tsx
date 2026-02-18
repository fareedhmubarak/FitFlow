import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Snowflake } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { freezeService } from '@/lib/freezeService';
import { useQueryClient } from '@tanstack/react-query';

interface FreezeMemberModalProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FreezeMemberModal({ memberId, memberName, onClose, onSuccess }: FreezeMemberModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [freezeDate, setFreezeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const handleFreeze = async () => {
    setLoading(true);
    try {
      await freezeService.freezeMembership(memberId, reason || undefined, freezeDate);
      toast.success(`${memberName}'s membership frozen`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to freeze membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--theme-bg, #f0f9ff)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Freeze Membership</h2>
          </div>
          <motion.button whileTap={{ scale: 0.8 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </motion.button>
        </div>

        <p className="text-sm" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
          Freeze <strong>{memberName}</strong>&apos;s membership. Their end date and next due date will be extended by the number of frozen days when unfrozen.
        </p>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Freeze Start Date</label>
          <input type="date" value={freezeDate} onChange={e => setFreezeDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Travel, Injury, Personal" rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-white/40 backdrop-blur-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #1e293b)' }} />
        </div>

        <motion.button whileTap={{ scale: 0.96 }} onClick={handleFreeze} disabled={loading}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50">
          {loading ? 'Freezing...' : 'Freeze Membership'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
