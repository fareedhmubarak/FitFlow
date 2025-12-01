import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Scale, Ruler, Activity, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Minus, Loader2, TrendingUp,
  Camera, Plus, Trash2, GitCompare, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { progressService, MemberProgress, ProgressComparison } from '@/lib/progressService';

interface ProgressHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onAddProgress: () => void;
}

export function ProgressHistoryModal({ 
  isOpen, 
  onClose, 
  memberId, 
  memberName,
  onAddProgress 
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

  useEffect(() => {
    if (isOpen && memberId) {
      loadProgress();
    }
  }, [isOpen, memberId]);

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
    return record.photo_front || record.photo_back || record.photo_left || record.photo_right;
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
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
                                {compareMode ? 'Cancel Compare' : 'Compare'}
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
                              { url: selectedRecord.photo_front, label: 'Front' },
                              { url: selectedRecord.photo_back, label: 'Back' },
                              { url: selectedRecord.photo_left, label: 'Left' },
                              { url: selectedRecord.photo_right, label: 'Right' },
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
                        selectedRecord.biceps_left || selectedRecord.biceps_right ||
                        selectedRecord.thighs_left || selectedRecord.thighs_right) && (
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
                            {selectedRecord.biceps_left && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">L Bicep</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.biceps_left} cm</span>
                              </div>
                            )}
                            {selectedRecord.biceps_right && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">R Bicep</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.biceps_right} cm</span>
                              </div>
                            )}
                            {selectedRecord.thighs_left && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">L Thigh</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.thighs_left} cm</span>
                              </div>
                            )}
                            {selectedRecord.thighs_right && (
                              <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-center">
                                <span className="text-[10px] text-slate-500 block">R Thigh</span>
                                <span className="text-sm font-bold text-white">{selectedRecord.thighs_right} cm</span>
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
                    >
                      {/* Date Range */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <div className="text-center">
                            <span className="text-xs text-slate-500 block mb-1">Before</span>
                            <span className="font-medium">{format(new Date(comparison.before.record_date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3">
                            <div className="h-px w-8 bg-emerald-500/50" />
                            <span className="text-emerald-400 font-bold">{comparison.daysBetween} days</span>
                            <div className="h-px w-8 bg-emerald-500/50" />
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-slate-500 block mb-1">After</span>
                            <span className="font-medium">{format(new Date(comparison.after.record_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Photo Comparison */}
                      {(hasPhotos(comparison.before) || hasPhotos(comparison.after)) && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Photo Comparison
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(['front', 'back', 'left', 'right'] as const).map((type) => {
                              const beforeUrl = comparison.before[`photo_${type}_url` as keyof MemberProgress] as string | null;
                              const afterUrl = comparison.after[`photo_${type}_url` as keyof MemberProgress] as string | null;
                              
                              if (!beforeUrl && !afterUrl) return null;
                              
                              return (
                                <div key={type} className="space-y-2">
                                  <span className="text-xs text-slate-500 capitalize block text-center">{type}</span>
                                  <div className="grid grid-cols-2 gap-1">
                                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-800">
                                      {beforeUrl ? (
                                        <img src={beforeUrl} alt={`Before ${type}`} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                          <Camera className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-800">
                                      {afterUrl ? (
                                        <img src={afterUrl} alt={`After ${type}`} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                          <Camera className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
                          {comparison.changes.biceps_left && (
                            <CompareRow
                              label="L Bicep"
                              unit="cm"
                              before={comparison.changes.biceps_left.before}
                              after={comparison.changes.biceps_left.after}
                              diff={comparison.changes.biceps_left.diff}
                            />
                          )}
                          {comparison.changes.biceps_right && (
                            <CompareRow
                              label="R Bicep"
                              unit="cm"
                              before={comparison.changes.biceps_right.before}
                              after={comparison.changes.biceps_right.after}
                              diff={comparison.changes.biceps_right.diff}
                            />
                          )}
                          {comparison.changes.thighs_left && (
                            <CompareRow
                              label="L Thigh"
                              unit="cm"
                              before={comparison.changes.thighs_left.before}
                              after={comparison.changes.thighs_left.after}
                              diff={comparison.changes.thighs_left.diff}
                            />
                          )}
                          {comparison.changes.thighs_right && (
                            <CompareRow
                              label="R Thigh"
                              unit="cm"
                              before={comparison.changes.thighs_right.before}
                              after={comparison.changes.thighs_right.after}
                              diff={comparison.changes.thighs_right.diff}
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
