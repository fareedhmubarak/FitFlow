import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Member } from '../../types/database';
import { format } from 'date-fns';
import { getConsistentPersonPhoto } from '../../lib/memberPhoto';

interface MemberCardProps {
  member: Member;
}

export default function MemberCard({ member }: MemberCardProps) {
  const { t } = useTranslation();

  // Get photo URL - use stored photo or generate consistent one based on member ID and gender
  const photoUrl = member.photo_url || getConsistentPersonPhoto(member.id, member.gender);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'frozen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Link
      to={`/members/${member.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
    >
      <div className="flex items-start gap-4">
        {/* Avatar - Always show real person photo */}
        <div className="flex-shrink-0">
          <img
            src={photoUrl}
            alt={member.full_name}
            className="w-16 h-16 rounded-full object-cover"
            onError={(e) => {
              // Fallback to initial if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {member.full_name.charAt(0)}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {member.full_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {member.member_number}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                member.status
              )}`}
            >
              {t(`members.status.${member.status || 'inactive'}`)}
            </span>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>📧</span>
              <span className="truncate">{member.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>📞</span>
              <span>{member.phone}</span>
            </div>
            {member.created_at && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span>📅</span>
                <span>
                  {t('members.joinedOn')} {format(new Date(member.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {member.tags && member.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {member.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
