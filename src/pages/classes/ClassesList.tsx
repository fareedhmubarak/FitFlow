import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useClasses, useDeleteClass } from '../../hooks/useClasses';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import { GymLoader } from '@/components/ui/GymLoader';

export default function ClassesList() {
  const { t } = useTranslation();
  const { data: classes, isLoading } = useClasses();
  const deleteClass = useDeleteClass();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; classId: string | null }>({
    isOpen: false,
    classId: null,
  });

  const handleDelete = async () => {
    if (!deleteModal.classId) return;

    try {
      await deleteClass.mutateAsync(deleteModal.classId);
      toast.success('Class deleted successfully');
      setDeleteModal({ isOpen: false, classId: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class');
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading classes..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('classes.title')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage classes and schedules
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/classes/schedule"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            📅 {t('classes.viewSchedule')}
          </Link>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            ➕ {t('classes.addClass')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Classes</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {classes?.length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Classes</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {classes?.filter((c) => c.is_active).length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {classes?.reduce((sum, c) => sum + c.capacity, 0) || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {classes && classes.length > 0
              ? Math.round(classes.reduce((sum, c) => sum + c.duration, 0) / classes.length)
              : 0}
            m
          </p>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes && classes.length > 0 ? (
          classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {classItem.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {classItem.duration} minutes
                  </p>
                </div>
                <span
                  className="px-3 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: classItem.color + '20',
                    color: classItem.color,
                  }}
                >
                  {classItem.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{classItem.instructor}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>Capacity: {classItem.capacity}</span>
                </div>

                {classItem.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {classItem.description}
                  </p>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() =>
                      setDeleteModal({ isOpen: true, classId: classItem.id })
                    }
                    className="flex-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Delete
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No classes
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new class.
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, classId: null })}
        onConfirm={handleDelete}
        title="Delete Class"
        message="Are you sure you want to delete this class? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteClass.isPending}
      />
    </div>
  );
}
