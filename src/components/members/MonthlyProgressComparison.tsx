import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MessageCircle, Loader2, Check, Instagram
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { MemberProgress } from '@/lib/progressService';

interface MonthlyProgressComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberPhone?: string;
  gymName?: string;
  progressRecords: MemberProgress[]; // Should be sorted by date (oldest first)
}

type PhotoView = 'front' | 'back' | 'left' | 'right';
type ExportFormat = 'instagram-square' | 'instagram-story' | 'facebook' | 'collage';

export function MonthlyProgressComparison({
  isOpen,
  onClose,
  memberName,
  memberPhone,
  gymName = 'FitFlow Gym',
  progressRecords
}: MonthlyProgressComparisonProps) {
  const [activeView, setActiveView] = useState<PhotoView>('front');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([0, 1, 2, 3].slice(0, Math.min(4, progressRecords.length)));
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const socialExportRef = useRef<HTMLDivElement>(null);

  // Get up to 4 most recent records for monthly comparison
  const weeklyRecords = progressRecords.slice(0, 4);

  const getPhotoUrl = (record: MemberProgress, view: PhotoView): string | null => {
    const key = `photo_${view}_url` as keyof MemberProgress;
    return record[key] as string | null;
  };

  const toggleWeekSelection = (index: number) => {
    if (selectedWeeks.includes(index)) {
      if (selectedWeeks.length > 2) {
        setSelectedWeeks(selectedWeeks.filter(i => i !== index));
      }
    } else if (selectedWeeks.length < 4) {
      setSelectedWeeks([...selectedWeeks, index].sort((a, b) => a - b));
    }
  };

  const getWeightChange = () => {
    if (selectedWeeks.length < 2) return null;
    const firstRecord = weeklyRecords[selectedWeeks[0]];
    const lastRecord = weeklyRecords[selectedWeeks[selectedWeeks.length - 1]];
    if (!firstRecord?.weight || !lastRecord?.weight) return null;
    return {
      before: firstRecord.weight,
      after: lastRecord.weight,
      diff: Number((lastRecord.weight - firstRecord.weight).toFixed(1))
    };
  };

  const getMeasurementChanges = () => {
    if (selectedWeeks.length < 2) return {};
    const firstRecord = weeklyRecords[selectedWeeks[0]];
    const lastRecord = weeklyRecords[selectedWeeks[selectedWeeks.length - 1]];
    
    const changes: Record<string, { before: number; after: number; diff: number }> = {};
    
    const measurements = ['weight', 'chest', 'waist', 'hips', 'biceps', 'thighs', 'calves'] as const;
    
    measurements.forEach(key => {
      const before = firstRecord?.[key] as number | undefined;
      const after = lastRecord?.[key] as number | undefined;
      if (before && after) {
        changes[key] = {
          before,
          after,
          diff: Number((after - before).toFixed(1))
        };
      }
    });
    
    return changes;
  };

  const getDurationDays = () => {
    if (selectedWeeks.length < 2) return 0;
    const firstDate = new Date(weeklyRecords[selectedWeeks[0]].record_date);
    const lastDate = new Date(weeklyRecords[selectedWeeks[selectedWeeks.length - 1]].record_date);
    return Math.abs(Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Export as social media ready image
  const handleExportForSocial = async (format: ExportFormat) => {
    if (!socialExportRef.current) return;
    
    setExporting(true);
    setShowExportOptions(false);
    
    try {
      // Configure dimensions based on format
      const dimensions = {
        'instagram-square': { width: 1080, height: 1080 },
        'instagram-story': { width: 1080, height: 1920 },
        'facebook': { width: 1200, height: 630 },
        'collage': { width: 1920, height: 1080 }
      };
      
      const { width, height } = dimensions[format];
      
      const canvas = await html2canvas(socialExportRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
        width: socialExportRef.current.scrollWidth,
        height: socialExportRef.current.scrollHeight,
      });

      // Create final canvas with proper dimensions
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext('2d');
      
      if (ctx) {
        // Fill background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate scaling to fit
        const scale = Math.min(width / canvas.width, height / canvas.height) * 0.95;
        const x = (width - canvas.width * scale) / 2;
        const y = (height - canvas.height * scale) / 2;
        
        ctx.drawImage(canvas, x, y, canvas.width * scale, canvas.height * scale);
      }

      // Download
      const link = document.createElement('a');
      link.download = `${memberName.replace(/[^a-zA-Z0-9]/g, '_')}_${format}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = finalCanvas.toDataURL('image/png', 1.0);
      link.click();
      
      toast.success('Image exported! Ready for social media 📸');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  const handleShareToWhatsApp = () => {
    if (!memberPhone) {
      toast.error('Phone number not available');
      return;
    }

    const changes = getMeasurementChanges();
    const duration = getDurationDays();
    
    let message = `🏋️ *${gymName}*\n\n`;
    message += `📊 *Monthly Progress Report*\n`;
    message += `👤 *${memberName}*\n\n`;
    message += `⏱️ Duration: *${duration} days* (${selectedWeeks.length} weeks)\n\n`;
    message += `━━━━━━━━━━━━━━━━━\n`;
    message += `*📈 Transformation Summary*\n`;
    message += `━━━━━━━━━━━━━━━━━\n\n`;

    const labels: Record<string, { label: string; unit: string; invertGood: boolean }> = {
      weight: { label: 'Weight', unit: 'kg', invertGood: true },
      chest: { label: 'Chest', unit: 'cm', invertGood: false },
      waist: { label: 'Waist', unit: 'cm', invertGood: true },
      hips: { label: 'Hips', unit: 'cm', invertGood: true },
      biceps: { label: 'Biceps', unit: 'cm', invertGood: false },
      thighs: { label: 'Thighs', unit: 'cm', invertGood: false },
      calves: { label: 'Calves', unit: 'cm', invertGood: false },
    };

    Object.entries(changes).forEach(([key, change]) => {
      const config = labels[key];
      if (config) {
        const isGood = config.invertGood ? change.diff < 0 : change.diff > 0;
        const emoji = isGood ? '✅' : (change.diff === 0 ? '➖' : '⚠️');
        const diffStr = change.diff > 0 ? `+${change.diff}` : `${change.diff}`;
        message += `${emoji} *${config.label}*: ${change.before}${config.unit} → ${change.after}${config.unit} (${diffStr}${config.unit})\n`;
      }
    });

    message += `\n━━━━━━━━━━━━━━━━━\n`;
    message += `\n💪 Amazing transformation!\n`;
    message += `\n_Powered by ${gymName}_`;

    // Clean phone and open WhatsApp
    let cleanPhone = memberPhone.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('+91')) cleanPhone = cleanPhone.substring(1);
    else if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  if (!isOpen) return null;

  const weightChange = getWeightChange();
  const changes = getMeasurementChanges();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[95vh] overflow-hidden bg-slate-900 rounded-3xl shadow-2xl border border-white/10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Monthly Progress</h2>
              <p className="text-sm text-slate-400">{memberName} • {getDurationDays()} Days Journey</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm shadow-lg shadow-purple-500/30 disabled:opacity-50"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                  Export
                </button>
                
                <AnimatePresence>
                  {showExportOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-xl overflow-hidden z-10"
                    >
                      <button
                        onClick={() => handleExportForSocial('instagram-square')}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold">1:1</span>
                        </div>
                        Instagram Post
                      </button>
                      <button
                        onClick={() => handleExportForSocial('instagram-story')}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold">9:16</span>
                        </div>
                        Instagram Story
                      </button>
                      <button
                        onClick={() => handleExportForSocial('facebook')}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold">FB</span>
                        </div>
                        Facebook Post
                      </button>
                      <button
                        onClick={() => handleExportForSocial('collage')}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold">HD</span>
                        </div>
                        HD Collage
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {memberPhone && (
                <button
                  onClick={handleShareToWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 font-medium text-sm hover:bg-green-500/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              )}

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Photo View Tabs */}
          <div className="flex gap-2 p-4 border-b border-white/10">
            {(['front', 'back', 'left', 'right'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all capitalize ${
                  activeView === view
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Social Export Preview */}
            <div 
              ref={socialExportRef}
              className="bg-slate-900 rounded-2xl p-6 space-y-6"
            >
              {/* Brand Header */}
              <div className="text-center">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  {gymName}
                </h3>
                <p className="text-slate-400 text-sm mt-1">Transformation Journey</p>
              </div>

              {/* Member Name & Duration */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-white">{memberName}</h4>
                  <p className="text-emerald-400 text-sm">{getDurationDays()} Days Progress</p>
                </div>
                {weightChange && (
                  <div className={`px-4 py-2 rounded-xl ${weightChange.diff < 0 ? 'bg-emerald-500/20 text-emerald-400' : weightChange.diff > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    <span className="text-sm">Weight</span>
                    <p className="text-xl font-bold">
                      {weightChange.diff > 0 ? '+' : ''}{weightChange.diff} kg
                    </p>
                  </div>
                )}
              </div>

              {/* Weekly Photo Grid */}
              <div className="grid grid-cols-4 gap-3">
                {weeklyRecords.slice(0, 4).map((record, index) => {
                  const photoUrl = getPhotoUrl(record, activeView);
                  const isSelected = selectedWeeks.includes(index);
                  
                  return (
                    <div 
                      key={record.id}
                      onClick={() => toggleWeekSelection(index)}
                      className={`relative cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : 'opacity-60 hover:opacity-100'
                      } rounded-xl overflow-hidden`}
                    >
                      {/* Week Label */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
                        Week {index + 1}
                      </div>
                      
                      {/* Date */}
                      <div className="absolute bottom-2 left-2 right-2 z-10 px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] text-center">
                        {format(new Date(record.record_date), 'MMM d')}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {/* Photo */}
                      <div className="aspect-[3/4] bg-slate-800">
                        {photoUrl ? (
                          <img 
                            src={photoUrl} 
                            alt={`Week ${index + 1} ${activeView}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Camera className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Weight Label */}
                      {record.weight && (
                        <div className="absolute bottom-10 left-2 right-2 z-10 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/80 text-white text-xs font-bold">
                            {record.weight} kg
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Measurement Changes Summary */}
              {Object.keys(changes).length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Object.entries(changes).map(([key, change]) => {
                    const labels: Record<string, { label: string; unit: string; invertGood: boolean }> = {
                      weight: { label: 'Weight', unit: 'kg', invertGood: true },
                      chest: { label: 'Chest', unit: 'cm', invertGood: false },
                      waist: { label: 'Waist', unit: 'cm', invertGood: true },
                      hips: { label: 'Hips', unit: 'cm', invertGood: true },
                      biceps: { label: 'Biceps', unit: 'cm', invertGood: false },
                      thighs: { label: 'Thighs', unit: 'cm', invertGood: false },
                      calves: { label: 'Calves', unit: 'cm', invertGood: false },
                    };
                    const config = labels[key];
                    if (!config) return null;
                    
                    const isGood = config.invertGood ? change.diff < 0 : change.diff > 0;
                    
                    return (
                      <div 
                        key={key}
                        className={`p-3 rounded-xl text-center ${
                          isGood ? 'bg-emerald-500/20 border border-emerald-500/30' : 
                          change.diff === 0 ? 'bg-slate-500/20 border border-slate-500/30' :
                          'bg-orange-500/20 border border-orange-500/30'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 block">{config.label}</span>
                        <span className={`text-sm font-bold ${
                          isGood ? 'text-emerald-400' : change.diff === 0 ? 'text-slate-400' : 'text-orange-400'
                        }`}>
                          {change.diff > 0 ? '+' : ''}{change.diff}{config.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer Branding */}
              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-slate-500 text-xs">
                  💪 Transformation powered by <span className="text-emerald-400 font-medium">{gymName}</span>
                </p>
              </div>
            </div>

            {/* All Views Grid - Full Comparison */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-400 mb-3">All Angles Comparison</h4>
              <div className="grid grid-cols-4 gap-2">
                {(['front', 'back', 'left', 'right'] as const).map((view) => (
                  <div key={view} className="space-y-2">
                    <span className="text-xs text-slate-500 capitalize block text-center">{view}</span>
                    <div className="space-y-1">
                      {selectedWeeks.map((weekIndex) => {
                        const record = weeklyRecords[weekIndex];
                        if (!record) return null;
                        const photoUrl = getPhotoUrl(record, view);
                        
                        return (
                          <div key={record.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-800">
                            {photoUrl ? (
                              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-4 h-4 text-slate-600" />
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-white">
                              W{weekIndex + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer - Selection Help */}
          <div className="p-4 border-t border-white/10 bg-slate-800/50">
            <p className="text-xs text-slate-400 text-center">
              Click on weeks to select/deselect (minimum 2, maximum 4) • Selected: {selectedWeeks.length} weeks
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MonthlyProgressComparison;
