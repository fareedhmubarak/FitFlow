import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Upload, Loader2, Check, Scale, Ruler, 
  Activity, ChevronDown, ChevronUp, ImagePlus, RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { progressService, CreateProgressInput } from '@/lib/progressService';
import { compressImage } from '@/lib/imageUpload';

interface AddProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

interface PhotoSlot {
  type: 'front' | 'back' | 'left' | 'right';
  label: string;
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

export function AddProgressModal({ isOpen, onClose, memberId, memberName, onSuccess }: AddProgressModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState<'front' | 'back' | 'left' | 'right' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoSlot, setActivePhotoSlot] = useState<'front' | 'back' | 'left' | 'right' | null>(null);
  
  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { type: 'front', label: 'Front', file: null, preview: null, uploading: false },
    { type: 'back', label: 'Back', file: null, preview: null, uploading: false },
    { type: 'left', label: 'Left', file: null, preview: null, uploading: false },
    { type: 'right', label: 'Right', file: null, preview: null, uploading: false },
  ]);

  const [form, setForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    body_fat_percentage: '',
    chest: '',
    waist: '',
    hips: '',
    biceps: '',
    thighs: '',
    calves: '',
    notes: '',
  });

  // Monthly progress limit state
  const [monthlyLimit, setMonthlyLimit] = useState<{ canAdd: boolean; currentCount: number; remaining: number } | null>(null);

  // BUGFIX: Reset all form data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form data
      setForm({
        record_date: new Date().toISOString().split('T')[0],
        weight: '',
        height: '',
        body_fat_percentage: '',
        chest: '',
        waist: '',
        hips: '',
        biceps: '',
        thighs: '',
        calves: '',
        notes: '',
      });
      // Reset photos
      setPhotos([
        { type: 'front', label: 'Front', file: null, preview: null, uploading: false },
        { type: 'back', label: 'Back', file: null, preview: null, uploading: false },
        { type: 'left', label: 'Left', file: null, preview: null, uploading: false },
        { type: 'right', label: 'Right', file: null, preview: null, uploading: false },
      ]);
      // Reset UI states
      setShowPhotos(false);
      setShowMeasurements(false);
      setShowNotes(false);
      setShowPhotoOptions(null);
      setActivePhotoSlot(null);
      setShowCamera(false);
      setLoading(false);
      
      // Check monthly limit
      progressService.canAddProgressThisMonth(memberId).then(setMonthlyLimit).catch(console.error);
    }
  }, [isOpen, memberId]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Start/stop camera when showCamera changes
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  // Handle facingMode change without full restart
  useEffect(() => {
    if (showCamera && streamRef.current) {
      // Stop current stream and start with new facing mode
      stopCamera();
      startCamera();
    }
  }, [facingMode]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !activePhotoSlot) return;
    setIsCapturing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Use smaller dimensions for faster processing
      const maxSize = 800;
      const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Use lower quality for faster blob creation
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `progress-${activePhotoSlot}-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const preview = URL.createObjectURL(blob);
            
            // Update state immediately
            setPhotos(prev => prev.map(p => p.type === activePhotoSlot ? { ...p, file, preview } : p));
            
            // Close camera first, then show success
            setShowCamera(false);
            setActivePhotoSlot(null);
            setIsCapturing(false);
            toast.success('Photo captured!');
          } else {
            setIsCapturing(false);
            toast.error('Failed to capture photo');
          }
        }, 'image/jpeg', 0.7);
      } else {
        setIsCapturing(false);
      }
    } catch (error) {
      toast.error('Failed to capture');
      setIsCapturing(false);
    }
  };

  const handlePhotoClick = (type: 'front' | 'back' | 'left' | 'right') => {
    // Show options menu for camera or upload
    setShowPhotoOptions(type);
  };

  const handleTakePhoto = (type: 'front' | 'back' | 'left' | 'right') => {
    setActivePhotoSlot(type);
    setShowPhotoOptions(null);
    setShowCamera(true);
  };

  const handleUploadPhoto = (type: 'front' | 'back' | 'left' | 'right') => {
    setActivePhotoSlot(type);
    setShowPhotoOptions(null);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoSlot) return;

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      const preview = URL.createObjectURL(compressedFile);
      setPhotos(prev => prev.map(p => 
        p.type === activePhotoSlot 
          ? { ...p, file: compressedFile, preview }
          : p
      ));
      toast.success('Photo added!');
    } catch (error) {
      toast.error('Failed to process image');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setActivePhotoSlot(null);
  };

  const removePhoto = (type: 'front' | 'back' | 'left' | 'right') => {
    setPhotos(prev => prev.map(p => 
      p.type === type 
        ? { ...p, file: null, preview: null }
        : p
    ));
  };

  const calculateBMI = () => {
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    if (weight > 0 && height > 0) {
      return progressService.calculateBMI(weight, height);
    }
    return null;
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? progressService.getBMICategory(bmi) : null;

  const handleSubmit = async () => {
    if (!form.weight && !form.height && photos.every(p => !p.file)) {
      toast.error('Please add at least one measurement or photo');
      return;
    }

    setLoading(true);
    try {
      // Check monthly limit (max 4 progress entries per month)
      const { canAdd, currentCount, remaining } = await progressService.canAddProgressThisMonth(memberId);
      
      if (!canAdd) {
        toast.error(`Monthly limit reached! You can only add 4 progress entries per month. (${currentCount}/4 used)`);
        setLoading(false);
        return;
      }

      // Upload photos first
      const photoUrls: Record<string, string> = {};
      for (const photo of photos) {
        if (photo.file) {
          setPhotos(prev => prev.map(p => 
            p.type === photo.type ? { ...p, uploading: true } : p
          ));
          
          const url = await progressService.uploadProgressPhoto(photo.file, memberId, photo.type);
          // Use correct column names: photo_front_url, photo_back_url, etc. (matching database)
          photoUrls[`photo_${photo.type}_url`] = url;
          
          setPhotos(prev => prev.map(p => 
            p.type === photo.type ? { ...p, uploading: false } : p
          ));
        }
      }

      // Create progress record
      const progressData: CreateProgressInput = {
        member_id: memberId,
        record_date: form.record_date,
        ...(form.weight && { weight: parseFloat(form.weight) }),
        ...(form.height && { height: parseFloat(form.height) }),
        ...(form.body_fat_percentage && { body_fat_percentage: parseFloat(form.body_fat_percentage) }),
        ...(form.chest && { chest: parseFloat(form.chest) }),
        ...(form.waist && { waist: parseFloat(form.waist) }),
        ...(form.hips && { hips: parseFloat(form.hips) }),
        ...(form.biceps && { biceps: parseFloat(form.biceps) }),
        ...(form.thighs && { thighs: parseFloat(form.thighs) }),
        ...(form.calves && { calves: parseFloat(form.calves) }),
        ...(form.notes && { notes: form.notes }),
        ...photoUrls,
      };

      await progressService.createProgress(progressData);
      toast.success('Progress recorded successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal - Compact Centered Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-3"
            style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 3rem))' }}
            onClick={onClose}
          >
            <div 
              className="w-[90vw] max-w-[340px] max-h-[70vh] overflow-hidden bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 flex flex-col popup-scale"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Compact */}
              <div className="flex items-center justify-between p-2.5 border-b border-white/10 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-white">Add Progress</h2>
                  <p className="text-[10px] text-slate-400">{memberName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Monthly Limit Indicator */}
              {monthlyLimit && (
                <div className={`mx-2.5 mt-2 px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                  monthlyLimit.canAdd 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`text-[10px] font-medium ${monthlyLimit.canAdd ? 'text-emerald-400' : 'text-red-400'}`}>
                    {monthlyLimit.canAdd 
                      ? `${monthlyLimit.remaining} entries remaining this month` 
                      : 'Monthly limit reached (4/4)'}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full ${
                          i <= monthlyLimit.currentCount 
                            ? 'bg-emerald-500' 
                            : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Content - Scrollable but compact */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-hide">
                {/* Hidden file input for gallery upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Date - Compact */}
                <div>
                  <label className="text-[10px] font-medium text-slate-300 mb-0.5 block">Record Date</label>
                  <input
                    type="date"
                    value={form.record_date}
                    onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Photos Section - Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPhotos(!showPhotos)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Progress Photos (Optional)</span>
                    </span>
                    {showPhotos ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showPhotos && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                      >
                        <div className="grid grid-cols-4 gap-2">
                          {photos.map((photo) => (
                            <div key={photo.type} className="relative">
                              <button
                                type="button"
                                onClick={() => handlePhotoClick(photo.type)}
                                disabled={loading}
                                className={`w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                                  photo.preview
                                    ? 'border-emerald-500/50 p-0 overflow-hidden'
                                    : 'border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                                }`}
                              >
                                {photo.preview ? (
                                  <img
                                    src={photo.preview}
                                    alt={photo.label}
                                    className="w-full h-full object-cover"
                                  />
                                ) : photo.uploading ? (
                                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                ) : (
                                  <>
                                    <ImagePlus className="w-3 h-3 text-slate-400 mb-0.5" />
                                    <span className="text-[8px] text-slate-400">{photo.label}</span>
                                  </>
                                )}
                              </button>
                              {photo.preview && (
                                <button
                                  type="button"
                                  onClick={() => removePhoto(photo.type)}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}

                              {/* Photo Options Popup */}
                              <AnimatePresence>
                                {showPhotoOptions === photo.type && (
                                  <>
                                    {/* Backdrop to close popup */}
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setShowPhotoOptions(null)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-slate-800 rounded-xl shadow-xl border border-white/10 overflow-hidden min-w-[130px]"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleTakePhoto(photo.type)}
                                        className="w-full px-3 py-2 flex items-center gap-2 text-white hover:bg-emerald-500/20 transition-colors text-xs"
                                      >
                                        <Camera className="w-3 h-3 text-emerald-400" />
                                        <span>Take Photo</span>
                                      </button>
                                      <div className="border-t border-white/10" />
                                      <button
                                        type="button"
                                        onClick={() => handleUploadPhoto(photo.type)}
                                        className="w-full px-3 py-2 flex items-center gap-2 text-white hover:bg-blue-500/20 transition-colors text-xs"
                                      >
                                        <Upload className="w-3 h-3 text-blue-400" />
                                        <span>Upload Photo</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Basic Measurements - Compact */}
                <div>
                  <label className="text-[10px] font-medium text-slate-300 mb-1 block flex items-center gap-1.5">
                    <Scale className="w-2.5 h-2.5" />
                    Body Measurements
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-slate-400 mb-0.5 block">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="70.5"
                        value={form.weight}
                        onChange={(e) => setForm({ ...form, weight: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 mb-0.5 block">Height (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="175"
                        value={form.height}
                        onChange={(e) => setForm({ ...form, height: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* BMI Preview - Compact */}
                  {bmi && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-1.5 p-1.5 rounded-lg bg-slate-800/50 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-[10px] text-slate-300">BMI:</span>
                          <span className="text-xs font-bold text-white">{bmi}</span>
                        </div>
                        {bmiCategory && (
                          <span className={`text-[10px] font-semibold ${bmiCategory.color}`}>
                            {bmiCategory.category}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Body Fat - Compact */}
                  <div className="mt-1.5">
                    <label className="text-[9px] text-slate-400 mb-0.5 block">Body Fat % (Optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="15.5"
                      value={form.body_fat_percentage}
                      onChange={(e) => setForm({ ...form, body_fat_percentage: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expandable Body Measurements - Compact */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Ruler className="w-2.5 h-2.5" />
                      <span className="text-[10px] font-medium">Detailed Measurements (Optional)</span>
                    </span>
                    {showMeasurements ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showMeasurements && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1.5 space-y-1.5"
                      >
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Chest</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.chest}
                              onChange={(e) => setForm({ ...form, chest: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Waist</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.waist}
                              onChange={(e) => setForm({ ...form, waist: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Hips</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.hips}
                              onChange={(e) => setForm({ ...form, hips: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Biceps</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.biceps}
                              onChange={(e) => setForm({ ...form, biceps: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Thighs</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.thighs}
                              onChange={(e) => setForm({ ...form, thighs: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Calves</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.calves}
                              onChange={(e) => setForm({ ...form, calves: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes - Collapsible Compact */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium">Notes (Optional)</span>
                    </span>
                    {showNotes ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotes && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1.5"
                      >
                        <textarea
                          rows={2}
                          placeholder="Any observations..."
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer - Compact */}
              <div className="p-2.5 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={handleSubmit}
                  disabled={loading || (monthlyLimit && !monthlyLimit.canAdd)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : monthlyLimit && !monthlyLimit.canAdd ? (
                    <>
                      Monthly Limit Reached
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save Progress
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Camera Modal - Full-Screen Portrait Mode matching PhotoPicker style */}
          <AnimatePresence>
            {showCamera && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4"
                onClick={() => { setShowCamera(false); setActivePhotoSlot(null); }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-sm flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button - Top Right */}
                  <button
                    type="button"
                    onClick={() => { setShowCamera(false); setActivePhotoSlot(null); }}
                    className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Photo Type Label */}
                  <div className="absolute -top-12 left-0 px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30">
                    <span className="text-emerald-400 text-sm font-bold capitalize">
                      {activePhotoSlot} Photo
                    </span>
                  </div>

                  {/* Camera Container - Portrait aspect ratio */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '3/4' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Camera Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center justify-center gap-8">
                        <button
                          type="button"
                          onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        >
                          <RotateCcw className="w-6 h-6" />
                        </button>

                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={isCapturing}
                          className="w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                        >
                          {isCapturing ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white"></div>
                          )}
                        </button>

                        {/* Spacer for symmetry */}
                        <div className="w-12 h-12" />
                      </div>

                      <p className="text-center text-white/80 text-xs mt-3">
                        {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                      </p>
                    </div>
                  </div>

                  {/* Hint */}
                  <p className="mt-4 text-white/50 text-xs text-center">
                    Tap outside to close
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

export default AddProgressModal;