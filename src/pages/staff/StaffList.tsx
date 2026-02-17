import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStaff, useDeactivateStaff, useCreateStaff, useUpdateStaff } from '../../hooks/useStaff';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';

export default function StaffList() {
  const { t } = useTranslation();
  const { data: staff, isLoading } = useStaff();
  const deactivateStaff = useDeactivateStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    staffId: string | null;
  }>({
    isOpen: false,
    staffId: null,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'trainer' as string,
    is_active: true,
    hire_date: new Date().toISOString().split('T')[0],
  });

  const handleDeactivate = async () => {
    if (!deactivateModal.staffId) return;

    try {
      await deactivateStaff.mutateAsync(deactivateModal.staffId);
      toast.success('Staff member deactivated successfully');
      setDeactivateModal({ isOpen: false, staffId: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate staff member');
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', role: 'trainer', is_active: true, hire_date: new Date().toISOString().split('T')[0] });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await createStaff.mutateAsync(formData as any);
      toast.success('Staff member added successfully. They will receive a password setup email.');
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add staff member');
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await updateStaff.mutateAsync({ id: editingStaff.id, ...formData } as any);
      toast.success('Staff member updated successfully');
      setEditingStaff(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update staff member');
    }
  };

  const openEditModal = (member: any) => {
    setEditingStaff(member);
    setFormData({
      full_name: member.full_name || `${member.first_name} ${member.last_name}`,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'trainer',
      is_active: member.is_active ?? true,
      hire_date: member.hire_date || new Date().toISOString().split('T')[0],
    });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      trainer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      receptionist: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${
          colors[role] || colors.receptionist
        }`}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return <GymLoader message="Loading staff..." variant="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {t('staff.title')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Manage staff members and permissions
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          ➕ {t('staff.addStaff')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Total Staff</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {staff?.length || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Trainers</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {staff?.filter((s) => s.role === 'trainer').length || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Receptionists</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {staff?.filter((s) => s.role === 'receptionist').length || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Managers</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {staff?.filter((s) => s.role === 'manager').length || 0}
          </p>
        </div>
      </div>

      {/* Staff List */}
      <div className="rounded-xl shadow-md overflow-hidden" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
        <table className="w-full">
          <thead className="border-b" style={{ backgroundColor: 'var(--theme-glass-bg)', borderColor: 'var(--theme-glass-border)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--theme-glass-border)' }}>
            {staff && staff.length > 0 ? (
              staff.map((member) => (
                <tr key={member.id} className="hover:opacity-80 transition-opacity">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                          {member.full_name}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                      {member.phone || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        member.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(member)}
                      className="text-primary hover:text-primary/80 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setDeactivateModal({ isOpen: true, staffId: member.id })
                      }
                      className="text-red-600 hover:text-red-800"
                      disabled={!member.is_active}
                    >
                      {member.is_active ? 'Deactivate' : 'Deactivated'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div style={{ color: 'var(--theme-text-muted)' }}>
                    <svg
                      className="mx-auto h-12 w-12 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <p className="text-lg font-medium">No staff members found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, staffId: null })}
        onConfirm={handleDeactivate}
        title="Deactivate Staff Member"
        message="Are you sure you want to deactivate this staff member? They will lose access to the system."
        confirmText="Deactivate"
        variant="warning"
        isLoading={deactivateStaff.isPending}
      />

      {/* Add/Edit Staff Modal */}
      {(showAddModal || editingStaff) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <form onSubmit={editingStaff ? handleEditStaff : handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingStaff}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                >
                  <option value="trainer">Trainer</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hire Date</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingStaff(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaff.isPending || updateStaff.isPending}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {(createStaff.isPending || updateStaff.isPending) ? 'Saving...' : editingStaff ? 'Update' : 'Add Staff'}
                </button>
              </div>
            </form>
            {!editingStaff && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                A temporary password will be created and a password reset email will be sent.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
