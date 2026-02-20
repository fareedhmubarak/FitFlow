import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Users, UserPlus, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLeads, useLeadsStats, useUpdateLead, useCreateLead } from '../../hooks/useLeads';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';

const STAGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
  contacted: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Contacted' },
  qualified: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Qualified' },
  negotiation: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Negotiation' },
  converted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Converted' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
};

export default function LeadsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: leads, isLoading } = useLeads();
  const { data: stats } = useLeadsStats();
  const updateLead = useUpdateLead();
  const createLead = useCreateLead();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    source: 'walk_in' as const,
    status: 'new' as const,
    interested_in: '',
    notes: '',
  });

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus as any });
      toast.success('Lead status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.first_name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await createLead.mutateAsync(newLead as any);
      toast.success('Lead added successfully');
      setShowAddModal(false);
      setNewLead({ first_name: '', last_name: '', phone: '', email: '', source: 'walk_in', status: 'new', interested_in: '', notes: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add lead');
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading leads..." variant="list" />;
  }

  return (
    <div
      className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]"
      style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
              {t('leads.title')}
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              Track and convert potential members
            </p>
          </div>
          <UserProfileDropdown />
        </div>
      </header>

      {/* Stats */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-400 to-slate-500 rounded-t-2xl" />
            <div className="flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Total</span>
            </div>
            <p className="text-sm font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{stats?.total || 0}</p>
          </div>
          <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-2xl" />
            <div className="flex items-center gap-1 mb-1">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>New</span>
            </div>
            <p className="text-sm font-extrabold text-blue-600">{stats?.new || 0}</p>
          </div>
          <div className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px]">📈</span>
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Convert</span>
            </div>
            <p className="text-sm font-extrabold text-emerald-600">{stats?.conversionRate || 0}%</p>
          </div>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-24 space-y-2" style={{ overscrollBehavior: 'contain' }}>
        {leads && leads.length > 0 ? (
          leads.map((lead, idx) => {
            const stage = STAGE_STYLES[lead.status] || STAGE_STYLES.new;
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="rounded-2xl p-3 shadow-sm border border-white/40"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {lead.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                        {lead.first_name} {lead.last_name}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${stage.bg} ${stage.text}`}>
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{lead.phone}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                        <span className="text-[11px] truncate" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{lead.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] capitalize" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                          {lead.source.replace('_', ' ')}
                        </span>
                        {lead.follow_up_date && (
                          <>
                            <span className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>·</span>
                            <span className="text-[10px]" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                              Follow-up: {format(new Date(lead.follow_up_date), 'MMM dd')}
                            </span>
                          </>
                        )}
                      </div>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))',
                          borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))',
                          color: 'var(--theme-text-primary, #1e293b)',
                        }}
                        disabled={updateLead.isPending}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-2xl p-6 text-center shadow-md border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
            <p className="text-2xl mb-1">👥</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>No leads yet</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Tap + to add your first lead</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.95))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-extrabold mb-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Add New Lead</h2>
              <form onSubmit={handleAddLead} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>First Name *</label>
                    <input type="text" value={newLead.first_name} onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })} required
                      className="w-full px-3 py-2 rounded-xl text-sm border"
                      style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Last Name</label>
                    <input type="text" value={newLead.last_name} onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm border"
                      style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Phone *</label>
                  <input type="tel" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} required
                    className="w-full px-3 py-2 rounded-xl text-sm border"
                    style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Email</label>
                  <input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm border"
                    style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Source</label>
                  <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-sm border"
                    style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }}>
                    <option value="walk_in">Walk In</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="website">Website</option>
                    <option value="phone">Phone</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Interested In</label>
                  <input type="text" value={newLead.interested_in} onChange={(e) => setNewLead({ ...newLead, interested_in: e.target.value })}
                    placeholder="e.g., Monthly membership"
                    className="w-full px-3 py-2 rounded-xl text-sm border"
                    style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Notes</label>
                  <textarea value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} rows={2}
                    className="w-full px-3 py-2 rounded-xl text-sm border"
                    style={{ backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))', color: 'var(--theme-text-primary, #1e293b)' }} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/50"
                    style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={createLead.isPending}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md disabled:opacity-50">
                    {createLead.isPending ? 'Adding...' : 'Add Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
