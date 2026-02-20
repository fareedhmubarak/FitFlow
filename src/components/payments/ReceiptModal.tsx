import { motion } from 'framer-motion';
import { X, Download, MessageCircle, Share2 } from 'lucide-react';
import { receiptService, type ReceiptData, type GymInfo } from '@/lib/receiptService';
import toast from 'react-hot-toast';

interface ReceiptModalProps {
  receipt: ReceiptData;
  gym: GymInfo;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, gym, onClose }: ReceiptModalProps) {
  const handleDownload = () => {
    receiptService.downloadReceipt(receipt, gym);
    toast.success('Receipt downloaded!');
  };

  const handleWhatsApp = () => {
    receiptService.shareReceiptViaWhatsApp(receipt, gym);
  };

  const handleShare = async () => {
    await receiptService.shareReceipt(receipt, gym);
    toast.success('Receipt shared!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--theme-bg, #f0f9ff)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Payment Receipt</h2>
          <motion.button whileTap={{ scale: 0.8 }} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </motion.button>
        </div>

        {/* Receipt Preview */}
        <div className="rounded-2xl p-4 shadow-md border border-white/30 space-y-3"
          style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.85))' }}>
          {/* Gym header */}
          <div className="text-center border-b border-dashed border-gray-300 pb-3">
            <h3 className="text-base font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{gym.name}</h3>
            {(gym.address || gym.city) && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{[gym.address, gym.city].filter(Boolean).join(', ')}</p>
            )}
            {gym.phone && <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Ph: {gym.phone}</p>}
          </div>

          {/* Receipt # */}
          <div className="flex justify-between text-xs">
            <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Receipt #</span>
            <span className="font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.receiptNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Date</span>
            <span style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.paymentDate}</span>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Member</span>
              <span className="font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.memberName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Plan</span>
              <span style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.planName}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Valid</span>
              <span style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.validFrom} → {receipt.validUntil}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Payment</span>
              <span style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{receipt.paymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 text-center">
            <p className="text-xl font-extrabold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
              {receipt.currency}{receipt.amount.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">✅ Payment Confirmed</p>
          </div>

          <div className="text-center pt-2 border-t border-dashed border-gray-200">
            <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Thank you! 🙏</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleWhatsApp}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleDownload}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
            <Download className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Download</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleShare}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-md">
            <Share2 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Share</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
