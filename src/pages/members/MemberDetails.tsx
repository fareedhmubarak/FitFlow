import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMember, useMemberPayments, useMemberCheckIns } from '../../hooks/useMembers';
import { useDeleteMember } from '../../hooks/useUpdateMember';
import { getConsistentPersonPhoto } from '../../lib/memberPhoto';
import { progressService, MemberProgress } from '../../lib/progressService';
import { format } from 'date-fns';
import { GymLoader } from '@/components/ui/GymLoader';
import { Scale, Ruler, Activity, Camera, TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function MemberDetails() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'attendance' | 'progress'>('overview');

  const { data: member, isLoading } = useMember(memberId!);
  const { data: payments } = useMemberPayments(memberId!);
  const { data: checkIns } = useMemberCheckIns(memberId!);
  const { data: progressRecords = [] } = useQuery<MemberProgress[]>({
    queryKey: ['member-progress', memberId],
    queryFn: () => progressService.getMemberProgress(memberId!),
    enabled: !!memberId,
  });
  const deleteMember = useDeleteMember();

  const handleDelete = async () => {
    if (!confirm(t('members.confirmDelete'))) return;

    try {
      await deleteMember.mutateAsync({ memberId: memberId!, memberName: member?.full_name });
      navigate('/members');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert(t('members.errorDeleting'));
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

  const tabs = [
    { id: 'overview', label: t('members.tabs.overview'), icon: '📋' },
    { id: 'payments', label: t('members.tabs.payments'), icon: '💰' },
    { id: 'attendance', label: t('members.tabs.attendance'), icon: '📍' },
    { id: 'progress', label: 'Progress', icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar - Always show real person photo */}
            <img
              src={member.photo_url || getConsistentPersonPhoto(member.id, member.gender)}
              alt={member.full_name}
              className="w-20 h-20 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&size=80&background=6366f1&color=fff`;
              }}
            />

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {member.full_name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {member.member_number}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    member.status
                  )}`}
                >
                  {t(`members.status.${member.status || 'inactive'}`)}
                </span>
                {member.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              to={`/members/${memberId}/edit`}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✏️ {t('common.edit')}
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              🗑️ {t('common.delete')}
            </button>
            <button
              onClick={() => navigate('/members')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.back')}
            </button>
          </div>
        </div>

        {/* QR Code */}
        {member.qr_code && (
          <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <img src={member.qr_code} alt="QR Code" className="w-32 h-32" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('members.contactInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label={t('members.form.email')} value={member.email} icon="📧" />
                  <InfoItem label={t('members.form.phone')} value={member.phone} icon="📞" />
                  {member.date_of_birth && (
                    <InfoItem
                      label={t('members.form.dateOfBirth')}
                      value={format(new Date(member.date_of_birth), 'MMM dd, yyyy')}
                      icon="🎂"
                    />
                  )}
                  {member.gender && (
                    <InfoItem
                      label={t('members.form.gender')}
                      value={t(`members.form.${member.gender}`)}
                      icon="⚧️"
                    />
                  )}
                </div>
              </div>

              {/* Address */}
              {(member.address || member.city || member.state || member.pincode) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('members.form.addressInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {member.address && (
                      <InfoItem label={t('members.form.address')} value={member.address} icon="📍" />
                    )}
                    {member.city && (
                      <InfoItem label={t('members.form.city')} value={member.city} icon="🏙️" />
                    )}
                    {member.state && (
                      <InfoItem label={t('members.form.state')} value={member.state} icon="🗺️" />
                    )}
                    {member.pincode && (
                      <InfoItem label={t('members.form.pincode')} value={member.pincode} icon="📮" />
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(member.emergency_contact_name || member.emergency_contact_phone) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('members.form.emergencyContact')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {member.emergency_contact_name && (
                      <InfoItem
                        label={t('members.form.emergencyContactName')}
                        value={member.emergency_contact_name}
                        icon="👤"
                      />
                    )}
                    {member.emergency_contact_phone && (
                      <InfoItem
                        label={t('members.form.emergencyContactPhone')}
                        value={member.emergency_contact_phone}
                        icon="📞"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Medical Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('members.form.medicalInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {member.blood_group && (
                    <InfoItem
                      label={t('members.form.bloodGroup')}
                      value={member.blood_group}
                      icon="🩸"
                    />
                  )}
                  {member.medical_conditions && (
                    <InfoItem
                      label={t('members.form.medicalConditions')}
                      value={member.medical_conditions}
                      icon="⚕️"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {payments && payments.length > 0 ? (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.paid_at
                          ? format(new Date(payment.paid_at), 'MMM dd, yyyy')
                          : t('payments.pending')}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {t(`payments.status.${payment.status}`)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('payments.noPayments')}
                </p>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {checkIns && checkIns.length > 0 ? (
                checkIns.map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(checkIn.check_in_time), 'EEEE, MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(checkIn.check_in_time), 'hh:mm a')}
                          {checkIn.check_out_time &&
                            ` - ${format(new Date(checkIn.check_out_time), 'hh:mm a')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('checkIn.noCheckIns')}
                </p>
              )}
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6">
              {progressRecords.length > 0 ? (
                <>
                  {/* Latest Progress Summary */}
                  {(() => {
                    const latest = progressRecords[0];
                    const bmiCat = latest.bmi ? progressService.getBMICategory(latest.bmi) : null;
                    return (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Latest Progress</h4>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto">
                            {format(new Date(latest.record_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {latest.weight && (
                            <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1 mb-1">
                                <Scale className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500">Weight</span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-white">{latest.weight} kg</span>
                            </div>
                          )}
                          {latest.bmi && (
                            <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1 mb-1">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500">BMI</span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-white">{latest.bmi}</span>
                              {bmiCat && <span className={`text-xs ml-1 ${bmiCat.color}`}>({bmiCat.category})</span>}
                            </div>
                          )}
                          {latest.body_fat_percentage && (
                            <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1 mb-1">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500">Body Fat</span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-white">{latest.body_fat_percentage}%</span>
                            </div>
                          )}
                          {latest.height && (
                            <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/50">
                              <div className="flex items-center gap-1 mb-1">
                                <Ruler className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500">Height</span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-white">{latest.height} cm</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Progress Timeline */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Progress Timeline ({progressRecords.length} records)
                    </h3>
                    <div className="space-y-3">
                      {progressRecords.map((record) => {
                        const hasPhotos = record.photo_front_url || record.photo_back_url || record.photo_left_url || record.photo_right_url;
                        const bmiCat = record.bmi ? progressService.getBMICategory(record.bmi) : null;
                        const measurements = [
                          record.chest && `Chest: ${record.chest}cm`,
                          record.waist && `Waist: ${record.waist}cm`,
                          record.hips && `Hips: ${record.hips}cm`,
                          record.biceps && `Biceps: ${record.biceps}cm`,
                          record.thighs && `Thighs: ${record.thighs}cm`,
                          record.calves && `Calves: ${record.calves}cm`,
                        ].filter(Boolean);

                        return (
                          <div
                            key={record.id}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {format(new Date(record.record_date), 'MMM dd, yyyy')}
                                </span>
                                {hasPhotos && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px]">
                                    <Camera className="w-3 h-3" /> Photos
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm">
                              {record.weight && (
                                <span className="text-gray-600 dark:text-gray-300">
                                  <Scale className="w-3.5 h-3.5 inline mr-1" />{record.weight} kg
                                </span>
                              )}
                              {record.bmi && (
                                <span className="text-gray-600 dark:text-gray-300">
                                  BMI: {record.bmi}
                                  {bmiCat && <span className={`ml-1 text-xs ${bmiCat.color}`}>({bmiCat.category})</span>}
                                </span>
                              )}
                              {record.body_fat_percentage && (
                                <span className="text-gray-600 dark:text-gray-300">Fat: {record.body_fat_percentage}%</span>
                              )}
                            </div>

                            {measurements.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {measurements.map((m, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-xs text-gray-700 dark:text-gray-300">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            {record.notes && (
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                {record.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No progress records yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Track progress from the member popup</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
