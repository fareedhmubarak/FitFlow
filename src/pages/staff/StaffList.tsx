import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useStaff, useDeactivateStaff, useCreateStaff, useUpdateStaff } from '../../hooks/useStaff';
import toast from 'react-hot-toast';
import { getOptimizedImageUrl } from '@/lib/imageUpload';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import {
  Plus, Edit, Trash2, X, Save, Users,
  Phone, Mail, Calendar, Shield, UserX
} from 'lucide-react';

export default function StaffList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: staff = [], isLoading } = useStaff();
  const deactivateStaff = useDeactivateStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'trainer' as string,
    is_active: true,
    hire_date: new Date().toISOString().split('T')[0],
  });

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', role: 'trainer', is_active: true, hire_date: new Date().toISOString().split('T')[0] });
  };

  const openCreate = () => {
    resetForm();
    setEditingStaff(null);
    setShowForm(true);
  };

  const openEdit = (member: any) => {
    setEditingStaff(member);
    setFormData({
      full_name: member.full_name || `${member.first_name} ${member.last_name}`,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'trainer',
      is_active: member.is_active ?? true,
      hire_date: member.hire_date || new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      if (editingStaff) {
        await updateStaff.mutateAsync({ id: editingStaff.id, ...formData } as any);
        toast.success('Staff member updated');
      } else {
        await createStaff.mutateAsync(formData as any);
        toast.success('Staff member added. They will receive a password setup email.');
      }
      setShowForm(false);
      setEditingStaff(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await deactivateStaff.mutateAsync(deactivateId);
      toast.success('Staff member deactivated');
      setDeactivateId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate');
    }
  };

  const trainers = staff.filter(s => s.role === 'trainer').length;
  const receptionists = staff.filter(s => s.role === 'receptionist').length;
  const managers = staff.filter(s => s.role === 'manager').length;

  const roleColors: Record<string, { bg: string; text: string; dot: string }> = {
    owner:        { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    manager:      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    trainer:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    receptionist: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30 active:scale-95 transition-transform">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
              </svg>
            </button>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Staff</h1>
          </div>
          <UserProfileDropdown />
        </div>
      </header>

      {/* Stats Row */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-24" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-4 pt-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: staff.length, color: 'text-slate-700', gradient: 'from-slate-400 to-slate-500' },
            { label: 'Trainers', value: trainers, color: 'text-emerald-600', gradient: 'from-emerald-400 to-teal-500' },
            { label: 'Reception', value: receptionists, color: 'text-amber-600', gradient: 'from-amber-400 to-orange-500' },
            { label: 'Managers', value: managers, color: 'text-blue-600', gradient: 'from-blue-400 to-indigo-500' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.gradient} rounded-t-2xl`} />
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{stat.label}</span>
              <p className={`text-sm font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Card */}
      <div className="px-4 pt-3">
        <div className="rounded-[24px] shadow-lg overflow-hidden border border-white/40"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>

          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottomWidth: '1px', borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.5))' }}>
            <div>
              <h2 className="text-[15px] font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Staff Members</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Manage staff members and permissions</p>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={openCreate}
              className="h-8 px-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 text-white">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Add Staff</span>
            </motion.button>
          </div>

          {/* Staff List */}
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.5))' }} />)}
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary, #334155)' }}>No Staff Members</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Tap + Add Staff to add your first staff member</p>
              </div>
            ) : (
              <div className="space-y-2.5 py-1">
                {staff.map((member) => {
                  const rc = roleColors[member.role] || roleColors.receptionist;
                  return (
                    <div key={member.id}
                      className={`rounded-2xl p-3.5 border border-white/30 ${!member.is_active ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: 'var(--theme-glass-bg, rgba(248,250,252,0.6))' }}>
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {member.photo_url ? (
                          <img src={getOptimizedImageUrl(member.photo_url, 'sm')!} alt={member.full_name}
                            className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                            <span className="text-white font-bold text-sm">{member.full_name.charAt(0)}</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-extrabold leading-tight truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                              {member.full_name}
                            </h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${rc.bg} ${rc.text} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                            {member.email}
                          </p>
                          {member.phone && (
                            <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                              <Phone className="w-3 h-3" /> {member.phone}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => openEdit(member)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/40"
                            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
                            <Edit className="w-4 h-4 text-blue-500" />
                          </button>
                          {member.is_active && member.role !== 'owner' && (
                            <button onClick={() => setDeactivateId(member.id)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100">
                              <UserX className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Form Dialog Modal */}
      <AnimatePresence>
        {showForm && (
          <StaffFormModal
            editing={editingStaff}
            formData={formData}
            setFormData={setFormData}
            onClose={() => { setShowForm(false); setEditingStaff(null); resetForm(); }}
            onSubmit={handleSubmit}
            isSubmitting={createStaff.isPending || updateStaff.isPending}
          />
        )}
      </AnimatePresence>

      {/* Deactivate Confirm */}
      <AnimatePresence>
        {deactivateId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setDeactivateId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 z-50 w-[85%] max-w-sm shadow-2xl"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.97))' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Deactivate Staff?</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--theme-text-muted)' }}>They will lose access to the system. You can reactivate later.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeactivateId(null)} className="flex-1 py-3 rounded-xl font-semibold text-sm border border-slate-200" style={{ color: 'var(--theme-text-secondary)' }}>Cancel</button>
                <button onClick={handleDeactivate} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm">Deactivate</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Staff Form Modal — Centered Dialog ── */
function StaffFormModal({ editing, formData, setFormData, onClose, onSubmit, isSubmitting }: {
  editing: any;
  formData: { full_name: string; email: string; phone: string; role: string; is_active: boolean; hire_date: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const inputStyle = {
    backgroundColor: 'var(--theme-input-bg, rgba(248,250,252,0.8))',
    borderColor: 'var(--theme-glass-border, rgba(226,232,240,0.8))',
    color: 'var(--theme-text-primary, #1e293b)',
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-[380px] rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.97))' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-xl font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
            {editing ? 'Edit Staff' : 'Add Staff Member'}
          </h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 active:scale-90 transition-transform"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(241,245,249,0.8))' }}>
            <X className="w-4 h-4" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[65vh] px-5 pb-5 space-y-5">
          {/* Full Name */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Full Name *</label>
            <input type="text" value={formData.full_name}
              onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
              style={inputStyle} />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Email *</label>
            <input type="email" value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              disabled={!!editing}
              placeholder="e.g., john@gym.com"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border disabled:opacity-50"
              style={inputStyle} />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Phone</label>
            <input type="tel" value={formData.phone}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
              style={inputStyle} />
          </div>

          {/* Role & Hire Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Role *</label>
              <select value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border appearance-none"
                style={inputStyle}>
                <option value="trainer">Trainer</option>
                <option value="receptionist">Receptionist</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Hire Date</label>
              <input type="date" value={formData.hire_date}
                onChange={e => setFormData(p => ({ ...p, hire_date: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border"
                style={inputStyle} />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Active</span>
            <button
              onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
              className={`w-12 h-7 rounded-full transition-colors relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${formData.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Info text for new staff */}
          {!editing && (
            <div className="rounded-xl px-4 py-2.5 bg-blue-50 border border-blue-100">
              <p className="text-xs font-medium text-blue-700">
                A temporary password will be created and a password reset email will be sent.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <motion.button whileTap={{ scale: 0.98 }} onClick={onSubmit} disabled={isSubmitting}
            className="w-full py-4 text-white font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            style={{ background: '#000000', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" />{editing ? 'Update Staff' : 'Add Staff Member'}</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
