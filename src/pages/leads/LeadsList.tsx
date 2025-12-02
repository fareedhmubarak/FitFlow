import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useLeads, useLeadsStats, useUpdateLead } from '../../hooks/useLeads';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';

export default function LeadsList() {
  const { t } = useTranslation();
  const { data: leads, isLoading } = useLeads();
  const { data: stats } = useLeadsStats();
  const updateLead = useUpdateLead();

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus as any });
      toast.success('Lead status updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lead status');
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
    return <GymLoader message="Loading leads..." />;
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
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
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
    </div>
  );
}
