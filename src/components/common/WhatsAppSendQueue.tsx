import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Check, ChevronRight, RotateCcw } from 'lucide-react';
import { gymService } from '@/lib/gymService';
import type { Member } from '@/types/database';

interface QueueItem {
  member: Member;
  status: 'pending' | 'sent' | 'skipped';
}

interface WhatsAppSendQueueProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  messageGenerator: (member: Member) => string;
  title?: string;
}

export default function WhatsAppSendQueue({ isOpen, onClose, members, messageGenerator, title = 'Send WhatsApp Messages' }: WhatsAppSendQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && members.length > 0) {
      setQueue(members.map((m) => ({ member: m, status: 'pending' })));
      setCurrentIndex(0);
      setIsPaused(false);
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [isOpen, members]);

  const sentCount = queue.filter((q) => q.status === 'sent').length;
  const skippedCount = queue.filter((q) => q.status === 'skipped').length;
  const isComplete = currentIndex >= queue.length;
  const progress = queue.length > 0 ? ((sentCount + skippedCount) / queue.length) * 100 : 0;

  const sendCurrent = useCallback(() => {
    if (currentIndex >= queue.length) return;
    const item = queue[currentIndex];
    if (!item.member.phone) {
      setQueue((prev) => prev.map((q, i) => i === currentIndex ? { ...q, status: 'skipped' } : q));
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    const message = messageGenerator(item.member);
    const link = gymService.generateWhatsAppLink(item.member.phone, message);
    window.open(link, '_blank', 'noopener,noreferrer');
    setQueue((prev) => prev.map((q, i) => i === currentIndex ? { ...q, status: 'sent' } : q));
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, queue, messageGenerator]);

  const skipCurrent = useCallback(() => {
    if (currentIndex >= queue.length) return;
    setQueue((prev) => prev.map((q, i) => i === currentIndex ? { ...q, status: 'skipped' } : q));
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, queue]);

  const resetQueue = () => {
    setQueue(members.map((m) => ({ member: m, status: 'pending' })));
    setCurrentIndex(0);
    setIsPaused(false);
  };

  if (!isOpen) return null;

  const currentMember = currentIndex < queue.length ? queue[currentIndex].member : null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--theme-bg, #f8fafc)' }}>
          {/* Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{title}</h2>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/30">
                <X className="w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
              </motion.button>
            </div>
            {/* Progress */}
            <div className="flex items-center gap-2 text-[10px] mb-1.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              <span className="text-green-500 font-bold">{sentCount} sent</span>
              {skippedCount > 0 && <span>• {skippedCount} skipped</span>}
              <span>• {queue.length - sentCount - skippedCount} remaining</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>

          {/* Current Member */}
          {!isComplete && currentMember && (
            <div className="p-4">
              <div className="backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/30 mb-3"
                style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                  Sending to ({currentIndex + 1}/{queue.length})
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                    {currentMember.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{currentMember.full_name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{currentMember.phone || 'No phone number'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={sendCurrent}
                  disabled={!currentMember.phone}
                  className="py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xs shadow-md shadow-green-500/20 flex items-center justify-center gap-1.5 disabled:opacity-40">
                  <MessageCircle className="w-4 h-4" /> Send
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={skipCurrent}
                  className="py-3 rounded-xl font-bold text-xs border border-white/30 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' }}>
                  <ChevronRight className="w-4 h-4" /> Skip
                </motion.button>
              </div>
            </div>
          )}

          {/* Complete */}
          {isComplete && (
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>All Done!</p>
              <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                {sentCount} sent, {skippedCount} skipped
              </p>
              <div className="flex gap-2 justify-center">
                <motion.button whileTap={{ scale: 0.95 }} onClick={resetQueue}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-white/30 flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', color: 'var(--theme-text-secondary, #64748b)' }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Restart
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold">
                  Close
                </motion.button>
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {queue.map((item, idx) => (
              <div key={item.member.id}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${idx === currentIndex && !isComplete ? 'bg-green-50/50 border border-green-200/30' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  item.status === 'sent' ? 'bg-green-100 text-green-600' :
                  item.status === 'skipped' ? 'bg-gray-100 text-gray-400' :
                  idx === currentIndex ? 'bg-green-500 text-white' : 'bg-white/50 text-gray-300'
                }`}>
                  {item.status === 'sent' ? '✓' : item.status === 'skipped' ? '—' : idx + 1}
                </div>
                <span className={`text-[11px] truncate flex-1 ${item.status === 'skipped' ? 'line-through opacity-50' : ''}`}
                  style={{ color: item.status === 'sent' ? 'var(--theme-text-muted, #94a3b8)' : 'var(--theme-text-primary, #1e293b)' }}>
                  {item.member.full_name}
                </span>
                {item.status === 'sent' && <Check className="w-3 h-3 text-green-500 shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
