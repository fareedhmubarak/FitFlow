import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, RotateCcw, Save, UserPlus, RefreshCw, Clock, Lock, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useCurrency } from '@/hooks/useCurrency';
import {
  DEFAULT_BODIES,
  TEMPLATE_META,
  autoParts,
  renderTemplate,
  resetTemplate,
  saveTemplate,
  templatesQueryKey,
  useMessageTemplates,
  type TemplateType,
  type TemplateVars,
} from '@/lib/messageTemplates';

const ICONS: Record<TemplateType, typeof UserPlus> = {
  welcome: UserPlus,
  renewal: RefreshCw,
  expiry: CalendarClock,
  reminder: Clock,
};

function TemplateEditor({ type }: { type: TemplateType }) {
  const meta = TEMPLATE_META.find((m) => m.type === type)!;
  const Icon = ICONS[type];
  const queryClient = useQueryClient();
  const gymId = useAuthStore((s) => s.user?.gym_id ?? null);
  const { fc } = useCurrency();
  const { custom, isLoading, gymName } = useMessageTemplates();
  const isCustom = !!custom[type];
  const defaultText = DEFAULT_BODIES[type](gymName);

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) setText(custom[type] || defaultText);
  }, [isLoading, custom[type], defaultText]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => queryClient.invalidateQueries({ queryKey: templatesQueryKey(gymId) });

  const handleSave = async () => {
    if (!gymId) return;
    if (!text.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await saveTemplate(gymId, type, text.trim());
      await refresh();
      toast.success(`${meta.title} message saved`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save message');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!gymId) return;
    setSaving(true);
    try {
      await resetTemplate(gymId, type);
      setText(defaultText);
      await refresh();
      toast.success('Reset to default message');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset message');
    } finally {
      setSaving(false);
    }
  };

  // Sample member used only for the preview
  const sample: TemplateVars = {
    member_name: 'Sasi',
    gym_name: gymName,
    plan: '3 Months',
    amount: fc(2500),
    joining_date: '07 Nov 2026',
    payment_date: '07 Nov 2026',
    payment_method: 'UPI',
    valid_until: '06 Feb 2027',
    due_date: type === 'expiry' ? '09 Nov 2026' : '05 Nov 2026',
    days_overdue: type === 'expiry' ? 0 : 2,
    due_status: type === 'expiry' ? 'Due in 2 day(s)' : '2 day(s) overdue',
  };
  const usesNamePlaceholder = /\{\{?\s*member_name\s*\}?\}/i.test(text);
  const { greeting, details } = autoParts(type, sample);

  const dirty = text.trim() !== (custom[type] || defaultText).trim();

  return (
    <div
      className="backdrop-blur-xl rounded-[24px] p-4 shadow-lg mb-4"
      style={{
        backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))',
        borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
        borderWidth: '1px',
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{meta.title}</h3>
          <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{meta.description}</p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isCustom ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {isCustom ? 'Custom' : 'Default'}
        </span>
      </div>

      <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
        Your message
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        disabled={isLoading || saving}
        placeholder="Type your message here…"
        className="w-full rounded-2xl p-3 text-[13px] leading-relaxed border border-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
        style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))', color: 'var(--theme-text-primary, #0f172a)' }}
      />

      <div className="flex items-start gap-1.5 mt-2 text-[11px] rounded-xl p-2 bg-emerald-50 text-emerald-800 border border-emerald-100">
        <Lock className="w-3.5 h-3.5 mt-[1px] shrink-0" />
        <span>{meta.autoInfo} You only need to write your own text.</span>
      </div>

      <p className="text-[10px] mt-3 mb-1 font-semibold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
        Preview (sample member)
      </p>
      <div className="rounded-2xl p-3 text-[12px] whitespace-pre-wrap bg-[#dcf8c6] text-[#111] border border-green-200 space-y-3">
        {!usesNamePlaceholder && greeting && (
          <div className="text-[#4b5563] italic" title="Added automatically">{greeting}</div>
        )}
        <div>{renderTemplate(text, sample).trim() || <span className="text-[#9ca3af]">Your message will appear here</span>}</div>
        {details && (
          <div className="text-[#4b5563] italic" title="Added automatically">{details}</div>
        )}
      </div>
      <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
        Grey parts are filled in automatically for each member.
      </p>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving || (!isCustom && !dirty)}
          className="flex-1 py-2 rounded-full text-xs font-bold border border-slate-300 flex items-center justify-center gap-1.5 disabled:opacity-40"
          style={{ color: 'var(--theme-text-primary, #0f172a)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to default
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex-1 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
        </button>
      </div>
    </div>
  );
}

export default function MessageTemplatesPage() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]"
      style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}
    >
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
              WhatsApp Messages
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
              Write your own messages — member details are added automatically
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-24" style={{ overscrollBehavior: 'contain' }}>
        {TEMPLATE_META.map((m) => (
          <TemplateEditor key={m.type} type={m.type} />
        ))}
      </div>
    </div>
  );
}
