import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  memberName?: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ isOpen, imageUrl, memberName, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Container - Portrait aspect ratio */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black/50 shadow-2xl" style={{ aspectRatio: '3/4' }}>
              <img
                src={imageUrl}
                alt={memberName || 'Member photo'}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Member Name */}
            {memberName && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-white text-lg font-semibold text-center"
              >
                {memberName}
              </motion.p>
            )}

            {/* Hint */}
            <p className="mt-2 text-white/50 text-xs text-center">
              Tap outside to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
