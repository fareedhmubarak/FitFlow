import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Plus, 
  Camera, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Scale,
  Ruler,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeftRight,
  Check,
  Loader2,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { progressService, MemberProgress, CreateProgressInput } from '@/lib/progressService';
import { compressImage } from '@/lib/imageUpload';

interface MemberProgressPopupProps {
  memberId: string;
  memberName: string;
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'add' | 'compare' | 'detail';
type PhotoType = 'front' | 'back' | 'left' | 'right';

const photoLabels: Record<PhotoType, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left Side',
  right: 'Right Side'
};

export function MemberProgressPopup({ memberId, memberName, isOpen, onClose }: MemberProgressPopupProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProgress, setSelectedProgress] = useState<MemberProgress | null>(null);
  const [compareSelection, setCompareSelection] = useState<{ before?: MemberProgress; after?: MemberProgress }>({});
  const [isSelectingCompare, setIsSelectingCompare] = useState<'before' | 'after' | null>(null);
  
  // Form state for adding progress
  const [formData, setFormData] = useState<CreateProgressInput>({
    member_id: memberId,
    record_date: new Date().toISOString().split('T')[0],
    weight: null,
    height: null,
    body_fat_percentage: null,
    chest: null,
    waist: null,
    hips: null,
    biceps: null,
    thighs: null,
    calves: null,
    notes: null,
  });
  
  const [photos, setPhotos] = useState<{
    front: { file: File | null; preview: string | null };
    back: { file: File | null; preview: string | null };
    left: { file: File | null; preview: string | null };
    right: { file: File | null; preview: string | null };
  }>({
    front: { file: null, preview: null },
    back: { file: null, preview: null },
    left: { file: null, preview: null },
    right: { file: null, preview: null },
  });

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    left: useRef<HTMLInputElement>(null),
    right: useRef<HTMLInputElement>(null),
  };

  // Fetch progress records
  const { data: progressRecords, isLoading } = useQuery({
    queryKey: ['member-progress', memberId],
    queryFn: () => progressService.getMemberProgress(memberId),
    enabled: isOpen,
  });

  // Create progress mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateProgressInput) => {
      // Upload photos first
      const photoUrls: Partial<Record<PhotoType, string>> = {};
      
      for (const type of ['front', 'back', 'left', 'right'] as PhotoType[]) {
        const photoData = photos[type];
        if (photoData.file) {
          const url = await progressService.uploadProgressPhoto(photoData.file, memberId, type);
          photoUrls[type] = url;
        }
      }
      
      return progressService.createProgress({
        ...input,
        photo_front_url: photoUrls.front || null,
        photo_back_url: photoUrls.back || null,
        photo_left_url: photoUrls.left || null,
        photo_right_url: photoUrls.right || null,
      });
    },
    onSuccess: () => {
      toast.success('Progress recorded successfully! 💪');
      queryClient.invalidateQueries({ queryKey: ['member-progress', memberId] });
      resetForm();
      setViewMode('list');
    },
    onError: () => {
      toast.error('Failed to save progress');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (progressId: string) => progressService.deleteProgress(progressId),
    onSuccess: () => {
      toast.success('Progress record deleted');
      queryClient.invalidateQueries({ queryKey: ['member-progress', memberId] });
      setSelectedProgress(null);
      setViewMode('list');
    },
    onError: () => {
      toast.error('Failed to delete record');
    },
  });

  const resetForm = () => {
    setFormData({
      member_id: memberId,
      record_date: new Date().toISOString().split('T')[0],
      weight: null,
      height: null,
      body_fat_percentage: null,
      chest: null,
      waist: null,
      hips: null,
      biceps: null,
      thighs: null,
      calves: null,
      notes: null,
    });
    setPhotos({
      front: { file: null, preview: null },
      back: { file: null, preview: null },
      left: { file: null, preview: null },
      right: { file: null, preview: null },
    });
  };

  const handlePhotoSelect = async (type: PhotoType, file: File) => {
    try {
      const compressed = await compressImage(file, 800, 0.8);
      const preview = URL.createObjectURL(compressed);
      setPhotos(prev => ({
        ...prev,
        [type]: { file: compressed, preview }
      }));
    } catch (error) {
      toast.error('Failed to process image');
    }
  };

  const handleRemovePhoto = (type: PhotoType) => {
    if (photos[type].preview) {
      URL.revokeObjectURL(photos[type].preview!);
    }
    setPhotos(prev => ({
      ...prev,
      [type]: { file: null, preview: null }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const calculateBMI = () => {
    if (formData.weight && formData.height && formData.height > 0) {
      return progressService.calculateBMI(formData.weight, formData.height);
    }
    return null;
  };

  const handleCompareSelect = (progress: MemberProgress) => {
    if (isSelectingCompare === 'before') {
      setCompareSelection(prev => ({ ...prev, before: progress }));
      setIsSelectingCompare('after');
    } else if (isSelectingCompare === 'after') {
      setCompareSelection(prev => ({ ...prev, after: progress }));
      setIsSelectingCompare(null);
      setViewMode('compare');
    }
  };

  const getChangeIndicator = (diff: number | undefined) => {
    if (diff === undefined || diff === 0) return <Minus className="w-3 h-3 text-slate-400" />;
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    return <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  const getChangeColor = (diff: number | undefined, inverseGood = false) => {
    if (diff === undefined || diff === 0) return 'text-slate-400';
    const isPositive = diff > 0;
    if (inverseGood) {
      return isPositive ? 'text-red-500' : 'text-emerald-500';
    }
    return isPositive ? 'text-emerald-500' : 'text-red-500';
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(photos).forEach(photo => {
        if (photo.preview) URL.revokeObjectURL(photo.preview);
      });
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[90vw] max-w-[380px] max-h-[80vh] bg-slate-900/95 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              {viewMode !== 'list' && (
                <button
                  onClick={() => {
                    if (viewMode === 'compare') {
                      setCompareSelection({});
                      setIsSelectingCompare(null);
                    }
                    setViewMode('list');
                    setSelectedProgress(null);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-300" />
                </button>
              )}
              <div>
                <h2 className="text-sm font-bold text-white">
                  {viewMode === 'list' && 'Progress Tracking'}
                  {viewMode === 'add' && 'Add Progress'}
                  {viewMode === 'detail' && 'Progress Details'}
                  {viewMode === 'compare' && 'Compare Progress'}
                </h2>
                <p className="text-[10px] text-slate-400">{memberName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50"
            >
              <X className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* List View */}
              {viewMode === 'list' && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setViewMode('add')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Progress
                    </button>
                    {progressRecords && progressRecords.length >= 2 && (
                      <button
                        onClick={() => {
                          setIsSelectingCompare('before');
                          toast('Select the BEFORE record', { icon: '1️⃣' });
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors border border-slate-600"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        Compare
                      </button>
                    )}
                  </div>

                  {/* Compare Selection Hint */}
                  {isSelectingCompare && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40">
                      <p className="text-xs text-amber-300 font-medium">
                        {isSelectingCompare === 'before' 
                          ? '👆 Select the BEFORE (older) record to compare'
                          : '👆 Now select the AFTER (newer) record to compare'}
                      </p>
                      <button
                        onClick={() => {
                          setIsSelectingCompare(null);
                          setCompareSelection({});
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 mt-1"
                      >
                        Cancel comparison
                      </button>
                    </div>
                  )}

                  {/* Loading */}
                  {isLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoading && (!progressRecords || progressRecords.length === 0) && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-sm mb-2">No progress records yet</p>
                      <p className="text-slate-500 text-xs">Start tracking to see the transformation!</p>
                    </div>
                  )}

                  {/* Progress List */}
                  {progressRecords && progressRecords.length > 0 && (
                    <div className="space-y-3">
                      {progressRecords.map((record, index) => {
                        const isSelected = compareSelection.before?.id === record.id || compareSelection.after?.id === record.id;
                        const bmiCategory = record.bmi ? progressService.getBMICategory(record.bmi) : null;
                        
                        return (
                          <motion.div
                            key={record.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              if (isSelectingCompare) {
                                handleCompareSelect(record);
                              } else {
                                setSelectedProgress(record);
                                setViewMode('detail');
                              }
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-emerald-500/20 border-emerald-500/50' 
                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Thumbnail */}
                              <div className="w-14 h-14 rounded-lg bg-slate-700/50 overflow-hidden flex-shrink-0">
                                {record.photo_front_url ? (
                                  <img src={record.photo_front_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-slate-500" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs font-semibold text-white">
                                    {format(new Date(record.record_date), 'MMM d, yyyy')}
                                  </span>
                                  {index === 0 && (
                                    <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                      Latest
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {record.weight && (
                                    <span className="text-[10px] text-slate-400">
                                      <Scale className="w-2.5 h-2.5 inline mr-1" />
                                      {record.weight} kg
                                    </span>
                                  )}
                                  {record.bmi && bmiCategory && (
                                    <span className={`text-[10px] ${bmiCategory.color}`}>
                                      BMI: {record.bmi} ({bmiCategory.category})
                                    </span>
                                  )}
                                  {record.body_fat_percentage && (
                                    <span className="text-[10px] text-slate-400">
                                      Fat: {record.body_fat_percentage}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Selection indicator */}
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Add Progress View */}
              {viewMode === 'add' && (
                <motion.div
                  key="add"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4"
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Record Date</label>
                      <input
                        type="date"
                        value={formData.record_date}
                        onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm [color-scheme:dark]"
                        required
                      />
                    </div>

                    {/* Photos Grid */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-2 ml-1">Progress Photos (Optional)</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['front', 'back', 'left', 'right'] as PhotoType[]).map((type) => (
                          <div key={type} className="relative">
                            <input
                              ref={fileInputRefs[type]}
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handlePhotoSelect(type, e.target.files[0])}
                              className="hidden"
                            />
                            <div
                              onClick={() => fileInputRefs[type].current?.click()}
                              className={`aspect-square rounded-lg border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-colors ${
                                photos[type].preview
                                  ? 'border-emerald-500/50'
                                  : 'border-slate-600 hover:border-slate-500'
                              }`}
                            >
                              {photos[type].preview ? (
                                <img src={photos[type].preview} alt={type} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center p-1">
                                  <Camera className="w-4 h-4 text-slate-500 mx-auto" />
                                  <span className="text-[8px] text-slate-500 block mt-0.5">{photoLabels[type]}</span>
                                </div>
                              )}
                            </div>
                            {photos[type].preview && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemovePhoto(type); }}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                              >
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weight & Height */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.weight || ''}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                          placeholder="70.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Height (cm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.height || ''}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                          placeholder="175"
                        />
                      </div>
                    </div>

                    {/* BMI Display */}
                    {calculateBMI() && (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-emerald-300">Calculated BMI</span>
                          <span className={`text-sm font-bold ${progressService.getBMICategory(calculateBMI()!).color}`}>
                            {calculateBMI()} ({progressService.getBMICategory(calculateBMI()!).category})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Body Fat */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Body Fat % (Optional)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.body_fat_percentage || ''}
                        onChange={(e) => setFormData({ ...formData, body_fat_percentage: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        placeholder="15.5"
                      />
                    </div>

                    {/* Body Measurements */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-2 ml-1">Body Measurements (cm) - Optional</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.chest || ''}
                            onChange={(e) => setFormData({ ...formData, chest: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                            placeholder="Chest"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.waist || ''}
                            onChange={(e) => setFormData({ ...formData, waist: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                            placeholder="Waist"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.hips || ''}
                            onChange={(e) => setFormData({ ...formData, hips: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                            placeholder="Hips"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <input
                          type="number"
                          step="0.1"
                          value={formData.biceps || ''}
                          onChange={(e) => setFormData({ ...formData, biceps: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                          placeholder="Biceps"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.thighs || ''}
                          onChange={(e) => setFormData({ ...formData, thighs: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                          placeholder="Thighs"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.calves || ''}
                          onChange={(e) => setFormData({ ...formData, calves: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs"
                          placeholder="Calves"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Notes (Optional)</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none"
                        placeholder="Any observations or notes..."
                        rows={2}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Progress
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Detail View */}
              {viewMode === 'detail' && selectedProgress && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4"
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">
                        {format(new Date(selectedProgress.record_date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Delete this progress record?')) {
                          deleteMutation.mutate(selectedProgress.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Photos */}
                  {(selectedProgress.photo_front_url || selectedProgress.photo_back_url || selectedProgress.photo_left_url || selectedProgress.photo_right_url) && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {(['front', 'back', 'left', 'right'] as PhotoType[]).map((type) => {
                        const url = selectedProgress[`photo_${type}_url` as keyof MemberProgress] as string | null;
                        return (
                          <div key={type} className="aspect-square rounded-lg bg-slate-800 overflow-hidden">
                            {url ? (
                              <img src={url} alt={type} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-600" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Measurements */}
                  <div className="space-y-3">
                    {/* Primary Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {selectedProgress.weight && (
                        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                          <Scale className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-white">{selectedProgress.weight}</p>
                          <p className="text-[9px] text-slate-400">kg</p>
                        </div>
                      )}
                      {selectedProgress.height && (
                        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                          <Ruler className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-white">{selectedProgress.height}</p>
                          <p className="text-[9px] text-slate-400">cm</p>
                        </div>
                      )}
                      {selectedProgress.bmi && (
                        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                          <Activity className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                          <p className={`text-lg font-bold ${progressService.getBMICategory(selectedProgress.bmi).color}`}>
                            {selectedProgress.bmi}
                          </p>
                          <p className="text-[9px] text-slate-400">BMI</p>
                        </div>
                      )}
                    </div>

                    {/* Body Fat */}
                    {selectedProgress.body_fat_percentage && (
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Body Fat</span>
                          <span className="text-sm font-bold text-white">{selectedProgress.body_fat_percentage}%</span>
                        </div>
                      </div>
                    )}

                    {/* Body Measurements */}
                    {(selectedProgress.chest || selectedProgress.waist || selectedProgress.hips) && (
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <p className="text-[10px] font-semibold text-slate-400 mb-2">Body Measurements (cm)</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {selectedProgress.chest && (
                            <div>
                              <p className="text-sm font-bold text-white">{selectedProgress.chest}</p>
                              <p className="text-[9px] text-slate-500">Chest</p>
                            </div>
                          )}
                          {selectedProgress.waist && (
                            <div>
                              <p className="text-sm font-bold text-white">{selectedProgress.waist}</p>
                              <p className="text-[9px] text-slate-500">Waist</p>
                            </div>
                          )}
                          {selectedProgress.hips && (
                            <div>
                              <p className="text-sm font-bold text-white">{selectedProgress.hips}</p>
                              <p className="text-[9px] text-slate-500">Hips</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Arms & Legs */}
                    {(selectedProgress.biceps || selectedProgress.thighs || selectedProgress.calves) && (
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <p className="text-[10px] font-semibold text-slate-400 mb-2">Arms & Legs (cm)</p>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedProgress.biceps && (
                            <div className="text-center">
                              <p className="text-sm font-bold text-white">{selectedProgress.biceps}</p>
                              <p className="text-[9px] text-slate-500">Biceps</p>
                            </div>
                          )}
                          {selectedProgress.thighs && (
                            <div className="text-center">
                              <p className="text-sm font-bold text-white">{selectedProgress.thighs}</p>
                              <p className="text-[9px] text-slate-500">Thighs</p>
                            </div>
                          )}
                          {selectedProgress.calves && (
                            <div className="text-center">
                              <p className="text-sm font-bold text-white">{selectedProgress.calves}</p>
                              <p className="text-[9px] text-slate-500">Calves</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedProgress.notes && (
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <p className="text-[10px] font-semibold text-slate-400 mb-1">Notes</p>
                        <p className="text-sm text-slate-300">{selectedProgress.notes}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Compare View */}
              {viewMode === 'compare' && compareSelection.before && compareSelection.after && (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4"
                >
                  {(() => {
                    const comparison = progressService.compareProgress(compareSelection.before, compareSelection.after);
                    
                    return (
                      <>
                        {/* Date Range */}
                        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-500 mb-0.5">Before</p>
                            <p className="text-xs font-bold text-white">
                              {format(new Date(comparison.before.record_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-center">
                            <ArrowLeftRight className="w-4 h-4 text-emerald-400 mx-auto" />
                            <p className="text-[9px] text-emerald-400 font-medium">{comparison.daysBetween} days</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-500 mb-0.5">After</p>
                            <p className="text-xs font-bold text-white">
                              {format(new Date(comparison.after.record_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        {/* Photo Comparison */}
                        {(comparison.before.photo_front_url || comparison.after.photo_front_url) && (
                          <div className="mb-4">
                            <p className="text-[10px] font-semibold text-slate-400 mb-2">Photo Comparison</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="aspect-[3/4] rounded-lg bg-slate-800 overflow-hidden">
                                {comparison.before.photo_front_url ? (
                                  <img src={comparison.before.photo_front_url} alt="Before" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-slate-600" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center py-1">
                                  <span className="text-[9px] text-white font-medium">Before</span>
                                </div>
                              </div>
                              <div className="aspect-[3/4] rounded-lg bg-slate-800 overflow-hidden relative">
                                {comparison.after.photo_front_url ? (
                                  <img src={comparison.after.photo_front_url} alt="After" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-slate-600" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center py-1">
                                  <span className="text-[9px] text-white font-medium">After</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Measurements Comparison */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-slate-400 mb-2">Measurements Comparison</p>
                          
                          {/* Weight */}
                          {comparison.changes.weight && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">Weight</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.weight.before}kg</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.weight.after}kg</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.weight.diff, true)}`}>
                                  {getChangeIndicator(comparison.changes.weight.diff)}
                                  {comparison.changes.weight.diff > 0 ? '+' : ''}{comparison.changes.weight.diff}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* BMI */}
                          {comparison.changes.bmi && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">BMI</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.bmi.before}</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.bmi.after}</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.bmi.diff, true)}`}>
                                  {getChangeIndicator(comparison.changes.bmi.diff)}
                                  {comparison.changes.bmi.diff > 0 ? '+' : ''}{comparison.changes.bmi.diff}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Body Fat */}
                          {comparison.changes.body_fat_percentage && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">Body Fat</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.body_fat_percentage.before}%</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.body_fat_percentage.after}%</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.body_fat_percentage.diff, true)}`}>
                                  {getChangeIndicator(comparison.changes.body_fat_percentage.diff)}
                                  {comparison.changes.body_fat_percentage.diff > 0 ? '+' : ''}{comparison.changes.body_fat_percentage.diff}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Chest */}
                          {comparison.changes.chest && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">Chest</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.chest.before}cm</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.chest.after}cm</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.chest.diff)}`}>
                                  {getChangeIndicator(comparison.changes.chest.diff)}
                                  {comparison.changes.chest.diff > 0 ? '+' : ''}{comparison.changes.chest.diff}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Waist */}
                          {comparison.changes.waist && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">Waist</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.waist.before}cm</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.waist.after}cm</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.waist.diff, true)}`}>
                                  {getChangeIndicator(comparison.changes.waist.diff)}
                                  {comparison.changes.waist.diff > 0 ? '+' : ''}{comparison.changes.waist.diff}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Biceps */}
                          {comparison.changes.biceps && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <span className="text-xs text-slate-300">Biceps</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{comparison.changes.biceps.before}cm</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-xs font-bold text-white">{comparison.changes.biceps.after}cm</span>
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${getChangeColor(comparison.changes.biceps.diff)}`}>
                                  {getChangeIndicator(comparison.changes.biceps.diff)}
                                  {comparison.changes.biceps.diff > 0 ? '+' : ''}{comparison.changes.biceps.diff}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
