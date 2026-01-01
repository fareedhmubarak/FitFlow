import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '../../lib/supabase';
import { getRandomPersonPhoto } from '../../lib/memberPhoto';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Phone, Mail, Calendar, DollarSign, Ruler, Weight } from 'lucide-react';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import SuccessAnimation from '@/components/common/SuccessAnimation';
import { useMembershipPlans } from '../../hooks/useMembershipPlans';
import { addMonths, format } from 'date-fns';

// Types
type Gender = 'male' | 'female' | 'other';

interface MemberFormData {
  full_name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  height?: string;
  weight?: string;
  joining_date: string;
  plan_id?: string;
  membership_plan: string;
  plan_amount: number;
  photo_url?: string;
}

export default function AddMember() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  
  const [formData, setFormData] = useState<MemberFormData>({
    full_name: '',
    phone: '',
    email: '',
    gender: undefined,
    height: '',
    weight: '',
    joining_date: new Date().toISOString().split('T')[0],
    plan_id: undefined,
    membership_plan: '',
    plan_amount: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate next due date based on selected plan
  const nextDueDate = useMemo(() => {
    if (!formData.plan_id || !formData.joining_date) return null;
    const plan = plans?.find(p => p.id === formData.plan_id);
    if (!plan) return null;
    
    const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
    const bonusMonths = (plan as any).bonus_duration_months || 0;
    const totalMonths = baseMonths + bonusMonths;
    
    const joiningDate = new Date(formData.joining_date);
    return format(addMonths(joiningDate, totalMonths), 'dd MMM yyyy');
  }, [formData.plan_id, formData.joining_date, plans]);

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      const photoUrl = getRandomPersonPhoto(data.gender);

      // Calculate membership_end_date and next_payment_due_date if plan_id is set
      let membershipEndDate = null;
      let nextPaymentDueDate = null;
      
      if (data.plan_id) {
        const plan = plans?.find(p => p.id === data.plan_id);
        if (plan) {
          const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
          const bonusMonths = (plan as any).bonus_duration_months || 0;
          const totalMonths = baseMonths + bonusMonths;
          
          const joiningDate = new Date(data.joining_date);
          const dueDate = addMonths(joiningDate, totalMonths);
          nextPaymentDueDate = format(dueDate, 'yyyy-MM-dd');
          // Membership end date should be same as next payment due date (or 1 day before if needed)
          const endDate = new Date(dueDate);
          endDate.setDate(endDate.getDate() - 1); // 1 day before due date
          membershipEndDate = format(endDate, 'yyyy-MM-dd');
        }
      }

      const { data: member, error } = await supabase
        .from('gym_members')
        .insert({
          gym_id: gymId,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || null,
          gender: data.gender || null,
          height: data.height || null,
          weight: data.weight || null,
          joining_date: data.joining_date,
          plan_id: data.plan_id || null,
          membership_plan: data.membership_plan,
          plan_amount: data.plan_amount,
          membership_end_date: membershipEndDate,
          next_payment_due_date: nextPaymentDueDate,
          photo_url: photoUrl,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    // OPTIMISTIC UPDATE: Show success immediately
    onMutate: async (newMember) => {
      console.log('🚀 onMutate triggered - showing animation NOW');
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['members'] });
      
      // Show success animation IMMEDIATELY (don't wait for DB)
      setShowSuccess(true);
      console.log('✅ showSuccess set to TRUE');
      
      return { previousData: null };
    },
    onSuccess: () => {
      // Sync data in background after animation
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any, _, context) => {
      // Revert on error
      setShowSuccess(false);
      console.error('Error creating member:', error);
      toast.error(error.message || 'Failed to add member');
    },
  });

  const validateForm = () => {
    const newErrors: Partial<Record<keyof MemberFormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.joining_date) {
      newErrors.joining_date = 'Joining date is required';
    }

    if (!formData.plan_amount || formData.plan_amount <= 0) {
      newErrors.plan_amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      createMemberMutation.mutate(formData);
    } else {
      toast.error('Please fix the errors in the form');
    }
  };

  // Separate plans into regular and special (with bonus months)
  const { regularPlans, specialPlans } = useMemo(() => {
    if (!plans) return { regularPlans: [], specialPlans: [] };
    
    const allPlans = plans
      .filter(plan => plan.is_active)
      .map(plan => {
        const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
        const bonusMonths = (plan as any).bonus_duration_months || 0;
        const totalMonths = baseMonths + bonusMonths;
        
        let label = plan.name;
        if (bonusMonths > 0) {
          label = `${plan.name} (${baseMonths}+${bonusMonths})`;
        }
        
        return {
          id: plan.id,
          value: plan.id,
          label: label,
          amount: plan.price,
          totalMonths: totalMonths,
          baseMonths: baseMonths,
          bonusMonths: bonusMonths,
        };
      })
      .sort((a, b) => a.amount - b.amount);
    
    const regular = allPlans.filter(p => p.bonusMonths === 0);
    const special = allPlans.filter(p => p.bonusMonths > 0);
    
    return { regularPlans: regular, specialPlans: special };
  }, [plans]);

  return (
    <>
      <SuccessAnimation
        show={showSuccess}
        message="Member Added!"
        subMessage="Membership created successfully"
        variant="member"
        duration={1200}
        onComplete={() => navigate('/members')}
      />
      <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden">
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
      />

      {/* Header - Line 1: Logo | Title | Profile */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-5 pb-3 relative z-50"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <Link to="/">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
              </svg>
            </motion.div>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[#0f172a]">Add Member</h1>
          </div>
          <UserProfileDropdown />
        </div>
      </motion.header>

      {/* Form */}
      <div className="flex-1 px-5 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4 pb-4"
        >
          {/* Personal Info Card */}
          <div className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-white/50">
            <h2 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h2>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border ${
                    errors.full_name ? 'border-red-500' : 'border-white/40'
                  } bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm`}
                  placeholder="Enter full name"
                />
                {errors.full_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Phone Number <span className="text-red-500">*</span> <span className="text-slate-400 text-[10px]">(10 digits only)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, phone: digitsOnly });
                      // Real-time validation
                      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                        setErrors(prev => ({ ...prev, phone: `Phone must be 10 digits (${digitsOnly.length}/10)` }));
                      } else if (digitsOnly.length === 10) {
                        setErrors(prev => ({ ...prev, phone: undefined }));
                      }
                    }}
                    onBlur={() => {
                      if (formData.phone && formData.phone.length !== 10) {
                        setErrors(prev => ({ ...prev, phone: `Phone must be exactly 10 digits (${formData.phone.length}/10)` }));
                      }
                    }}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border ${
                      errors.phone ? 'border-red-500' : 'border-white/40'
                    } bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm`}
                    placeholder="10-digit phone (e.g. 9876543210)"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>
                )}
                {formData.phone && formData.phone.length === 10 && !errors.phone && (
                  <p className="text-emerald-500 text-xs mt-1">✓ Valid phone number</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Email (Optional) <span className="text-slate-400 text-[10px]">(name@domain.com)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => {
                      const email = e.target.value;
                      setFormData({ ...formData, email });
                      // Real-time email validation
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setErrors(prev => ({ ...prev, email: 'Please enter valid email (e.g. name@gmail.com)' }));
                      } else {
                        setErrors(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    onBlur={() => {
                      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                        setErrors(prev => ({ ...prev, email: 'Invalid email format. Use: name@domain.com' }));
                      }
                    }}
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border ${
                      errors.email ? 'border-red-500' : 'border-white/40'
                    } bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm`}
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>
                )}
                {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && !errors.email && (
                  <p className="text-emerald-500 text-xs mt-1">✓ Valid email</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'other'] as Gender[]).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender })}
                      className={`py-2 rounded-xl font-semibold text-xs transition-all ${
                        formData.gender === gender
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                          : 'bg-white/60 text-slate-600 hover:bg-white/80'
                      }`}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    Height
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.height || ''}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                      placeholder="178cm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                    Weight
                  </label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                      placeholder="75kg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Info Card */}
          <div className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-white/50">
            <h2 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Membership Details
            </h2>

            <div className="space-y-3">
              {/* Joining Date */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border ${
                    errors.joining_date ? 'border-red-500' : 'border-white/40'
                  } bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm`}
                />
                {errors.joining_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.joining_date}</p>
                )}
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Membership Plan <span className="text-red-500">*</span>
                </label>
                {plansLoading ? (
                  <div className="text-center py-4 text-sm text-slate-500">Loading plans...</div>
                ) : (regularPlans.length === 0 && specialPlans.length === 0) ? (
                  <div className="text-center py-4 text-sm text-red-500">No active plans available. Please create a plan in Settings.</div>
                ) : (
                  <div className="space-y-3">
                    {/* Regular Plans Row - Max 4 per row */}
                    {regularPlans.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {regularPlans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setFormData({ 
                              ...formData, 
                              plan_id: plan.id,
                              membership_plan: plan.label,
                              plan_amount: plan.amount 
                            })}
                            className={`p-2 rounded-xl font-semibold text-xs transition-all ${
                              formData.plan_id === plan.id
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md scale-105'
                                : 'bg-white/60 text-slate-600 hover:bg-white/80'
                            }`}
                          >
                            <div className="text-center font-bold text-[10px] leading-tight line-clamp-2 break-words">{plan.label}</div>
                            <div className="text-xs font-bold mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                            <div className="text-[9px] opacity-80 mt-0.5">{plan.totalMonths} month{plan.totalMonths !== 1 ? 's' : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Special Plans Row - Max 4 per row */}
                    {specialPlans.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {specialPlans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setFormData({ 
                              ...formData, 
                              plan_id: plan.id,
                              membership_plan: plan.label,
                              plan_amount: plan.amount 
                            })}
                            className={`p-2 rounded-xl font-semibold text-xs transition-all border-2 ${
                              formData.plan_id === plan.id
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md scale-105 border-emerald-600'
                                : 'bg-white/60 text-slate-600 hover:bg-white/80 border-emerald-200'
                            }`}
                          >
                            <div className="text-center font-bold text-[10px] leading-tight line-clamp-2 break-words">{plan.label}</div>
                            <div className="text-xs font-bold mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                            <div className="text-[9px] opacity-90 mt-0.5">{plan.totalMonths} months</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount - Auto-filled from plan selection (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                  Amount <span className="text-emerald-500 text-[10px]">(Auto from Plan)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={formData.plan_amount}
                    readOnly
                    disabled
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-slate-100/80 backdrop-blur-md text-[#0f172a] text-sm font-semibold cursor-not-allowed"
                    placeholder="Select a plan"
                  />
                </div>
                <p className="text-slate-400 text-[10px] mt-1">Amount is set automatically based on selected plan</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createMemberMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMemberMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Adding...
              </span>
            ) : (
              'Add Member'
            )}
          </button>
        </motion.form>
      </div>
      </div>
    </>
  );
}
