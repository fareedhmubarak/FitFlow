import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStaff, useDeactivateStaff } from '../../hooks/useStaff';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';

export default function StaffList() {
  const { t } = useTranslation();
  const { data: staff, isLoading } = useStaff();
  const deactivateStaff = useDeactivateStaff();
  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    staffId: string | null;
  }>({
    isOpen: false,
    staffId: null,
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
    return <GymLoader message="Loading staff..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('staff.title')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage staff members and permissions
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          ➕ {t('staff.addStaff')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {staff?.length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Trainers</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {staff?.filter((s) => s.role === 'trainer').length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Receptionists</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {staff?.filter((s) => s.role === 'receptionist').length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {staff?.filter((s) => s.role === 'manager').length || 0}
          </p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {staff && staff.length > 0 ? (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {member.first_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-white">
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
                    <button className="text-primary hover:text-primary/80 mr-3">Edit</button>
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
                  <div className="text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
