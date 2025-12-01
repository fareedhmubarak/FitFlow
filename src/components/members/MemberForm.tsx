import { useTranslation } from 'react-i18next';
import type { MemberForm } from '../../types/database';
import { useMembershipPlans } from '../../hooks/useMembershipPlans';

interface MemberFormProps {
  initialData?: Partial<MemberForm>;
  onSubmit: (data: MemberForm) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function MemberForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit = false,
}: MemberFormProps) {
  const { t } = useTranslation();
  const { data: plans } = useMembershipPlans();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const tags = formData.get('tags')
      ? (formData.get('tags') as string).split(',').map((tag) => tag.trim())
      : [];

    const memberData: MemberForm = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      date_of_birth: formData.get('date_of_birth') as string,
      gender: formData.get('gender') as 'male' | 'female' | 'other',
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      emergency_contact_name: formData.get('emergency_contact_name') as string,
      emergency_contact_phone: formData.get('emergency_contact_phone') as string,
      blood_group: formData.get('blood_group') as string,
      medical_conditions: formData.get('medical_conditions') as string,
      preferred_language: formData.get('preferred_language') as string,
      tags,
      status: formData.get('status') as 'active' | 'inactive',
      // Required fields from MemberFormData
      joining_date: formData.get('joining_date') as string || new Date().toISOString().split('T')[0],
      membership_plan: formData.get('membership_plan') as 'monthly' | 'quarterly' | 'half_yearly' | 'annual' || 'monthly',
      plan_amount: Number(formData.get('plan_amount')) || 0,
    };

    // Add subscription data if creating new member
    if (!isEdit) {
      const planId = formData.get('plan_id') as string;
      const amount = formData.get('amount') as string;
      const startDate = formData.get('start_date') as string;

      if (planId && amount && startDate) {
        memberData.subscriptionData = {
          planId,
          amount: Number(amount),
          startDate,
        };
      }
    }

    onSubmit(memberData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('members.form.personalInfo')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.fullName')} *
            </label>
            <input
              type="text"
              name="full_name"
              defaultValue={initialData?.full_name}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.email')} *
            </label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.phone')} *
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={initialData?.phone}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.dateOfBirth')}
            </label>
            <input
              type="date"
              name="date_of_birth"
              defaultValue={initialData?.date_of_birth ? (typeof initialData.date_of_birth === 'string' ? initialData.date_of_birth : initialData.date_of_birth.toISOString().split('T')[0]) : undefined}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.gender')}
            </label>
            <select
              name="gender"
              defaultValue={initialData?.gender}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="male">{t('members.form.male')}</option>
              <option value="female">{t('members.form.female')}</option>
              <option value="other">{t('members.form.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.bloodGroup')}
            </label>
            <input
              type="text"
              name="blood_group"
              defaultValue={initialData?.blood_group || ''}
              placeholder="A+, B-, O+, etc."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.preferredLanguage')}
            </label>
            <select
              name="preferred_language"
              defaultValue={initialData?.preferred_language || 'en'}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('members.form.status')}
              </label>
              <select
                name="status"
                defaultValue={initialData?.status || 'active'}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">{t('members.status.active')}</option>
                <option value="inactive">{t('members.status.inactive')}</option>
                <option value="frozen">{t('members.status.frozen')}</option>
                <option value="cancelled">{t('members.status.cancelled')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('members.form.addressInfo')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.address')}
            </label>
            <textarea
              name="address"
              defaultValue={initialData?.address}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.city')}
            </label>
            <input
              type="text"
              name="city"
              defaultValue={initialData?.city}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.state')}
            </label>
            <input
              type="text"
              name="state"
              defaultValue={initialData?.state}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.pincode')}
            </label>
            <input
              type="text"
              name="pincode"
              defaultValue={initialData?.pincode}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('members.form.emergencyContact')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.emergencyContactName')}
            </label>
            <input
              type="text"
              name="emergency_contact_name"
              defaultValue={initialData?.emergency_contact_name}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.emergencyContactPhone')}
            </label>
            <input
              type="tel"
              name="emergency_contact_phone"
              defaultValue={initialData?.emergency_contact_phone}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Medical & Other Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('members.form.medicalInfo')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.medicalConditions')}
            </label>
            <textarea
              name="medical_conditions"
              defaultValue={initialData?.medical_conditions}
              rows={3}
              placeholder={t('members.form.medicalConditionsPlaceholder')}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('members.form.tags')}
            </label>
            <input
              type="text"
              name="tags"
              defaultValue={initialData?.tags?.join(', ')}
              placeholder={t('members.form.tagsPlaceholder')}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('members.form.tagsHelp')}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription (only for new members) */}
      {!isEdit && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('members.form.subscription')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('members.form.membershipPlan')}
              </label>
              <select
                name="plan_id"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('members.form.selectPlan')}</option>
                {plans?.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.amount} ({plan.duration_days} days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('members.form.amount')}
              </label>
              <input
                type="number"
                name="amount"
                placeholder="0"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('members.form.startDate')}
              </label>
              <input
                type="date"
                name="start_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('common.saving') : isEdit ? t('common.update') : t('common.create')}
        </button>
      </div>
    </form>
  );
}
