import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMember } from '../../hooks/useMembers';
import { useUpdateMember } from '../../hooks/useUpdateMember';
import MemberForm from '../../components/members/MemberForm';
import { GymLoader } from '@/components/ui/GymLoader';

// Types (inline to avoid import issues)
type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
type Gender = 'male' | 'female' | 'other';

interface MemberFormData {
  full_name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  height?: string;
  weight?: string;
  joining_date: string;
  membership_plan: MembershipPlan;
  plan_amount: number;
  photo_url?: string;
}

export default function EditMember() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();
  const { data: member, isLoading } = useMember(memberId!);
  const updateMember = useUpdateMember(memberId!);

  const handleSubmit = async (data: MemberFormData) => {
    try {
      await updateMember.mutateAsync(data);
      navigate(`/members/${memberId}`);
    } catch (error) {
      console.error('Error updating member:', error);
      alert(t('members.errorUpdating'));
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading member..." variant="detail" />;
  }

  if (!member) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-800 dark:text-red-200">{t('members.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('members.editMember')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {member.full_name} - {member.member_number}
          </p>
        </div>
        <button
          onClick={() => navigate(`/members/${memberId}`)}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>

      {/* Form */}
      <MemberForm
        initialData={member}
        onSubmit={handleSubmit}
        isLoading={updateMember.isPending}
        isEdit
      />
    </div>
  );
}
