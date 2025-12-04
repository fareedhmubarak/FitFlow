import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, MessageCircle, Loader2, Check, Instagram, 
  Sparkles, Zap, Trophy, Flame, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { MemberProgress } from '@/lib/progressService';

interface SocialMediaExportProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberPhone?: string;
  gymName?: string;
  gymLogo?: string;
  progressRecords: MemberProgress[];
}

type TemplateVariant = 'before-after' | 'weekly-grid' | 'timeline' | 'dramatic' | 'minimal';
type ExportSize = 'instagram-square' | 'instagram-story' | 'facebook';
type PhotoView = 'front' | 'back' | 'left' | 'right';

interface TemplateProps {
  memberName: string;
  gymName: string;
  firstRecord?: MemberProgress;
  lastRecord?: MemberProgress;
  records?: MemberProgress[];
  activePhotoView: PhotoView;
  weightChange: { before: number; after: number; diff: number } | null;
  duration: number;
  exportSize: ExportSize;
}

interface TemplateConfig {
  id: TemplateVariant;
  name: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
  accentColor: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'before-after',
    name: 'Classic Before/After',
    description: 'Side-by-side transformation',
    icon: <Zap className="w-5 h-5" />,
    bgGradient: 'from-slate-900 via-slate-800 to-slate-900',
    accentColor: 'emerald'
  },
  {
    id: 'weekly-grid',
    name: 'Weekly Progress Grid',
    description: '4 weeks in a grid layout',
    icon: <Sparkles className="w-5 h-5" />,
    bgGradient: 'from-purple-900 via-slate-900 to-purple-900',
    accentColor: 'purple'
  },
  {
    id: 'timeline',
    name: 'Timeline Journey',
    description: 'Horizontal progress flow',
    icon: <Trophy className="w-5 h-5" />,
    bgGradient: 'from-amber-900 via-slate-900 to-amber-900',
    accentColor: 'amber'
  },
  {
    id: 'dramatic',
    name: 'Dramatic Split',
    description: 'Bold diagonal comparison',
    icon: <Flame className="w-5 h-5" />,
    bgGradient: 'from-red-900 via-slate-900 to-orange-900',
    accentColor: 'red'
  },
  {
    id: 'minimal',
    name: 'Clean Minimal',
    description: 'Simple elegant design',
    icon: <Star className="w-5 h-5" />,
    bgGradient: 'from-gray-900 via-black to-gray-900',
    accentColor: 'white'
  }
];

export function SocialMediaExport({
  isOpen,
  onClose,
  memberName,
  memberPhone,
  gymName = 'FitFlow Gym',
  progressRecords
}: SocialMediaExportProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateVariant>('before-after');
  const [exportSize] = useState<ExportSize>('instagram-square');
  const [exporting, setExporting] = useState(false);
  const [activePhotoView] = useState<'front' | 'back' | 'left' | 'right'>('front');
  const exportRef = useRef<HTMLDivElement>(null);

  // Get records (most recent 4)
  const records = progressRecords.slice(0, 4);
  const firstRecord = records[records.length - 1]; // Oldest
  const lastRecord = records[0]; // Most recent

  const getDurationDays = () => {
    if (records.length < 2) return 0;
    const first = new Date(records[records.length - 1].record_date);
    const last = new Date(records[0].record_date);
    return Math.abs(Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getWeightChange = () => {
    if (!firstRecord?.weight || !lastRecord?.weight) return null;
    return {
      before: firstRecord.weight,
      after: lastRecord.weight,
      diff: Number((lastRecord.weight - firstRecord.weight).toFixed(1))
    };
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    
    setExporting(true);
    try {
      const sizes = {
        'instagram-square': { width: 1080, height: 1080 },
        'instagram-story': { width: 1080, height: 1920 },
        'facebook': { width: 1200, height: 630 }
      };
      
      const { width, height } = sizes[exportSize];
      
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        const scale = Math.min(width / canvas.width, height / canvas.height);
        const x = (width - canvas.width * scale) / 2;
        const y = (height - canvas.height * scale) / 2;
        ctx.drawImage(canvas, x, y, canvas.width * scale, canvas.height * scale);
      }

      const link = document.createElement('a');
      const sizeName = exportSize.replace('-', '_');
      link.download = `${memberName.replace(/[^a-zA-Z0-9]/g, '_')}_transformation_${selectedTemplate}_${sizeName}.png`;
      link.href = finalCanvas.toDataURL('image/png', 1.0);
      link.click();
      
      toast.success('Image exported! Ready for social media 🚀');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  const weightChange = getWeightChange();
  const duration = getDurationDays();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]"
      />

      {/* Compact Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed inset-0 z-[401] flex items-center justify-center p-3"
        style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 3rem))' }}
        onClick={onClose}
      >
        <div 
          className="w-[90vw] max-w-[340px] max-h-[75vh] overflow-hidden bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 flex flex-col popup-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Compact */}
          <div className="flex items-center justify-between p-2.5 border-b border-white/10 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Instagram className="w-4 h-4 text-pink-500" />
              Social Export
            </h2>
            <div className="w-7" />
          </div>

          {/* Content - Compact Scrollable */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-hide">
            {/* Preview - Scaled Down */}
            <div>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preview</p>
              <div className="flex justify-center">
                <div 
                  ref={exportRef}
                  className="relative overflow-hidden rounded-lg shadow-xl"
                  style={{
                    width: exportSize === 'instagram-story' ? '100px' : exportSize === 'facebook' ? '160px' : '120px',
                    height: exportSize === 'instagram-story' ? '178px' : exportSize === 'facebook' ? '84px' : '120px'
                  }}
                >
                  {selectedTemplate === 'before-after' && (
                    <BeforeAfterTemplate
                      memberName={memberName}
                      gymName={gymName}
                      firstRecord={firstRecord}
                      lastRecord={lastRecord}
                      activePhotoView={activePhotoView}
                      weightChange={weightChange}
                      duration={duration}
                      exportSize={exportSize}
                    />
                  )}
                  {selectedTemplate === 'weekly-grid' && (
                    <WeeklyGridTemplate
                      memberName={memberName}
                      gymName={gymName}
                      records={records}
                      activePhotoView={activePhotoView}
                      weightChange={weightChange}
                      duration={duration}
                      exportSize={exportSize}
                    />
                  )}
                  {selectedTemplate === 'timeline' && (
                    <TimelineTemplate
                      memberName={memberName}
                      gymName={gymName}
                      records={records}
                      activePhotoView={activePhotoView}
                      weightChange={weightChange}
                      duration={duration}
                      exportSize={exportSize}
                    />
                  )}
                  {selectedTemplate === 'dramatic' && (
                    <DramaticTemplate
                      memberName={memberName}
                      gymName={gymName}
                      firstRecord={firstRecord}
                      lastRecord={lastRecord}
                      activePhotoView={activePhotoView}
                      weightChange={weightChange}
                      duration={duration}
                      exportSize={exportSize}
                    />
                  )}
                  {selectedTemplate === 'minimal' && (
                    <MinimalTemplate
                      memberName={memberName}
                      gymName={gymName}
                      firstRecord={firstRecord}
                      lastRecord={lastRecord}
                      activePhotoView={activePhotoView}
                      weightChange={weightChange}
                      duration={duration}
                      exportSize={exportSize}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Templates - Compact */}
            <div>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Templates</p>
              <div className="space-y-1">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                      selectedTemplate === template.id
                        ? 'bg-emerald-500/20 border border-emerald-500'
                        : 'bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded bg-gradient-to-br ${template.bgGradient} flex items-center justify-center text-white flex-shrink-0`}>
                      <span className="w-3.5 h-3.5 flex items-center justify-center">{template.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-[10px] truncate">{template.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{template.description}</p>
                    </div>
                    {selectedTemplate === template.id && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions - Compact */}
          <div className="p-2.5 border-t border-white/10 flex-shrink-0 space-y-1.5">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-500/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Instagram className="w-3.5 h-3.5" />
              )}
              {exporting ? 'Exporting...' : 'Export Image'}
            </button>
            
            {memberPhone && (
              <button
                onClick={() => {
                  const message = `🏋️ Check out this transformation!\n\n💪 ${memberName}\n📅 ${duration} Days\n${weightChange ? `⚖️ ${weightChange.diff > 0 ? '+' : ''}${weightChange.diff}kg` : ''}\n\n_${gymName}_`;
                  let cleanPhone = memberPhone.replace(/[\s\-()]/g, '');
                  if (cleanPhone.startsWith('+91')) cleanPhone = cleanPhone.substring(1);
                  else if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="w-full py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-medium flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3 h-3" />
                Share via WhatsApp
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// TEMPLATE 1: Classic Before/After
// ============================================
function BeforeAfterTemplate({ 
  memberName, gymName, firstRecord, lastRecord, activePhotoView, weightChange, duration, exportSize 
}: TemplateProps) {
  const getPhotoUrl = (record: MemberProgress | undefined) => {
    if (!record) return null;
    return record[`photo_${activePhotoView}_url` as keyof MemberProgress] as string | null;
  };

  const isStory = exportSize === 'instagram-story';
  const isFacebook = exportSize === 'facebook';

  return (
    <div className={`w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${isStory ? 'flex flex-col' : ''}`}>
      {/* Header */}
      <div className={`text-center ${isStory ? 'py-6' : isFacebook ? 'py-3' : 'py-4'}`}>
        <h3 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 ${isStory ? 'text-2xl' : 'text-xl'}`}>
          {gymName}
        </h3>
        <p className="text-slate-400 text-xs mt-1">TRANSFORMATION</p>
      </div>

      {/* Photos */}
      <div className={`flex ${isStory ? 'flex-col flex-1 gap-3 px-4' : 'flex-row gap-2 px-4'} ${isFacebook ? 'h-[180px]' : ''}`}>
        {/* Before */}
        <div className={`relative flex-1 ${isStory ? '' : ''}`}>
          <div className="absolute top-2 left-2 z-10 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold uppercase">
            Before
          </div>
          <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-lg bg-black/70 text-white text-xs">
            {firstRecord && format(new Date(firstRecord.record_date), 'MMM d, yyyy')}
          </div>
          <div className={`w-full h-full rounded-xl overflow-hidden bg-slate-800 ${isStory ? 'aspect-[3/4]' : ''}`}>
            {getPhotoUrl(firstRecord) ? (
              <img src={getPhotoUrl(firstRecord)!} alt="Before" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-slate-600" /></div>
            )}
          </div>
        </div>

        {/* After */}
        <div className={`relative flex-1`}>
          <div className="absolute top-2 left-2 z-10 px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-bold uppercase">
            After
          </div>
          <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-lg bg-black/70 text-white text-xs">
            {lastRecord && format(new Date(lastRecord.record_date), 'MMM d, yyyy')}
          </div>
          <div className={`w-full h-full rounded-xl overflow-hidden bg-slate-800 ${isStory ? 'aspect-[3/4]' : ''}`}>
            {getPhotoUrl(lastRecord) ? (
              <img src={getPhotoUrl(lastRecord)!} alt="After" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Camera className="w-12 h-12 text-slate-600" /></div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className={`flex items-center justify-center gap-4 ${isStory ? 'py-6' : isFacebook ? 'py-2' : 'py-4'}`}>
        <div className="text-center">
          <p className="text-emerald-400 font-bold text-lg">{duration}</p>
          <p className="text-slate-500 text-[10px] uppercase">Days</p>
        </div>
        {weightChange && (
          <>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className={`font-bold text-lg ${weightChange.diff < 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {weightChange.diff > 0 ? '+' : ''}{weightChange.diff}kg
              </p>
              <p className="text-slate-500 text-[10px] uppercase">Weight</p>
            </div>
          </>
        )}
        <div className="w-px h-8 bg-slate-700" />
        <div className="text-center">
          <p className="text-white font-bold text-sm">{memberName}</p>
          <p className="text-slate-500 text-[10px] uppercase">Member</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TEMPLATE 2: Weekly Progress Grid
// ============================================
function WeeklyGridTemplate({ 
  memberName, gymName, records, activePhotoView, weightChange, duration, exportSize 
}: TemplateProps) {
  const getPhotoUrl = (record: MemberProgress | undefined) => {
    if (!record) return null;
    return record[`photo_${activePhotoView}_url` as keyof MemberProgress] as string | null;
  };

  const isStory = exportSize === 'instagram-story';
  const isFacebook = exportSize === 'facebook';

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-slate-900 to-purple-900 p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <h3 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 ${isStory ? 'text-xl' : 'text-lg'}`}>
          {duration} DAY TRANSFORMATION
        </h3>
        <p className="text-purple-300/60 text-xs">{memberName} • {gymName}</p>
      </div>

      {/* Photo Grid */}
      <div className={`grid ${isStory ? 'grid-cols-2 gap-2' : isFacebook ? 'grid-cols-4 gap-2' : 'grid-cols-2 gap-2'} flex-1`}>
        {records.slice(0, 4).map((record: MemberProgress, index: number) => (
          <div key={record.id} className="relative rounded-xl overflow-hidden bg-slate-800">
            <div className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-purple-500/90 text-white text-[10px] font-bold">
              Week {index + 1}
            </div>
            {record.weight && (
              <div className="absolute bottom-1.5 right-1.5 z-10 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                {record.weight}kg
              </div>
            )}
            <div className={`${isStory ? 'aspect-[3/4]' : isFacebook ? 'h-[160px]' : 'aspect-square'}`}>
              {getPhotoUrl(record) ? (
                <img src={getPhotoUrl(record)!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Camera className="w-8 h-8 text-slate-600" /></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weight Change Banner */}
      {weightChange && (
        <div className="mt-3 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-center">
          <span className="text-purple-300 text-xs">Total Change: </span>
          <span className={`font-bold ${weightChange.diff < 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
            {weightChange.diff > 0 ? '+' : ''}{weightChange.diff}kg
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// TEMPLATE 3: Timeline Journey
// ============================================
function TimelineTemplate({ 
  memberName, gymName, records, activePhotoView, weightChange, duration, exportSize 
}: TemplateProps) {
  const getPhotoUrl = (record: MemberProgress | undefined) => {
    if (!record) return null;
    return record[`photo_${activePhotoView}_url` as keyof MemberProgress] as string | null;
  };

  const isStory = exportSize === 'instagram-story';
  const isFacebook = exportSize === 'facebook';

  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-900 via-slate-900 to-amber-900 flex flex-col">
      {/* Header */}
      <div className={`text-center ${isStory ? 'py-5' : 'py-3'}`}>
        <p className="text-amber-400/60 text-xs uppercase tracking-widest">The Journey</p>
        <h3 className={`font-black text-white ${isStory ? 'text-2xl' : 'text-xl'}`}>{memberName}</h3>
        <p className="text-amber-300 text-sm font-medium">{duration} Days of Progress</p>
      </div>

      {/* Timeline */}
      <div className={`flex-1 flex ${isStory ? 'flex-col px-4 gap-2' : 'flex-row px-2 gap-1'} items-center justify-center`}>
        {records.slice(0, 4).map((record: MemberProgress, index: number) => (
          <div key={record.id} className={`relative ${isStory ? 'w-full' : 'flex-1'}`}>
            {/* Connection Line */}
            {index < records.length - 1 && !isStory && (
              <div className="absolute top-1/2 right-0 w-full h-0.5 bg-gradient-to-r from-amber-500/50 to-transparent z-0" />
            )}
            
            {/* Photo */}
            <div className={`relative z-10 rounded-xl overflow-hidden bg-slate-800 border-2 border-amber-500/30 ${isStory ? 'aspect-[16/9]' : isFacebook ? 'h-[140px]' : 'aspect-[3/4]'}`}>
              <div className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {index + 1}
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 text-center">
                <span className="px-2 py-0.5 rounded bg-black/70 text-white text-[10px]">
                  {format(new Date(record.record_date), 'MMM d')}
                </span>
              </div>
              {getPhotoUrl(record) ? (
                <img src={getPhotoUrl(record)!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Camera className="w-8 h-8 text-slate-600" /></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={`text-center ${isStory ? 'py-5' : 'py-3'}`}>
        <p className="text-amber-400 font-bold text-lg">{gymName}</p>
        {weightChange && (
          <p className="text-slate-400 text-xs">
            {weightChange.before}kg → {weightChange.after}kg 
            <span className={weightChange.diff < 0 ? 'text-emerald-400' : 'text-orange-400'}>
              {' '}({weightChange.diff > 0 ? '+' : ''}{weightChange.diff}kg)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// TEMPLATE 4: Dramatic Split
// ============================================
function DramaticTemplate({ 
  memberName, gymName, firstRecord, lastRecord, activePhotoView, weightChange, duration, exportSize 
}: TemplateProps) {
  const getPhotoUrl = (record: MemberProgress | undefined) => {
    if (!record) return null;
    return record[`photo_${activePhotoView}_url` as keyof MemberProgress] as string | null;
  };

  const isStory = exportSize === 'instagram-story';

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      {/* Before - Left/Top Half */}
      <div className={`absolute ${isStory ? 'inset-x-0 top-0 h-1/2' : 'inset-y-0 left-0 w-1/2'}`}>
        <div className="w-full h-full relative">
          {getPhotoUrl(firstRecord) ? (
            <img src={getPhotoUrl(firstRecord)!} alt="Before" className="w-full h-full object-cover" style={{ filter: 'grayscale(60%)' }} />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Camera className="w-16 h-16 text-slate-700" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 to-transparent" />
        </div>
      </div>

      {/* After - Right/Bottom Half */}
      <div className={`absolute ${isStory ? 'inset-x-0 bottom-0 h-1/2' : 'inset-y-0 right-0 w-1/2'}`}>
        <div className="w-full h-full relative">
          {getPhotoUrl(lastRecord) ? (
            <img src={getPhotoUrl(lastRecord)!} alt="After" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Camera className="w-16 h-16 text-slate-700" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-orange-900/30 to-transparent" />
        </div>
      </div>

      {/* Diagonal Divider */}
      <div className={`absolute ${isStory ? 'inset-x-0 top-1/2 h-1 -translate-y-1/2 rotate-0' : 'inset-y-0 left-1/2 w-1 -translate-x-1/2'} bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 z-10`} />

      {/* Labels */}
      <div className={`absolute ${isStory ? 'top-4 left-4' : 'top-4 left-4'} z-20`}>
        <span className="px-4 py-2 rounded-full bg-red-500/90 text-white font-black text-sm uppercase tracking-wider">Before</span>
      </div>
      <div className={`absolute ${isStory ? 'bottom-4 right-4' : 'bottom-4 right-4'} z-20`}>
        <span className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black text-sm uppercase tracking-wider">After</span>
      </div>

      {/* Center Badge */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center bg-black/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-orange-500/50">
          <p className="text-orange-400 font-black text-3xl">{duration}</p>
          <p className="text-white/60 text-xs uppercase tracking-widest">Days</p>
          {weightChange && (
            <p className={`font-bold text-lg mt-1 ${weightChange.diff < 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {weightChange.diff > 0 ? '+' : ''}{weightChange.diff}kg
            </p>
          )}
        </div>
      </div>

      {/* Gym Branding */}
      <div className={`absolute ${isStory ? 'bottom-20 inset-x-0' : 'top-4 inset-x-0'} text-center z-20`}>
        <p className="text-white/80 font-bold">{memberName}</p>
        <p className="text-orange-400 text-sm">{gymName}</p>
      </div>
    </div>
  );
}

// ============================================
// TEMPLATE 5: Clean Minimal
// ============================================
function MinimalTemplate({ 
  memberName, gymName, firstRecord, lastRecord, activePhotoView, weightChange, duration, exportSize 
}: TemplateProps) {
  const getPhotoUrl = (record: MemberProgress | undefined) => {
    if (!record) return null;
    return record[`photo_${activePhotoView}_url` as keyof MemberProgress] as string | null;
  };

  const isStory = exportSize === 'instagram-story';
  const isFacebook = exportSize === 'facebook';

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Minimal Header */}
      <div className={`text-center ${isStory ? 'py-8' : 'py-4'}`}>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">{gymName}</p>
      </div>

      {/* Photos */}
      <div className={`flex-1 flex ${isStory ? 'flex-col gap-4 px-6' : 'flex-row gap-4 px-4'}`}>
        <div className={`flex-1 relative ${isStory ? '' : ''}`}>
          <div className={`w-full h-full rounded-lg overflow-hidden ${isStory ? 'aspect-[4/5]' : ''}`}>
            {getPhotoUrl(firstRecord) ? (
              <img src={getPhotoUrl(firstRecord)!} alt="Before" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Camera className="w-12 h-12 text-slate-800" /></div>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white/60 text-xs">
            {firstRecord && format(new Date(firstRecord.record_date), 'MMM yyyy')}
          </div>
        </div>

        <div className={`flex-1 relative`}>
          <div className={`w-full h-full rounded-lg overflow-hidden ${isStory ? 'aspect-[4/5]' : ''}`}>
            {getPhotoUrl(lastRecord) ? (
              <img src={getPhotoUrl(lastRecord)!} alt="After" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Camera className="w-12 h-12 text-slate-800" /></div>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white/60 text-xs">
            {lastRecord && format(new Date(lastRecord.record_date), 'MMM yyyy')}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={`text-center ${isStory ? 'py-10' : isFacebook ? 'py-3' : 'py-6'}`}>
        <p className="text-white font-light text-lg tracking-wide">{memberName}</p>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div>
            <p className="text-white/40 text-[10px] uppercase">Duration</p>
            <p className="text-white font-light">{duration} days</p>
          </div>
          {weightChange && (
            <div>
              <p className="text-white/40 text-[10px] uppercase">Change</p>
              <p className={`font-light ${weightChange.diff < 0 ? 'text-white' : 'text-white'}`}>
                {weightChange.diff > 0 ? '+' : ''}{weightChange.diff}kg
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SocialMediaExport;
