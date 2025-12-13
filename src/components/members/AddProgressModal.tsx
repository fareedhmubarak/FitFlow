import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Upload, Loader2, Check, Scale, Ruler, 
  Activity, ImagePlus, RotateCcw, Calendar, ChevronRight, ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { progressService, CreateProgressInput } from '@/lib/progressService';
import { compressImage } from '@/lib/imageUpload';
import { createPortal } from 'react-dom';

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
  const [wizardStep, setWizardStep] = useState(1);
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

  // Reset all form data when modal opens
  useEffect(() => {
    if (isOpen) {
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
      setPhotos([
        { type: 'front', label: 'Front', file: null, preview: null, uploading: false },
        { type: 'back', label: 'Back', file: null, preview: null, uploading: false },
        { type: 'left', label: 'Left', file: null, preview: null, uploading: false },
        { type: 'right', label: 'Right', file: null, preview: null, uploading: false },
      ]);
      setWizardStep(1);
      setShowPhotoOptions(null);
      setActivePhotoSlot(null);
      setShowCamera(false);
      setLoading(false);
      
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

  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  useEffect(() => {
    if (showCamera && streamRef.current) {
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
      
      const maxSize = 800;
      const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `progress-${activePhotoSlot}-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const preview = URL.createObjectURL(blob);
            
            setPhotos(prev => prev.map(p => p.type === activePhotoSlot ? { ...p, file, preview } : p));
            
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
      const { canAdd, currentCount } = await progressService.canAddProgressThisMonth(memberId);
      
      if (!canAdd) {
        toast.error(`Monthly limit reached! You can only add 4 progress entries per month. (${currentCount}/4 used)`);
        setLoading(false);
        return;
      }

      const photoUrls: Record<string, string> = {};
      for (const photo of photos) {
        if (photo.file) {
          setPhotos(prev => prev.map(p => 
            p.type === photo.type ? { ...p, uploading: true } : p
          ));
          
          const url = await progressService.uploadProgressPhoto(photo.file, memberId, photo.type);
          photoUrls[`photo_${photo.type}_url`] = url;
          
          setPhotos(prev => prev.map(p => 
            p.type === photo.type ? { ...p, uploading: false } : p
          ));
        }
      }

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

  const handleNext = () => {
    if (wizardStep < 3) setWizardStep(wizardStep + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const photosCount = photos.filter(p => p.file).length;

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

          {/* Modal - Light Theme with Multi-Step Wizard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={onClose}
          >
            <div 
              className="w-[90vw] max-w-[340px] max-h-[80vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Add Progress</h3>
                    <p className="text-xs text-slate-500">{memberName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200/40">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        wizardStep === step 
                          ? 'bg-emerald-500 text-white' 
                          : wizardStep > step
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-200 text-slate-400'
                      }`}>
                        {wizardStep > step ? <Check className="w-3 h-3" /> : step}
                      </div>
                      {step < 3 && (
                        <div className={`w-8 h-0.5 ${wizardStep > step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-center text-[10px] text-slate-500 mt-1">
                  {wizardStep === 1 && 'Date & Photos'}
                  {wizardStep === 2 && 'Core Measurements'}
                  {wizardStep === 3 && 'Details & Notes'}
                </p>
              </div>

              {/* Monthly Limit Indicator */}
              {monthlyLimit && (
                <div className={`mx-4 mt-3 px-3 py-2 rounded-xl border flex items-center justify-between ${
                  monthlyLimit.canAdd 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <span className={`text-xs font-medium ${monthlyLimit.canAdd ? 'text-emerald-600' : 'text-red-600'}`}>
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
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <AnimatePresence mode="wait">
                  {/* Step 1: Date & Photos */}
                  {wizardStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm text-slate-800 font-medium">Date & Photos</p>
                        <p className="text-[10px] text-slate-500">When was this progress recorded?</p>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          Record Date
                        </label>
                        <input
                          type="date"
                          value={form.record_date}
                          onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 [color-scheme:light]"
                        />
                      </div>

                      {/* Photos */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <Camera className="w-3.5 h-3.5 inline mr-1" />
                          Progress Photos <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {photos.map((photo) => (
                            <div key={photo.type} className="relative">
                              <button
                                type="button"
                                onClick={() => handlePhotoClick(photo.type)}
                                disabled={loading}
                                className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                                  photo.preview
                                    ? 'border-emerald-300 p-0 overflow-hidden'
                                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                                }`}
                              >
                                {photo.preview ? (
                                  <img
                                    src={photo.preview}
                                    alt={photo.label}
                                    className="w-full h-full object-cover"
                                  />
                                ) : photo.uploading ? (
                                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                ) : (
                                  <>
                                    <ImagePlus className="w-4 h-4 text-slate-400 mb-0.5" />
                                    <span className="text-[9px] text-slate-500">{photo.label}</span>
                                  </>
                                )}
                              </button>
                              {photo.preview && (
                                <button
                                  type="button"
                                  onClick={() => removePhoto(photo.type)}
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}

                              {/* Photo Options Popup */}
                              <AnimatePresence>
                                {showPhotoOptions === photo.type && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setShowPhotoOptions(null)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[130px]"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleTakePhoto(photo.type)}
                                        className="w-full px-3 py-2.5 flex items-center gap-2 text-slate-700 hover:bg-emerald-50 transition-colors text-sm"
                                      >
                                        <Camera className="w-4 h-4 text-emerald-500" />
                                        <span>Take Photo</span>
                                      </button>
                                      <div className="border-t border-slate-100" />
                                      <button
                                        type="button"
                                        onClick={() => handleUploadPhoto(photo.type)}
                                        className="w-full px-3 py-2.5 flex items-center gap-2 text-slate-700 hover:bg-blue-50 transition-colors text-sm"
                                      >
                                        <Upload className="w-4 h-4 text-blue-500" />
                                        <span>Upload Photo</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                        {photosCount > 0 && (
                          <p className="text-[10px] text-emerald-600 mt-2 text-center">
                            {photosCount} photo{photosCount > 1 ? 's' : ''} added
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Core Measurements */}
                  {wizardStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm text-slate-800 font-medium">Core Measurements</p>
                        <p className="text-[10px] text-slate-500">Weight, height, and body composition</p>
                      </div>

                      {/* Weight & Height */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="70.5"
                            value={form.weight}
                            onChange={(e) => setForm({ ...form, weight: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Height (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="175"
                            value={form.height}
                            onChange={(e) => setForm({ ...form, height: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* BMI Preview */}
                      {bmi && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs text-emerald-800">BMI:</span>
                              <span className="text-sm font-bold text-emerald-700">{bmi}</span>
                            </div>
                            {bmiCategory && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                bmiCategory.category === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                bmiCategory.category === 'Underweight' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {bmiCategory.category}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Body Fat */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Body Fat % <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="15.5"
                          value={form.body_fat_percentage}
                          onChange={(e) => setForm({ ...form, body_fat_percentage: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Detailed Measurements & Notes */}
                  {wizardStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm text-slate-800 font-medium">Details & Notes</p>
                        <p className="text-[10px] text-slate-500">Body measurements and observations</p>
                      </div>

                      {/* Detailed Measurements */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <Ruler className="w-3.5 h-3.5 inline mr-1" />
                          Body Measurements (cm) <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Chest</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.chest}
                              onChange={(e) => setForm({ ...form, chest: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Waist</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.waist}
                              onChange={(e) => setForm({ ...form, waist: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Hips</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.hips}
                              onChange={(e) => setForm({ ...form, hips: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Biceps</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.biceps}
                              onChange={(e) => setForm({ ...form, biceps: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Thighs</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.thighs}
                              onChange={(e) => setForm({ ...form, thighs: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Calves</label>
                            <input
                              type="number"
                              step="0.1"
                              value={form.calves}
                              onChange={(e) => setForm({ ...form, calves: e.target.value })}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Notes <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Any observations, achievements, or notes..."
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer with Navigation */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200/60 bg-slate-50/80">
                <div className="flex gap-3">
                  {wizardStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={loading || (monthlyLimit && !monthlyLimit.canAdd)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1 ${
                      wizardStep === 1 ? 'w-full' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : monthlyLimit && !monthlyLimit.canAdd ? (
                      'Limit Reached'
                    ) : wizardStep < 3 ? (
                      <>
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Progress
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Camera Modal - Full-Screen */}
          {createPortal(
            <AnimatePresence>
              {showCamera && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
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
                    {/* Close Button */}
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

                    {/* Camera Container */}
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '3/4' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Camera Controls */}
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
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-white" />
                            )}
                          </button>
                        </div>
                        <p className="text-center text-white/80 text-xs mt-3">
                          {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-white/50 text-xs text-center">
                      Tap outside to close
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default AddProgressModal;