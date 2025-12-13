import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Scale, Ruler, Activity, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Minus, Loader2, TrendingUp,
  Camera, Plus, Trash2, GitCompare, ArrowLeft, Share2, Download, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { progressService, MemberProgress, ProgressComparison } from '@/lib/progressService';
import { exportService } from '@/lib/exportService';

interface ProgressHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  memberPhone?: string; // Optional phone for WhatsApp
  onAddProgress: () => void;
  refreshTrigger?: number; // Increment this to trigger refresh
}

export function ProgressHistoryModal({ 
  isOpen, 
  onClose, 
  memberId, 
  memberName,
  memberPhone,
  onAddProgress,
  refreshTrigger = 0
}: ProgressHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<MemberProgress[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MemberProgress | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<{ before: MemberProgress | null; after: MemberProgress | null }>({
    before: null,
    after: null
  });
  const [comparison, setComparison] = useState<ProgressComparison | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'compare'>('list');
  const [activePhotoView, setActivePhotoView] = useState<'front' | 'back' | 'left' | 'right'>('front');
  const [sharing, setSharing] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState<{ canAdd: boolean; currentCount: number; remaining: number } | null>(null);
  const [compareViewTab, setCompareViewTab] = useState<'photos' | 'measurements'>('photos');
  const comparisonRef = useRef<HTMLDivElement>(null);

  // Load progress and check monthly limit when modal opens or refreshTrigger changes
  useEffect(() => {
    if (isOpen && memberId) {
      loadProgress();
      progressService.canAddProgressThisMonth(memberId).then(setMonthlyLimit).catch(console.error);
    }
  }, [isOpen, memberId, refreshTrigger]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setSelectedRecord(null);
      setCompareMode(false);
      setCompareSelection({ before: null, after: null });
      setComparison(null);
      setActivePhotoView('front');
      setCompareViewTab('photos');
    }
  }, [isOpen]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const data = await progressService.getMemberProgress(memberId);
      setProgress(data);
    } catch (error) {
      console.error('Error loading progress:', error);
      toast.error('Failed to load progress history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this progress record?')) return;
    
    try {
      await progressService.deleteProgress(id);
      toast.success('Progress record deleted');
      loadProgress();
      setSelectedRecord(null);
      setView('list');
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const handleCompare = () => {
    if (compareSelection.before && compareSelection.after) {
      const result = progressService.compareProgress(compareSelection.before, compareSelection.after);
      setComparison(result);
      setView('compare');
    }
  };

  const toggleCompareSelection = (record: MemberProgress) => {
    if (!compareSelection.before) {
      setCompareSelection({ before: record, after: null });
    } else if (!compareSelection.after && record.id !== compareSelection.before.id) {
      // Ensure before is older than after
      const beforeDate = new Date(compareSelection.before.record_date);
      const afterDate = new Date(record.record_date);
      
      if (beforeDate > afterDate) {
        setCompareSelection({ before: record, after: compareSelection.before });
      } else {
        setCompareSelection({ ...compareSelection, after: record });
      }
    } else if (record.id === compareSelection.before?.id) {
      setCompareSelection({ before: null, after: compareSelection.after });
    } else if (record.id === compareSelection.after?.id) {
      setCompareSelection({ ...compareSelection, after: null });
    }
  };

  const isSelected = (record: MemberProgress) => {
    return record.id === compareSelection.before?.id || record.id === compareSelection.after?.id;
  };

  const getChangeIndicator = (diff: number) => {
    if (diff > 0) return { icon: ArrowUpRight, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    if (diff < 0) return { icon: ArrowDownRight, color: 'text-red-400', bgColor: 'bg-red-500/20' };
    return { icon: Minus, color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
  };

  const resetView = () => {
    setView('list');
    setSelectedRecord(null);
    setCompareMode(false);
    setCompareSelection({ before: null, after: null });
    setComparison(null);
  };

  const hasPhotos = (record: MemberProgress) => {
    return record.photo_front_url || record.photo_back_url || record.photo_left_url || record.photo_right_url;
  };

  // Export progress history to Excel
  const handleExportProgress = () => {
    if (progress.length === 0) {
      toast.error('No progress records to export');
      return;
    }

    try {
      const exportData = progress.map(record => ({
        record_date: record.record_date,
        weight: record.weight,
        height: record.height,
        bmi: record.bmi,
        body_fat_percentage: record.body_fat_percentage,
        chest: record.chest,
        waist: record.waist,
        hips: record.hips,
        biceps: record.biceps,
        thighs: record.thighs,
        calves: record.calves,
        notes: record.notes,
      }));

      exportService.exportProgressToExcel(exportData, memberName);
      toast.success('Progress exported to Excel! 📊');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export progress');
    }
  };

  // Share comparison to WhatsApp
  const handleShareToWhatsApp = async () => {
    if (!comparison || !memberPhone) {
      toast.error('Cannot share: Phone number not available');
      return;
    }

    setSharing(true);
    try {
      const message = exportService.generateComparisonText(
        memberName,
        comparison.before.record_date,
        comparison.after.record_date,
        comparison.daysBetween,
        comparison.changes
      );

      exportService.shareToWhatsApp(memberPhone, message);
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share to WhatsApp');
    } finally {
      setSharing(false);
    }
  };

  // Share comparison with image capture
  const handleShareWithImage = async () => {
    if (!comparison || !memberPhone) {
      toast.error('Cannot share: Phone number not available');
      return;
    }

    if (!comparisonRef.current) {
      toast.error('Comparison view not ready');
      return;
    }

    setSharing(true);
    try {
      await exportService.captureAndShareToWhatsApp(
        comparisonRef.current,
        memberPhone,
        memberName
      );
      toast.success('Sharing comparison...');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share comparison');
    } finally {
      setSharing(false);
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

          {/* Modal - Compact Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-3"
            style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 3rem))' }}
            onClick={onClose}
          >
            <div 
              className="w-[90vw] max-w-[340px] max-h-[70vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200/60 flex flex-col popup-scale"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Compact */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200/60 bg-slate-50/80 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {view !== 'list' && (
                    <button
                      onClick={resetView}
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      {view === 'list' && 'Progress History'}
                      {view === 'detail' && 'Progress Details'}
                      {view === 'compare' && 'Compare Progress'}
                    </h2>
                    <p className="text-xs text-slate-500">{memberName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {view === 'list' && progress.length > 0 && (
                    <button
                      onClick={handleExportProgress}
                      className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200 transition-colors"
                      title="Export to Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <AnimatePresence mode="wait">
                  {/* List View */}
                  {view === 'list' && (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-2.5"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        </div>
                      ) : progress.length === 0 ? (
                        <div className="text-center py-8">
                          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm mb-3">No progress records yet</p>
                          <button
                            onClick={() => { onClose(); onAddProgress(); }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add First Entry
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Compare Mode Toggle - Compact */}
                          {progress.length >= 2 && (
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setCompareMode(!compareMode);
                                  setCompareSelection({ before: null, after: null });
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                                  compareMode
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                <GitCompare className="w-3 h-3" />
                                {compareMode ? 'Cancel' : 'Compare'}
                              </button>

                              {compareMode && compareSelection.before && compareSelection.after && (
                                <button
                                  onClick={handleCompare}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-[10px]"
                                >
                                  Compare Now
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {compareMode && (
                            <p className="text-xs text-slate-500 mb-2">
                              Select 2 records ({[compareSelection.before, compareSelection.after].filter(Boolean).length}/2)
                            </p>
                          )}

                          {/* Progress Timeline - Compact */}
                          <div className="space-y-2">
                            {progress.map((record, index) => {
                              const bmiCategory = record.bmi ? progressService.getBMICategory(record.bmi) : null;
                              
                              return (
                                <motion.button
                                  key={record.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  onClick={() => {
                                    if (compareMode) {
                                      toggleCompareSelection(record);
                                    } else {
                                      setSelectedRecord(record);
                                      setView('detail');
                                    }
                                  }}
                                  className={`w-full p-3 rounded-xl text-left transition-all ${
                                    compareMode && isSelected(record)
                                      ? 'bg-emerald-50 border-2 border-emerald-500'
                                      : 'bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-800">
                                          {format(new Date(record.record_date), 'MMMM d, yyyy')}
                                        </span>
                                        {hasPhotos(record) && (
                                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                                            <Camera className="w-3 h-3" />
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-3">
                                        {record.weight && (
                                          <div className="flex items-center gap-1.5">
                                            <Scale className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm text-slate-600">{record.weight} kg</span>
                                          </div>
                                        )}
                                        {record.bmi && (
                                          <div className="flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm text-slate-600">BMI: {record.bmi}</span>
                                            {bmiCategory && (
                                              <span className={`text-xs ${bmiCategory.color}`}>
                                                ({bmiCategory.category})
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {!compareMode && (
                                      <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Detail View */}
                  {view === 'detail' && selectedRecord && (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      {/* Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-5 h-5" />
                          <span className="font-medium">
                            {format(new Date(selectedRecord.record_date), 'MMMM d, yyyy')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(selectedRecord.id)}
                          className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Photos */}
                      {hasPhotos(selectedRecord) && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Progress Photos
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { url: selectedRecord.photo_front_url, label: 'Front' },
                              { url: selectedRecord.photo_back_url, label: 'Back' },
                              { url: selectedRecord.photo_left_url, label: 'Left' },
                              { url: selectedRecord.photo_right_url, label: 'Right' },
                            ].filter(p => p.url).map((photo, i) => (
                              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-800">
                                <img
                                  src={photo.url!}
                                  alt={photo.label}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium">
                                  {photo.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Measurements */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Measurements
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedRecord.weight && (
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                              <span className="text-xs text-slate-500 block mb-1">Weight</span>
                              <span className="text-lg font-bold text-white">{selectedRecord.weight} kg</span>
                            </div>
                          )}
                          {selectedRecord.height && (
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                              <span className="text-xs text-slate-500 block mb-1">Height</span>
                              <span className="text-lg font-bold text-white">{selectedRecord.height} cm</span>
                            </div>
                          )}
                          {selectedRecord.bmi && (
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                              <span className="text-xs text-slate-500 block mb-1">BMI</span>
                              <span className="text-lg font-bold text-white">{selectedRecord.bmi}</span>
                              {progressService.getBMICategory(selectedRecord.bmi) && (
                                <span className={`text-xs ml-1 ${progressService.getBMICategory(selectedRecord.bmi).color}`}>
                                  ({progressService.getBMICategory(selectedRecord.bmi).category})
                                </span>
                              )}
                            </div>
                          )}
                          {selectedRecord.body_fat_percentage && (
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                              <span className="text-xs text-slate-500 block mb-1">Body Fat</span>
                              <span className="text-lg font-bold text-white">{selectedRecord.body_fat_percentage}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body Measurements */}
                      {(selectedRecord.chest || selectedRecord.waist || selectedRecord.hips ||
                        selectedRecord.biceps || selectedRecord.thighs || selectedRecord.calves) && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Ruler className="w-4 h-4" />
                            Body Measurements
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedRecord.chest && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Chest</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.chest} cm</span>
                              </div>
                            )}
                            {selectedRecord.waist && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Waist</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.waist} cm</span>
                              </div>
                            )}
                            {selectedRecord.hips && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Hips</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.hips} cm</span>
                              </div>
                            )}
                            {selectedRecord.biceps && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Biceps</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.biceps} cm</span>
                              </div>
                            )}
                            {selectedRecord.thighs && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Thighs</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.thighs} cm</span>
                              </div>
                            )}
                            {selectedRecord.calves && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">Calves</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.calves} cm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedRecord.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Notes</h4>
                          <p className="text-sm text-slate-400 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                            {selectedRecord.notes}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Compare View - With Photos/Measurements Tabs */}
                  {view === 'compare' && comparison && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-2.5 space-y-2"
                      ref={comparisonRef}
                    >
                      {/* Header with Share Buttons - Compact */}
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 text-[10px] font-bold">{comparison.daysBetween} Days Progress</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {memberPhone && (
                            <button
                              onClick={handleShareToWhatsApp}
                              disabled={sharing}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                              title="Share to WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={handleShareWithImage}
                            disabled={sharing || !memberPhone}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-white/10 text-[10px] font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title="Share with Image"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Photos / Measurements Tab Selector */}
                      <div className="flex gap-1 p-0.5 rounded-lg bg-slate-800/80 border border-white/10">
                        <button
                          onClick={() => setCompareViewTab('photos')}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            compareViewTab === 'photos'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Photos
                        </button>
                        <button
                          onClick={() => setCompareViewTab('measurements')}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            compareViewTab === 'measurements'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          Measurements
                        </button>
                      </div>

                      {/* Photos Tab Content */}
                      <AnimatePresence mode="wait">
                        {compareViewTab === 'photos' && (
                          <motion.div
                            key="photos-tab"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2"
                          >
                            {(hasPhotos(comparison.before) || hasPhotos(comparison.after)) ? (
                              <>
                                {/* Photo View Tabs - Front/Back/Left/Right */}
                                <div className="flex gap-1 p-0.5 rounded-lg bg-slate-800/50 border border-white/5">
                                  {(['front', 'back', 'left', 'right'] as const).map((type) => (
                                    <button
                                      key={type}
                                      onClick={() => setActivePhotoView(type)}
                                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all capitalize ${
                                        activePhotoView === type
                                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                      }`}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>

                                {/* Compact Side-by-Side Photo Comparison */}
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Before Photo */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between px-0.5">
                                      <span className="text-[9px] font-medium text-red-400 uppercase">Before</span>
                                      <span className="text-[9px] text-slate-500">{format(new Date(comparison.before.record_date), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-red-500/30">
                                      {comparison.before[`photo_${activePhotoView}_url` as keyof MemberProgress] ? (
                                        <img 
                                          src={comparison.before[`photo_${activePhotoView}_url` as keyof MemberProgress] as string} 
                                          alt={`Before ${activePhotoView}`} 
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                                          <Camera className="w-5 h-5" />
                                          <span className="text-[9px]">No Photo</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* After Photo */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between px-0.5">
                                      <span className="text-[9px] font-medium text-emerald-400 uppercase">After</span>
                                      <span className="text-[9px] text-slate-500">{format(new Date(comparison.after.record_date), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-emerald-500/30">
                                      {comparison.after[`photo_${activePhotoView}_url` as keyof MemberProgress] ? (
                                        <img 
                                          src={comparison.after[`photo_${activePhotoView}_url` as keyof MemberProgress] as string} 
                                          alt={`After ${activePhotoView}`} 
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                                          <Camera className="w-5 h-5" />
                                          <span className="text-[9px]">No Photo</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Photo Thumbnails - Compact Quick Navigation */}
                                <div className="grid grid-cols-4 gap-1">
                                  {(['front', 'back', 'left', 'right'] as const).map((type) => {
                                    const hasBeforePhoto = !!comparison.before[`photo_${type}_url` as keyof MemberProgress];
                                    const hasAfterPhoto = !!comparison.after[`photo_${type}_url` as keyof MemberProgress];
                                    const isActive = activePhotoView === type;
                                    
                                    return (
                                      <button
                                        key={type}
                                        onClick={() => setActivePhotoView(type)}
                                        className={`relative rounded overflow-hidden border transition-all ${
                                          isActive 
                                            ? 'border-emerald-500 ring-1 ring-emerald-500/30' 
                                            : 'border-transparent hover:border-slate-600'
                                        }`}
                                      >
                                        <div className="grid grid-cols-2 aspect-[2/1]">
                                          <div className="bg-slate-800">
                                            {hasBeforePhoto ? (
                                              <img 
                                                src={comparison.before[`photo_${type}_url` as keyof MemberProgress] as string} 
                                                alt="" 
                                                className="w-full h-full object-cover opacity-70" 
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Camera className="w-2 h-2 text-slate-700" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="bg-slate-800">
                                            {hasAfterPhoto ? (
                                              <img 
                                                src={comparison.after[`photo_${type}_url` as keyof MemberProgress] as string} 
                                                alt="" 
                                                className="w-full h-full object-cover" 
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Camera className="w-2 h-2 text-slate-700" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="absolute bottom-0 inset-x-0 text-[8px] text-center py-0.5 bg-black/60 capitalize text-slate-300">
                                          {type}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="py-8 text-center text-slate-500">
                                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No photos available for comparison</p>
                                <p className="text-xs mt-1">Switch to Measurements tab to see body changes</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Measurements Tab Content */}
                        {compareViewTab === 'measurements' && (
                          <motion.div
                            key="measurements-tab"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            {/* Date Range Header */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-800/50 border border-white/5">
                              <div className="text-center">
                                <span className="text-[9px] font-medium text-red-400 uppercase block">Before</span>
                                <span className="text-xs text-white font-semibold">{format(new Date(comparison.before.record_date), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="px-2">
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="text-center">
                                <span className="text-[9px] font-medium text-emerald-400 uppercase block">After</span>
                                <span className="text-xs text-white font-semibold">{format(new Date(comparison.after.record_date), 'MMM d, yyyy')}</span>
                              </div>
                            </div>

                            {/* Body Composition */}
                            {(comparison.changes.weight || comparison.changes.bmi || comparison.changes.body_fat_percentage) && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Scale className="w-3.5 h-3.5" />
                                  Body Composition
                                </h4>
                                <div className="space-y-1.5">
                                  {comparison.changes.weight && (
                                    <CompareRow
                                      label="Weight"
                                      unit="kg"
                                      before={comparison.changes.weight.before}
                                      after={comparison.changes.weight.after}
                                      diff={comparison.changes.weight.diff}
                                      invertColors
                                    />
                                  )}
                                  {comparison.changes.bmi && (
                                    <CompareRow
                                      label="BMI"
                                      before={comparison.changes.bmi.before}
                                      after={comparison.changes.bmi.after}
                                      diff={comparison.changes.bmi.diff}
                                      invertColors
                                    />
                                  )}
                                  {comparison.changes.body_fat_percentage && (
                                    <CompareRow
                                      label="Body Fat"
                                      unit="%"
                                      before={comparison.changes.body_fat_percentage.before}
                                      after={comparison.changes.body_fat_percentage.after}
                                      diff={comparison.changes.body_fat_percentage.diff}
                                      invertColors
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Body Part Measurements */}
                            {(comparison.changes.chest || comparison.changes.waist || comparison.changes.hips || comparison.changes.biceps || comparison.changes.thighs || comparison.changes.calves) && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Ruler className="w-3.5 h-3.5" />
                                  Body Measurements
                                </h4>
                                <div className="space-y-1.5">
                                  {comparison.changes.chest && (
                                    <CompareRow
                                      label="Chest"
                                      unit="cm"
                                      before={comparison.changes.chest.before}
                                      after={comparison.changes.chest.after}
                                      diff={comparison.changes.chest.diff}
                                    />
                                  )}
                                  {comparison.changes.waist && (
                                    <CompareRow
                                      label="Waist"
                                      unit="cm"
                                      before={comparison.changes.waist.before}
                                      after={comparison.changes.waist.after}
                                      diff={comparison.changes.waist.diff}
                                      invertColors
                                    />
                                  )}
                                  {comparison.changes.hips && (
                                    <CompareRow
                                      label="Hips"
                                      unit="cm"
                                      before={comparison.changes.hips.before}
                                      after={comparison.changes.hips.after}
                                      diff={comparison.changes.hips.diff}
                                      invertColors
                                    />
                                  )}
                                  {comparison.changes.biceps && (
                                    <CompareRow
                                      label="Biceps"
                                      unit="cm"
                                      before={comparison.changes.biceps.before}
                                      after={comparison.changes.biceps.after}
                                      diff={comparison.changes.biceps.diff}
                                    />
                                  )}
                                  {comparison.changes.thighs && (
                                    <CompareRow
                                      label="Thighs"
                                      unit="cm"
                                      before={comparison.changes.thighs.before}
                                      after={comparison.changes.thighs.after}
                                      diff={comparison.changes.thighs.diff}
                                    />
                                  )}
                                  {comparison.changes.calves && (
                                    <CompareRow
                                      label="Calves"
                                      unit="cm"
                                      before={comparison.changes.calves.before}
                                      after={comparison.changes.calves.after}
                                      diff={comparison.changes.calves.diff}
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* No measurements message */}
                            {!comparison.changes.weight && !comparison.changes.bmi && !comparison.changes.body_fat_percentage &&
                             !comparison.changes.chest && !comparison.changes.waist && !comparison.changes.hips &&
                             !comparison.changes.biceps && !comparison.changes.thighs && !comparison.changes.calves && (
                              <div className="py-8 text-center text-slate-500">
                                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No measurements available for comparison</p>
                                <p className="text-xs mt-1">Add measurements when recording progress</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - Add Progress Button - Compact */}
              {view === 'list' && (
                <div className="p-3 border-t border-slate-200/60 bg-slate-50/80 flex-shrink-0 space-y-2">
                  {/* Monthly Limit Indicator */}
                  {monthlyLimit && (
                    <div className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
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
                  
                  <button
                    onClick={() => { onClose(); onAddProgress(); }}
                    disabled={monthlyLimit && !monthlyLimit.canAdd}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {monthlyLimit && !monthlyLimit.canAdd ? 'Monthly Limit Reached' : 'Add New Progress Entry'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Compare Row Component - Compact
function CompareRow({ 
  label, 
  unit = '', 
  before, 
  after, 
  diff,
  invertColors = false
}: { 
  label: string; 
  unit?: string; 
  before: number; 
  after: number; 
  diff: number;
  invertColors?: boolean;
}) {
  const isPositive = invertColors ? diff < 0 : diff > 0;
  const isNegative = invertColors ? diff > 0 : diff < 0;

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{before}{unit}</span>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
          isPositive ? 'bg-emerald-100 text-emerald-600' :
          isNegative ? 'bg-red-100 text-red-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {isPositive && <ArrowUpRight className="w-2.5 h-2.5" />}
          {isNegative && <ArrowDownRight className="w-2.5 h-2.5" />}
          {diff === 0 && <Minus className="w-2.5 h-2.5" />}
          <span className="text-[10px] font-bold">
            {diff > 0 ? '+' : ''}{diff}{unit}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-800">{after}{unit}</span>
      </div>
    </div>
  );
}

export default ProgressHistoryModal;
