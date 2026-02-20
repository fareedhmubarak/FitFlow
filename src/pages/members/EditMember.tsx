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
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800">{t('members.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
            {t('members.editMember')}
          </h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
            {member.full_name} - {member.member_number}
          </p>
        </div>
        <button
          onClick={() => navigate(`/members/${memberId}`)}
          className="px-4 py-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--theme-text-secondary, #64748b)' }}
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
