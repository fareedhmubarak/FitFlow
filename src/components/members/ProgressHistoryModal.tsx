import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Scale, Ruler, Activity, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Minus, Loader2, TrendingUp,
  Camera, Plus, Trash2, GitCompare, ArrowLeft, Share2, Download, MessageCircle, Instagram
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { progressService, MemberProgress, ProgressComparison } from '@/lib/progressService';
import { exportService } from '@/lib/exportService';
import { SocialMediaExport } from './SocialMediaExport';

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
  const [showSocialExport, setShowSocialExport] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  // Load progress when modal opens or refreshTrigger changes
  useEffect(() => {
    if (isOpen && memberId) {
      loadProgress();
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-[201] flex items-center justify-center"
          >
            <div className="w-full max-h-[90vh] overflow-hidden bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {view !== 'list' && (
                    <button
                      onClick={resetView}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {view === 'list' && 'Progress History'}
                      {view === 'detail' && 'Progress Details'}
                      {view === 'compare' && 'Compare Progress'}
                    </h2>
                    <p className="text-sm text-slate-400">{memberName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Export button - only in list view with progress */}
                  {view === 'list' && progress.length > 0 && (
                    <button
                      onClick={handleExportProgress}
                      className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      title="Export to Excel"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {/* List View */}
                  {view === 'list' && (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        </div>
                      ) : progress.length === 0 ? (
                        <div className="text-center py-12">
                          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-slate-400 mb-4">No progress records yet</p>
                          <button
                            onClick={() => { onClose(); onAddProgress(); }}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold inline-flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Entry
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Social Media Export Button - For 2+ records */}
                          {progress.length >= 2 && (
                            <div className="mb-4">
                              <button
                                onClick={() => setShowSocialExport(true)}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                              >
                                <Instagram className="w-5 h-5" />
                                <span className="font-medium">Create Social Media Post</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <p className="text-xs text-slate-500 text-center mt-2">5 professional templates • Instagram, Facebook ready</p>
                            </div>
                          )}

                          {/* Compare Mode Toggle */}
                          {progress.length >= 2 && (
                            <div className="mb-4 flex items-center justify-between">
                              <button
                                onClick={() => {
                                  setCompareMode(!compareMode);
                                  setCompareSelection({ before: null, after: null });
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                                  compareMode
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                <GitCompare className="w-4 h-4" />
                                {compareMode ? 'Cancel Compare' : 'Compare 2'}
                              </button>

                              {compareMode && compareSelection.before && compareSelection.after && (
                                <button
                                  onClick={handleCompare}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm"
                                >
                                  Compare Now
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {compareMode && (
                            <p className="text-sm text-slate-400 mb-4">
                              Select 2 records to compare (selected: {[compareSelection.before, compareSelection.after].filter(Boolean).length}/2)
                            </p>
                          )}

                          {/* Progress Timeline */}
                          <div className="space-y-3">
                            {progress.map((record, index) => {
                              const bmiCategory = record.bmi ? progressService.getBMICategory(record.bmi) : null;
                              
                              return (
                                <motion.button
                                  key={record.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => {
                                    if (compareMode) {
                                      toggleCompareSelection(record);
                                    } else {
                                      setSelectedRecord(record);
                                      setView('detail');
                                    }
                                  }}
                                  className={`w-full p-4 rounded-2xl text-left transition-all ${
                                    compareMode && isSelected(record)
                                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                      : 'bg-slate-800/50 border border-white/5 hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-white">
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
                                            <Scale className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-sm text-slate-300">{record.weight} kg</span>
                                          </div>
                                        )}
                                        {record.bmi && (
                                          <div className="flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-sm text-slate-300">BMI: {record.bmi}</span>
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
                                      <ChevronRight className="w-5 h-5 text-slate-500" />
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

                  {/* Compare View */}
                  {view === 'compare' && comparison && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-4"
                      ref={comparisonRef}
                    >
                      {/* Header with Share Buttons */}
                      <div className="flex items-center justify-between">
                        {/* Duration Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">{comparison.daysBetween} Days Progress</span>
                        </div>

                        {/* Share Buttons */}
                        <div className="flex items-center gap-2">
                          {memberPhone && (
                            <button
                              onClick={handleShareToWhatsApp}
                              disabled={sharing}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                              title="Share to WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                          )}
                          <button
                            onClick={handleShareWithImage}
                            disabled={sharing || !memberPhone}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700/50 text-slate-300 border border-white/10 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title="Share with Image"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Photo View Tabs */}
                      {(hasPhotos(comparison.before) || hasPhotos(comparison.after)) && (
                        <div className="space-y-4">
                          {/* Tab Selector */}
                          <div className="flex gap-2 p-1 rounded-xl bg-slate-800/50 border border-white/5">
                            {(['front', 'back', 'left', 'right'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setActivePhotoView(type)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize ${
                                  activePhotoView === type
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>

                          {/* Large Side-by-Side Photo Comparison */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Before Photo */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Before</span>
                                <span className="text-xs text-slate-500">{format(new Date(comparison.before.record_date), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 border-2 border-red-500/30 shadow-lg shadow-red-500/10">
                                {comparison.before[`photo_${activePhotoView}_url` as keyof MemberProgress] ? (
                                  <img 
                                    src={comparison.before[`photo_${activePhotoView}_url` as keyof MemberProgress] as string} 
                                    alt={`Before ${activePhotoView}`} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                    <Camera className="w-8 h-8" />
                                    <span className="text-xs">No Photo</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* After Photo */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">After</span>
                                <span className="text-xs text-slate-500">{format(new Date(comparison.after.record_date), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                {comparison.after[`photo_${activePhotoView}_url` as keyof MemberProgress] ? (
                                  <img 
                                    src={comparison.after[`photo_${activePhotoView}_url` as keyof MemberProgress] as string} 
                                    alt={`After ${activePhotoView}`} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                    <Camera className="w-8 h-8" />
                                    <span className="text-xs">No Photo</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Photo Thumbnails - Quick Navigation */}
                          <div className="grid grid-cols-4 gap-2">
                            {(['front', 'back', 'left', 'right'] as const).map((type) => {
                              const hasBeforePhoto = !!comparison.before[`photo_${type}_url` as keyof MemberProgress];
                              const hasAfterPhoto = !!comparison.after[`photo_${type}_url` as keyof MemberProgress];
                              const isActive = activePhotoView === type;
                              
                              return (
                                <button
                                  key={type}
                                  onClick={() => setActivePhotoView(type)}
                                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                                    isActive 
                                      ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
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
                                          <Camera className="w-3 h-3 text-slate-700" />
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
                                          <Camera className="w-3 h-3 text-slate-700" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="absolute bottom-0 inset-x-0 text-[10px] text-center py-0.5 bg-black/60 capitalize text-slate-300">
                                    {type}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Measurement Changes */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Changes
                        </h4>
                        <div className="space-y-2">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - Add Progress Button */}
              {view === 'list' && (
                <div className="p-4 border-t border-white/10">
                  <button
                    onClick={() => { onClose(); onAddProgress(); }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Progress Entry
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* Social Media Export Modal */}
      <SocialMediaExport
        isOpen={showSocialExport}
        onClose={() => setShowSocialExport(false)}
        memberName={memberName}
        memberPhone={memberPhone}
        progressRecords={progress}
      />
    </AnimatePresence>
  );
}

// Compare Row Component
function CompareRow({ 
  label, 
  unit = '', 
  before, 
  after, 
  diff,
  invertColors = false // When true, decrease is good (for weight, BMI, waist)
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
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{before}{unit}</span>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
          isPositive ? 'bg-emerald-500/20 text-emerald-400' :
          isNegative ? 'bg-red-500/20 text-red-400' :
          'bg-slate-500/20 text-slate-400'
        }`}>
          {isPositive && <ArrowUpRight className="w-3 h-3" />}
          {isNegative && <ArrowDownRight className="w-3 h-3" />}
          {diff === 0 && <Minus className="w-3 h-3" />}
          <span className="text-xs font-bold">
            {diff > 0 ? '+' : ''}{diff}{unit}
          </span>
        </div>
        <span className="text-sm font-medium text-white">{after}{unit}</span>
      </div>
    </div>
  );
}

export default ProgressHistoryModal;
