import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useLeads, useLeadsStats, useUpdateLead, useCreateLead } from '../../hooks/useLeads';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';

export default function LeadsList() {
  const { t } = useTranslation();
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
      toast.success('Lead status updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lead status');
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

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      qualified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${
          colors[stage] || colors.new
        }`}
      >
        {stage.charAt(0).toUpperCase() + stage.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return <GymLoader message="Loading leads..." variant="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {t('leads.title')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Track and convert potential members
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          ➕ {t('leads.addLead')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Total Leads</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            {stats?.total || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>New</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.new || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Contacted</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats?.contacted || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Qualified</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.qualified || 0}
          </p>
        </div>
        <div className="rounded-xl shadow-md p-6" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Conversion Rate</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats?.conversionRate || 0}%
          </p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl shadow-md overflow-hidden" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
        <table className="w-full">
          <thead className="border-b" style={{ backgroundColor: 'var(--theme-glass-bg)', borderColor: 'var(--theme-glass-border)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Stage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Follow-up
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Assigned To
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--theme-glass-border)' }}>
            {leads && leads.length > 0 ? (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:opacity-80 transition-opacity">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                        {lead.phone}
                      </p>
                      {lead.email && (
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                          {lead.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm capitalize" style={{ color: 'var(--theme-text-primary)' }}>
                      {lead.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStageBadge(lead.status)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                      {lead.follow_up_date
                        ? format(new Date(lead.follow_up_date), 'MMM dd, yyyy')
                        : 'Not set'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                      {lead.assigned_to || 'Unassigned'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="text-sm px-2 py-1 rounded border"
                      style={{ 
                        backgroundColor: 'var(--theme-input-bg)', 
                        borderColor: 'var(--theme-glass-border)',
                        color: 'var(--theme-text-primary)' 
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
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="text-lg font-medium">No leads found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLead.last_name}
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                >
                  <option value="walk_in">Walk In</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Interested In</label>
                <input
                  type="text"
                  value={newLead.interested_in}
                  onChange={(e) => setNewLead({ ...newLead, interested_in: e.target.value })}
                  placeholder="e.g., Monthly membership, Personal training"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLead.isPending}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {createLead.isPending ? 'Adding...' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
