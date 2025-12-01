import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../../lib/imageUpload';
import toast from 'react-hot-toast';

interface PhotoPickerProps {
  currentPhoto?: string | null;
  onPhotoSelected: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
}

export default function PhotoPicker({ currentPhoto, onPhotoSelected, disabled = false }: PhotoPickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto || null);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync previewUrl with currentPhoto prop
  useEffect(() => {
    if (currentPhoto !== undefined) {
      setPreviewUrl(currentPhoto);
    }
  }, [currentPhoto]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Cleanup blob URLs
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Start camera when showCamera changes
  useEffect(() => {
    if (showCamera && videoRef.current) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera, facingMode]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            try {
              const compressedFile = await compressImage(file, 1024, 1024, 0.8);
              const preview = URL.createObjectURL(compressedFile);
              setPreviewUrl(preview);
              onPhotoSelected(compressedFile, preview);
              setShowCamera(false);
              stopCamera();
              toast.success('Photo captured!');
            } catch (error) {
              console.error('Error processing photo:', error);
              toast.error('Failed to process photo');
            }
          }
          setIsCapturing(false);
        }, 'image/jpeg', 0.9);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
      setIsCapturing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      toast.loading('Processing image...', { id: 'processing-image' });
      const compressedFile = await compressImage(file, 1024, 1024, 0.8);
      const preview = URL.createObjectURL(compressedFile);
      
      // Cleanup old preview URL if it was a blob
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(preview);
      onPhotoSelected(compressedFile, preview);
      toast.success('Photo selected!', { id: 'processing-image' });
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process image. Please try another file.', { id: 'processing-image' });
    } finally {
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onPhotoSelected(null, null);
    toast.success('Photo removed');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="space-y-3 w-full">
      <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
        Member Photo
      </label>

      {/* Photo Preview */}
      <div className="relative flex justify-center">
        <button
          type="button"
          onClick={() => {
            if (!disabled && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          disabled={disabled}
          className="relative w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-400 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="Member photo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Change Photo
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
              <Camera className="w-10 h-10 mb-1" />
              <span className="text-[10px] font-semibold">Tap to add photo</span>
            </div>
          )}
        </button>
        
        {previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePhoto();
            }}
            disabled={disabled}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 z-10"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setShowCamera(true);
            }
          }}
          disabled={disabled}
          className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Camera className="w-4 h-4" />
          Camera
        </button>
        
        <button
          type="button"
          onClick={() => {
            if (!disabled && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          disabled={disabled}
          className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="member-photo-upload"
      />

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
            style={{ position: 'fixed' }}
          >
            <div className="flex-1 relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCamera(false);
                    stopCamera();
                  }}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white"></div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>

              <p className="text-center text-white/80 text-xs mt-4">
                {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

