import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { GymLoader } from '@/components/ui/GymLoader';
import { Search, ChevronLeft, X, Phone, Mail, Edit, Calendar, User, Ruler, Weight, Plus, DollarSign, Save, Filter, MessageCircle, CreditCard, Power, Check, ChevronDown, Users, TrendingUp, Sparkles, RefreshCw, LayoutGrid, Table2, Clock, ArrowUpDown, Download, SlidersHorizontal, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, addMonths as dateAddMonths } from 'date-fns';
import toast from 'react-hot-toast';
import PhotoPicker from '../../components/members/PhotoPicker';
import { uploadImage } from '../../lib/imageUpload';
import { membershipService } from '../../lib/membershipService';
import { gymService, MembershipPlanWithPromo } from '@/lib/gymService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { exportService } from '@/lib/exportService';
import SuccessAnimation from '@/components/common/SuccessAnimation';
import RejoinMemberModal from '@/components/members/RejoinMemberModal';

// Animated counter component for dopamine hit - same as Dashboard
const AnimatedNumber = ({ value, prefix = '', suffix = '', className = '' }: { value: number; prefix?: string; suffix?: string; className?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{prefix}{displayValue.toLocaleString('en-IN')}{suffix}</span>;
};

// Types
type MemberStatus = 'active' | 'inactive';
type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
type Gender = 'male' | 'female' | 'other';

interface Member {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  gender?: Gender | null;
  height?: string | null;
  weight?: string | null;
  photo_url?: string | null;
  joining_date: string;
  membership_plan: MembershipPlan;
  plan_amount: number;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  // Payment tracking fields
  membership_start_date?: string;
  membership_end_date?: string;
  next_payment_due_date?: string;
  last_payment_date?: string;
  last_payment_amount?: number;
  // Deactivation tracking
  deactivated_at?: string;
  // Computed fields from membershipService
  next_due_date?: string;
  days_until_due?: number;
  is_overdue?: boolean;
}

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

const planFilters = [
  { key: 'all', label: 'All' },
  { key: 'monthly', label: '1M' },
  { key: 'quarterly', label: '3M' },
  { key: 'half_yearly', label: '6M' },
  { key: 'annual', label: '12M' },
];

const genderFilters = [
  { key: 'all', label: 'All' },
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

const joiningFilters = [
  { key: 'all', label: 'All' },
  { key: 'this_month', label: 'This Mo' },
  { key: 'last_30_days', label: '30 Days' },
  { key: 'last_90_days', label: '90 Days' },
];

const sortOptions = [
  { key: 'name_asc', label: 'A-Z' },
  { key: 'name_desc', label: 'Z-A' },
  { key: 'joining_newest', label: 'Newest' },
  { key: 'joining_oldest', label: 'Oldest' },
];

interface FilterState {
  status: string;
  plan: string;
  gender: string;
  joining: string;
  sortBy: string;
}

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

export default function MembersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemberForPopup, setSelectedMemberForPopup] = useState<UnifiedMemberData | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [plans, setPlans] = useState<MembershipPlanWithPromo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMemberSuccess, setShowMemberSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [wizardStep, setWizardStep] = useState(1);
  
  // Advanced filters state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    plan: 'all',
    gender: 'all',
    joining: 'all',
    sortBy: 'name_asc',
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({
    status: 'all',
    plan: 'all',
    gender: 'all',
    joining: 'all',
    sortBy: 'name_asc',
  });

  // Phone check state for rejoin flow
  const [phoneCheckStatus, setPhoneCheckStatus] = useState<'idle' | 'checking' | 'not_found' | 'found_active' | 'found_inactive'>('idle');
  const [foundMember, setFoundMember] = useState<Awaited<ReturnType<typeof membershipService.checkMemberByPhone>>['member']>(null);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [isRejoinLoading, setIsRejoinLoading] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch membership plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansData = await gymService.getMembershipPlans();
        setPlans(plansData.filter(p => p.is_active));
      } catch (err) {
        console.error('Error fetching plans:', err);
      }
    };
    fetchPlans();
  }, []);
  
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
    photo_url: undefined,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: members, isLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['members-with-due'],
    queryFn: async () => {
      const members = await membershipService.getMembersWithDueInfo();
      return members;
    },
  });

  // Debounced phone check for rejoin flow
  useEffect(() => {
    // Only check in add mode (not edit mode)
    if (isEditMode) {
      setPhoneCheckStatus('idle');
      setFoundMember(null);
      return;
    }

    const phone = formData.phone.replace(/\D/g, '');
    
    // Reset if phone is less than 10 digits
    if (phone.length < 10) {
      setPhoneCheckStatus('idle');
      setFoundMember(null);
      return;
    }

    // Skip if phone is exactly same as already checked
    if (phone.length === 10) {
      setPhoneCheckStatus('checking');
      
      const timer = setTimeout(async () => {
        try {
          const result = await membershipService.checkMemberByPhone(phone);
          
          if (result.exists && result.member) {
            setFoundMember(result.member);
            if (result.member.status === 'active') {
              setPhoneCheckStatus('found_active');
            } else {
              setPhoneCheckStatus('found_inactive');
            }
          } else {
            setPhoneCheckStatus('not_found');
            setFoundMember(null);
          }
        } catch (error) {
          console.error('Error checking phone:', error);
          setPhoneCheckStatus('not_found');
          setFoundMember(null);
        }
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timer);
    }
  }, [formData.phone, isEditMode]);

  // Handle rejoin member
  const handleRejoinMember = async (planId: string, amount: number, paymentMethod: string, startDate: string) => {
    if (!foundMember) return;
    
    setIsRejoinLoading(true);
    try {
      await membershipService.rejoinMember(foundMember.id, planId, amount, paymentMethod, startDate);
      toast.success(`Welcome back, ${foundMember.full_name}! Member reactivated successfully.`, {
        duration: 4000,
        icon: '🎉',
      });
      setShowRejoinModal(false);
      setIsAddModalOpen(false);
      setFoundMember(null);
      setPhoneCheckStatus('idle');
      setFormData({
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
        photo_url: undefined,
      });
      refetchMembers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate member');
    } finally {
      setIsRejoinLoading(false);
    }
  };

  // Calculate active filter count for badge
  const activeFilterCount = [
    filters.status !== 'all',
    filters.plan !== 'all',
    filters.gender !== 'all',
    filters.joining !== 'all',
    filters.sortBy !== 'name_asc',
  ].filter(Boolean).length;

  // Helper function to check joining date filter
  const matchesJoiningFilter = (joiningDate: string | null, filterValue: string): boolean => {
    if (filterValue === 'all') return true;
    if (!joiningDate) return false;
    
    const joinDate = new Date(joiningDate);
    const now = new Date();
    const diffTime = now.getTime() - joinDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (filterValue) {
      case 'this_week':
        return diffDays <= 7;
      case 'this_month':
        return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
      case 'last_30_days':
        return diffDays <= 30;
      case 'last_90_days':
        return diffDays <= 90;
      case 'this_year':
        return joinDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  // Filter members with advanced filters
  const filteredMembers = members?.filter((member) => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm);
    
    // Status filter
    const matchesStatus = filters.status === 'all' || member.status === filters.status;
    
    // Plan filter - match by plan duration
    const matchesPlan = (() => {
      if (filters.plan === 'all') return true;
      const planName = (member.membership_plan || '').toLowerCase();
      switch (filters.plan) {
        case 'monthly':
          return planName === 'monthly' || (planName.includes('month') && !planName.includes('3') && !planName.includes('6') && !planName.includes('quarter') && !planName.includes('half') && !planName.includes('year'));
        case 'quarterly':
          return planName === 'quarterly' || planName.includes('quarter') || planName.includes('3 month') || planName.includes('3m');
        case 'half_yearly':
          return planName === 'half_yearly' || planName.includes('half') || planName.includes('6 month') || planName.includes('6m');
        case 'annual':
          // Exclude 'half_yearly' which contains 'year'
          return planName === 'annual' || planName === 'yearly' || (planName.includes('year') && !planName.includes('half')) || planName.includes('12 month') || planName.includes('12m');
        default:
          return true;
      }
    })();
    
    // Gender filter
    const matchesGender = filters.gender === 'all' || member.gender === filters.gender;
    
    // Joining date filter
    const matchesJoining = matchesJoiningFilter(member.joining_date, filters.joining);
    
    return matchesSearch && matchesStatus && matchesPlan && matchesGender && matchesJoining;
  })?.sort((a, b) => {
    // Apply selected sort option
    switch (filters.sortBy) {
      case 'name_asc':
        return a.full_name.localeCompare(b.full_name);
      case 'name_desc':
        return b.full_name.localeCompare(a.full_name);
      case 'joining_newest':
        return new Date(b.joining_date || 0).getTime() - new Date(a.joining_date || 0).getTime();
      case 'joining_oldest':
        return new Date(a.joining_date || 0).getTime() - new Date(b.joining_date || 0).getTime();
      case 'due_date':
        return new Date(a.next_due_date || a.membership_end_date || '9999-12-31').getTime() - 
               new Date(b.next_due_date || b.membership_end_date || '9999-12-31').getTime();
      default:
        return a.full_name.localeCompare(b.full_name);
    }
  });

  // Popup handlers
  const handleWhatsApp = () => {
    // Kept for backward compatibility - not used with unified popup
  };

  const handlePayment = async () => {
    // Kept for backward compatibility - not used with unified popup
  };

  const handleDeactivate = async () => {
    // Kept for backward compatibility - not used with unified popup
  };

  const handleEditSave = async () => {
    // Kept for backward compatibility - not used with unified popup
  };

  const handleMemberClick = (member: Member) => {
    // Convert Member to UnifiedMemberData with next_due_date for payment restriction
    const memberData: UnifiedMemberData = {
      id: member.id,
      name: member.full_name,
      phone: member.phone,
      photo_url: member.photo_url,
      status: member.status,
      plan_name: member.membership_plan,
      plan_amount: member.plan_amount,
      joining_date: member.joining_date,
      membership_end_date: member.membership_end_date,
      next_due_date: member.next_due_date || member.next_payment_due_date,
      deactivated_at: member.deactivated_at,
    };
    setSelectedMemberForPopup(memberData);
  };

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      // Check for duplicate phone in this gym
      const { data: existingMember } = await supabase
        .from('gym_members')
        .select('id, full_name')
        .eq('gym_id', gymId)
        .eq('phone', data.phone)
        .maybeSingle();

      if (existingMember) {
        throw new Error(`Phone number already exists for member: ${existingMember.full_name}`);
      }

      // Photo is mandatory - no fallback to random photos
      let photoUrl = data.photo_url || null;

      // Upload photo if provided
      if (photoFile) {
        try {
          // Try 'images' bucket first, fall back to 'member-photos'
          try {
            const uploadResult = await uploadImage(photoFile, 'images', `members/${gymId}`);
            photoUrl = uploadResult.url;
          } catch (bucketError: any) {
            if (bucketError.message?.includes('Bucket not found') || bucketError.message?.includes('bucket')) {
              const uploadResult = await uploadImage(photoFile, 'member-photos', `members/${gymId}`);
              photoUrl = uploadResult.url;
            } else {
              throw bucketError;
            }
          }
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error('Failed to upload photo, using default');
        }
      }

      // Calculate membership dates if plan_id is set
      let membershipEndDate = null;
      let nextPaymentDueDate = null;
      
      if (data.plan_id) {
        const plan = plans.find(p => p.id === data.plan_id);
        if (plan) {
          const baseMonths = plan.base_duration_months || plan.duration_months || 1;
          const bonusMonths = plan.bonus_duration_months || 0;
          const totalMonths = baseMonths + bonusMonths;
          
          const joiningDate = new Date(data.joining_date);
          const dueDate = dateAddMonths(joiningDate, totalMonths);
          nextPaymentDueDate = format(dueDate, 'yyyy-MM-dd');
          membershipEndDate = format(dateAddMonths(dueDate, -1), 'yyyy-MM-dd');
        }
      }

      // Create member using membership service
      const member = await membershipService.createMember({
        ...data,
        photo_url: photoUrl,
        membership_end_date: membershipEndDate,
        next_payment_due_date: nextPaymentDueDate,
      } as Parameters<typeof membershipService.createMember>[0]);

      return member;
    },
    onSuccess: () => {
      // Close modal and show animation ONLY after DB confirms success
      setIsAddModalOpen(false);
      setShowMemberSuccess(true);
      
      // Reset form
      setFormData({
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
        photo_url: undefined,
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      
      // Refresh data in background
      refetchMembers();
    },
    onError: (error: any) => {
      console.error('Error creating member:', error);
      
      // Check for duplicate phone error
      if (error.message?.includes('duplicate') || error.message?.includes('unique') || error.message?.includes('phone')) {
        toast.error('This phone number is already registered! Please use a different number.', {
          duration: 5000,
          icon: '📱',
        });
      } else {
        toast.error(error.message || 'Failed to add member');
      }
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: Partial<MemberFormData> }) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      // Check for duplicate phone in this gym (exclude current member)
      if (data.phone) {
        const { data: existingMember } = await supabase
          .from('gym_members')
          .select('id, full_name')
          .eq('gym_id', gymId)
          .eq('phone', data.phone)
          .neq('id', memberId) // Exclude current member
          .maybeSingle();

        if (existingMember) {
          throw new Error(`Phone number already exists for member: ${existingMember.full_name}`);
        }
      }

      let photoUrl = data.photo_url;

      // Upload new photo if provided
      if (photoFile) {
        try {
          const uploadResult = await uploadImage(photoFile, 'images', `members/${gymId}`);
          photoUrl = uploadResult.url;
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error('Failed to upload photo');
          throw error;
        }
      } else if (photoFile === null && photoPreview === null && data.photo_url === null) {
        // Photo was explicitly removed
        photoUrl = null;
      }

      const updateData: any = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        membership_plan: data.membership_plan,
        plan_amount: data.plan_amount,
        updated_at: new Date().toISOString(),
      };

      // Only update photo_url if it was changed
      if (photoFile || (photoFile === null && photoPreview === null && data.photo_url === null)) {
        updateData.photo_url = photoUrl;
      }

      // Fast update - don't wait for full response with select
      const { error } = await supabase
        .from('gym_members')
        .update(updateData)
        .eq('id', memberId)
        .eq('gym_id', gymId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      // Close modal FIRST for instant feedback
      setIsAddModalOpen(false);
      setIsEditMode(false);
      setSelectedMember(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      
      // Show success toast
      toast.success('Member updated successfully! 🎉');
      
      // Refresh data in background
      refetchMembers();
    },
    onError: (error: any) => {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update member');
    },
  });

  // Separate plans into regular and special (with bonus months)
  const { regularPlans, specialPlans } = React.useMemo(() => {
    if (!plans || plans.length === 0) return { regularPlans: [], specialPlans: [] };
    
    const allPlans = plans.map(plan => {
      const baseMonths = plan.base_duration_months || plan.duration_months || 1;
      const bonusMonths = plan.bonus_duration_months || 0;
      const totalMonths = baseMonths + bonusMonths;
      
      let label = plan.name;
      if (bonusMonths > 0) {
        label = `${plan.name} (${baseMonths}+${bonusMonths})`;
      }
      
      return {
        id: plan.id,
        value: plan.id,
        label: label,
        amount: plan.final_price || plan.price,
        totalMonths: totalMonths,
        bonusMonths: bonusMonths,
      };
    }).sort((a, b) => a.amount - b.amount);
    
    const regular = allPlans.filter(p => p.bonusMonths === 0);
    const special = allPlans.filter(p => p.bonusMonths > 0);
    
    return { regularPlans: regular, specialPlans: special };
  }, [plans]);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setIsEditMode(false);
    setWizardStep(1);
    setFormData({
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
      photo_url: undefined,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleOpenEditModal = (member: Member) => {
    setSelectedMember(member);
    setIsEditMode(true);
    setIsAddModalOpen(true);
    setWizardStep(1); // Start at step 1 for edit mode too
    setFormData({
      full_name: member.full_name,
      phone: member.phone,
      email: member.email || '',
      gender: member.gender || undefined,
      height: member.height || '',
      weight: member.weight || '',
      joining_date: member.joining_date,
      membership_plan: member.membership_plan,
      plan_amount: member.plan_amount,
      photo_url: member.photo_url || undefined,
    });
    setPhotoFile(null);
    setPhotoPreview(member.photo_url || null);
  };

  const handlePhotoSelected = (file: File | null, previewUrl: string | null) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    if (previewUrl) {
      setFormData(prev => ({ ...prev, photo_url: previewUrl }));
    } else {
      // If photo is removed, set to null so it can be cleared
      setFormData(prev => ({ ...prev, photo_url: undefined }));
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in required fields');
      return;
    }
    // Phone validation - must be exactly 10 digits
    if (formData.phone.length !== 10) {
      toast.error(`Phone must be exactly 10 digits (currently ${formData.phone.length}/10)`);
      return;
    }
    // Email validation - if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }
    // Gender, Height, Weight validation - mandatory for gym members
    if (!formData.gender) {
      toast.error('Please select gender');
      setWizardStep(2);
      return;
    }
    if (!formData.height?.trim()) {
      toast.error('Please enter height');
      setWizardStep(2);
      return;
    }
    if (!formData.weight?.trim()) {
      toast.error('Please enter weight');
      setWizardStep(2);
      return;
    }
    // Photo is mandatory - must be captured or uploaded
    if (!photoPreview && !photoFile) {
      toast.error('Please capture or upload a photo');
      setWizardStep(1); // Go back to step 1 where photo is
      return;
    }
    createMemberMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !formData.full_name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in required fields');
      return;
    }
    // Phone validation - must be exactly 10 digits
    if (formData.phone.length !== 10) {
      toast.error(`Phone must be exactly 10 digits (currently ${formData.phone.length}/10)`);
      return;
    }
    // Email validation - if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }
    updateMemberMutation.mutate({ memberId: selectedMember.id, data: formData });
  };

  if (isLoading) {
    return (
      <div className='fixed inset-0 w-screen h-screen flex items-center justify-center font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='flex flex-col items-center'
        >
          <motion.div 
            className='h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-400/40 flex items-center justify-center mb-4'
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Users className="w-8 h-8 text-white" />
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className='h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full'
          />
          <p className='text-sm font-semibold mt-3' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Loading members...</p>
        </motion.div>
      </div>
    );
  }

  // Calculate stats
  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter(m => m.status === 'active').length || 0;
  const inactiveMembers = members?.filter(m => m.status === 'inactive').length || 0;
  const activePercentage = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

  // New this month - members who joined in current month
  const now = new Date();
  const newThisMonth = members?.filter(m => {
    if (!m.joining_date) return false;
    const joinDate = new Date(m.joining_date);
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
  }).length || 0;

  // Plan breakdown - using exact plan type matching
  const planCounts = {
    monthly: members?.filter(m => {
      const plan = (m.membership_plan || '').toLowerCase();
      return plan === 'monthly' || (plan.includes('month') && !plan.includes('3') && !plan.includes('6') && !plan.includes('quarter') && !plan.includes('half') && !plan.includes('year'));
    }).length || 0,
    quarterly: members?.filter(m => {
      const plan = (m.membership_plan || '').toLowerCase();
      return plan === 'quarterly' || plan.includes('quarter') || plan.includes('3 month') || plan.includes('3m');
    }).length || 0,
    halfYearly: members?.filter(m => {
      const plan = (m.membership_plan || '').toLowerCase();
      return plan === 'half_yearly' || plan.includes('half') || plan.includes('6 month') || plan.includes('6m');
    }).length || 0,
    annual: members?.filter(m => {
      const plan = (m.membership_plan || '').toLowerCase();
      // Exclude 'half_yearly' which contains 'year'
      return plan === 'annual' || plan === 'yearly' || (plan.includes('year') && !plan.includes('half')) || plan.includes('12 month') || plan.includes('12m');
    }).length || 0,
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchMembers();
    setRefreshing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast.error('No members to export');
      return;
    }

    try {
      const exportData = filteredMembers.map(member => ({
        id: member.id,
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
        gender: member.gender,
        height: member.height,
        weight: member.weight,
        joining_date: member.joining_date,
        membership_plan: member.membership_plan,
        plan_amount: member.plan_amount,
        status: member.status,
        membership_end_date: member.membership_end_date,
        next_due_date: member.next_due_date,
      }));

      exportService.exportFilteredMembersToCSV(exportData, activeFilter);
      toast.success(`Exported ${filteredMembers.length} members to CSV! 📊`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export members');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Member Added Success Animation - Fast 1.2s */}
      <SuccessAnimation
        show={showMemberSuccess}
        message="Member Added!"
        subMessage="Successfully registered"
        variant="member"
        duration={1200}
        onComplete={() => setShowMemberSuccess(false)}
      />
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Success celebration overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-50 flex items-center justify-center pointer-events-none'
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className='bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl flex flex-col items-center'
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <Sparkles className='w-12 h-12 text-emerald-500 mb-2' />
              </motion.div>
              <p className='text-lg font-bold text-gray-800'>Refreshed!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-2 relative z-50"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {/* Line 1: Logo | Title | Profile */}
        <div className="flex items-center justify-between mb-2">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Members</h1>
          <UserProfileDropdown />
        </div>

        {/* Line 2: Refresh + View Toggle on left | Export + Add on right */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className='w-8 h-8 rounded-full backdrop-blur-md shadow-sm flex items-center justify-center'
              style={{ 
                backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
                borderWidth: '1px'
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--theme-text-primary, #334155)' }} />
            </motion.button>

            {/* View Toggle Button */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
              className='w-8 h-8 rounded-full backdrop-blur-md shadow-sm flex items-center justify-center relative overflow-hidden'
              style={{ 
                backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
                borderWidth: '1px'
              }}
            >
              <AnimatePresence mode="wait">
                {viewMode === 'card' ? (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Table2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #334155)' }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #334155)' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            {/* Export CSV Button */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV}
              className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
            </motion.button>

            {/* Add Member Button */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenAddModal}
              className="h-8 px-3 rounded-full bg-[#10B981] shadow-md shadow-[#10B981]/30 flex items-center justify-center gap-1.5 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Add</span>
            </motion.button>
          </div>
        </div>

        {/* Line 3: Search + Filter */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-xl backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
              style={{ 
                backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.7))', 
                borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))',
                borderWidth: '1px',
                color: 'var(--theme-text-primary, #0f172a)'
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
          </div>
          
          {/* Advanced Filters Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setTempFilters(filters);
              setShowFilterDialog(true);
            }}
            className={`h-[38px] px-3 rounded-xl border shadow-sm flex items-center gap-1.5 text-sm font-medium transition-all relative ${
              activeFilterCount > 0 
                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]' 
                : 'bg-white/70 text-slate-600 border-white/50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-xs">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#8B5CF6] rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.header>

      {/* Stats Cards - PERFORMANCE OPTIMIZED: Removed backdrop-blur and repeating animations */}
      <div className="flex-shrink-0 px-4 pb-2 relative z-0">
        <div className="grid grid-cols-4 gap-2">
          {/* Active Members */}
          <div 
            className='rounded-2xl p-2.5 shadow-md relative overflow-hidden transition-transform active:scale-[0.98] blur-optimized'
            style={{ 
              backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-emerald-200/30'>
              <div 
                className='h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500'
                style={{ width: `${activePercentage}%` }}
              />
            </div>
            <div className='flex items-center gap-1 mb-0.5'>
              <div className='w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center'>
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className='text-[9px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Active</span>
            </div>
            <p className='text-sm font-extrabold text-emerald-600'>
              <AnimatedNumber value={activeMembers} />
            </p>
          </div>

          {/* Inactive Members */}
          <div 
            className='rounded-2xl p-2.5 shadow-md relative overflow-hidden transition-transform active:scale-[0.98] blur-optimized'
            style={{ 
              backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-slate-200/30'>
              <div 
                className='h-full bg-gradient-to-r from-slate-400 to-slate-500 transition-all duration-500'
                style={{ width: `${totalMembers > 0 ? (inactiveMembers / totalMembers) * 100 : 0}%` }}
              />
            </div>
            <div className='flex items-center gap-1 mb-0.5'>
              <div className='w-4 h-4 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center'>
                <div className='w-1.5 h-1.5 rounded-full bg-white'></div>
              </div>
              <span className='text-[9px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Inactive</span>
            </div>
            <p className='text-sm font-extrabold' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              <AnimatedNumber value={inactiveMembers} />
            </p>
          </div>

          {/* New This Month */}
          <div 
            className='rounded-2xl p-2.5 shadow-md relative overflow-hidden transition-transform active:scale-[0.98] blur-optimized'
            style={{ 
              backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-violet-200/30'>
              <div 
                className='h-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-500'
                style={{ width: `${totalMembers > 0 ? (newThisMonth / totalMembers) * 100 : 0}%` }}
              />
            </div>
            <div className='flex items-center gap-1 mb-0.5'>
              <div className='w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center'>
                <Sparkles className="w-2 h-2 text-white" />
              </div>
              <div className='flex flex-col leading-none'>
                <span className='text-[8px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>This Month</span>
              </div>
            </div>
            <p className='text-sm font-extrabold text-violet-600'>
              <AnimatedNumber value={newThisMonth} />
            </p>
          </div>

          {/* Plans Breakdown */}
          <div 
            className='rounded-2xl p-2.5 shadow-md relative overflow-hidden transition-transform active:scale-[0.98] blur-optimized'
            style={{ 
              backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            <div className='flex items-center gap-1 mb-0.5'>
              <div className='w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center'>
                <CreditCard className="w-2 h-2 text-white" />
              </div>
              <span className='text-[9px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Plans</span>
            </div>
            <div className='flex flex-wrap gap-x-1.5 gap-y-0'>
              {planCounts.monthly > 0 && (
                <span className='text-[10px] font-bold text-cyan-600'>1M:{planCounts.monthly}</span>
              )}
              {planCounts.quarterly > 0 && (
                <span className='text-[10px] font-bold text-blue-600'>3M:{planCounts.quarterly}</span>
              )}
              {planCounts.halfYearly > 0 && (
                <span className='text-[10px] font-bold text-indigo-600'>6M:{planCounts.halfYearly}</span>
              )}
              {planCounts.annual > 0 && (
                <span className='text-[10px] font-bold text-purple-600'>12M:{planCounts.annual}</span>
              )}
              {planCounts.monthly === 0 && planCounts.quarterly === 0 && planCounts.halfYearly === 0 && planCounts.annual === 0 && (
                <span className='text-[10px] font-bold text-slate-400'>-</span>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Members Grid/List */}
      <div className="flex-1 px-4 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
        {filteredMembers && filteredMembers.length > 0 ? (
          <AnimatePresence mode="wait">
            {viewMode === 'card' ? (
              /* Card View - 3 columns for compact grid */
              <motion.div 
                key="card-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4"
              >
                {/* PERFORMANCE: Removed AnimatePresence + layout for card items to prevent re-layout jank */}
                {filteredMembers.map((member, index) => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="transform transition-transform duration-150 active:scale-[0.98]"
                  >
                    <MemberCard member={member} index={index} />
                  </div>
                ))}
              </motion.div>
            ) : (
              /* Table View - compact with proper columns */
              <motion.div 
                key="table-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="pb-2"
              >
                {/* Table Container - PERFORMANCE: Removed backdrop-blur */}
                <div 
                  className="rounded-xl shadow-sm overflow-hidden blur-optimized"
                  style={{ 
                    backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.9))', 
                    borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.6))',
                    borderWidth: '1px'
                  }}
                >
                  {/* Table Header */}
                  <div 
                    className="grid grid-cols-[32px_1fr_0.8fr_52px_52px_52px_20px] gap-1 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-wide"
                    style={{ 
                      backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.9))', 
                      borderBottomColor: 'var(--theme-glass-border, rgba(255,255,255,0.6))',
                      borderBottomWidth: '1px',
                      color: 'var(--theme-text-muted, #64748b)'
                    }}
                  >
                    <div></div>
                    <div>Name</div>
                    <div>Plan</div>
                    <div className="text-center">Joining</div>
                    <div className="text-center">Last Paid</div>
                    <div className="text-center">Next Due</div>
                    <div></div>
                  </div>
                  
                  {/* Table Body - PERFORMANCE OPTIMIZED: Removed AnimatePresence and motion for scrolling performance */}
                  <div className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className="grid grid-cols-[32px_1fr_0.8fr_52px_52px_52px_20px] gap-1 px-2 py-1.5 hover:bg-emerald-50/50 active:bg-emerald-100/50 transition-colors cursor-pointer"
                      >
                        {/* Photo */}
                        <div className="flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-white shadow-sm flex-shrink-0">
                            {member.photo_url ? (
                              <img src={member.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-bold">
                                {member.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Name & Phone */}
                        <div className="flex flex-col justify-center min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{member.full_name}</p>
                          <p className="text-[9px] truncate leading-tight" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{member.phone}</p>
                        </div>

                        {/* Membership Plan & Amount */}
                        <div className="flex flex-col justify-center min-w-0">
                          <p className="text-[10px] font-medium truncate leading-tight" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{member.membership_plan || '-'}</p>
                          <p className="text-[9px] text-emerald-600 font-semibold leading-tight">₹{member.plan_amount?.toLocaleString() || 0}</p>
                        </div>

                        {/* Joining Date */}
                        <div className="flex items-center justify-center">
                          <span className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                            {member.joining_date ? format(new Date(member.joining_date), 'dd/MM') : member.created_at ? format(new Date(member.created_at), 'dd/MM') : '-'}
                          </span>
                        </div>

                        {/* Last Payment Date */}
                        <div className="flex items-center justify-center">
                          <span className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                            {member.last_payment_date ? format(new Date(member.last_payment_date), 'dd/MM') : '-'}
                          </span>
                        </div>

                        {/* Next Due Date */}
                        <div className="flex items-center justify-center">
                          <span className={`text-[9px] font-medium ${
                            member.is_overdue || (member.next_due_date && new Date(member.next_due_date) < new Date())
                              ? 'text-red-500' 
                              : 'text-slate-500'
                          }`}>
                            {member.next_due_date ? format(new Date(member.next_due_date), 'dd/MM') : member.next_payment_due_date ? format(new Date(member.next_payment_due_date), 'dd/MM') : '-'}
                          </span>
                        </div>

                        {/* Status Icon */}
                        <div className="flex items-center justify-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            member.status === 'active'
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-400/50'
                              : 'bg-slate-300'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-white/40 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <Search className="w-7 h-7 text-slate-400" />
              </motion.div>
              <p className="text-slate-600 mb-3 font-medium text-sm">No members found</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-[#10B981] text-white rounded-full font-bold shadow-lg shadow-[#10B981]/30 text-sm"
              >
                Add Your First Member
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Member Modal - Light Theme to match Payment Popup */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { 
        setIsAddModalOpen(open); 
        if (!open) { 
          setIsEditMode(false); 
          setWizardStep(1); 
          setPhoneCheckStatus('idle');
          setFoundMember(null);
          // Reset form when closing
          setFormData({
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
            photo_url: undefined,
          });
        } 
      }}>
        <DialogContent 
          className="p-0 border-0 bg-transparent shadow-none w-[90vw] max-w-[340px] max-h-[70vh] mx-auto mb-16 [&>button]:hidden popup-scale"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 max-h-[70vh] flex flex-col"
          >
            {/* Header - Light Theme */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">{isEditMode ? 'Edit Member' : 'Add Member'}</h2>
                {!isEditMode && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {wizardStep}/3
                  </span>
                )}
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setWizardStep(1); }}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* Step Indicator - Only for Add mode */}
            {!isEditMode && (
              <div className="flex items-center justify-center gap-2 py-2 bg-slate-50/50 flex-shrink-0">
                {[1, 2, 3].map((step) => (
                  <motion.div
                    key={step}
                    animate={{ 
                      scale: wizardStep === step ? 1.3 : 1,
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      wizardStep >= step ? 'bg-emerald-500' : 'bg-slate-300'
                    } ${wizardStep === step ? 'w-4' : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Scrollable Form Content */}
            <form id="member-form" onSubmit={isEditMode ? handleSubmitEdit : (e) => { 
              e.preventDefault(); 
              // Validate phone on step 1 before moving forward
              if (wizardStep === 1) {
                if (!formData.full_name.trim()) {
                  toast.error('Please enter member name');
                  return;
                }
                if (!formData.phone.trim()) {
                  toast.error('Please enter phone number');
                  return;
                }
                if (formData.phone.length !== 10) {
                  toast.error(`Phone must be exactly 10 digits (currently ${formData.phone.length}/10)`);
                  return;
                }
              }
              // Validate Gender, Height, Weight on step 2 before moving forward
              if (wizardStep === 2) {
                if (!formData.gender) {
                  toast.error('Please select gender');
                  return;
                }
                if (!formData.height?.trim()) {
                  toast.error('Please enter height');
                  return;
                }
                if (!formData.weight?.trim()) {
                  toast.error('Please enter weight');
                  return;
                }
              }
              if (wizardStep < 3) { 
                setWizardStep(wizardStep + 1); 
              } else { 
                handleSubmitAdd(e); 
              } 
            }} className="p-4 space-y-3 overflow-y-auto scrollbar-hide flex-1 min-h-0">
              <AnimatePresence mode="wait">
                {/* Step 1: Photo & Basic Info */}
                {(wizardStep === 1 || isEditMode) && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {/* Photo Section */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        {photoPreview ? (
                          <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <PhotoPicker
                          currentPhoto={photoPreview}
                          onPhotoSelected={handlePhotoSelected}
                          disabled={createMemberMutation.isPending}
                          compact={true}
                        />
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Phone Number * <span className="text-slate-400 text-[10px]">(10 digits)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm ${
                            phoneCheckStatus === 'found_active' ? 'border-red-400' :
                            phoneCheckStatus === 'found_inactive' ? 'border-amber-400' :
                            formData.phone && formData.phone.length !== 10 ? 'border-red-400' : 'border-slate-200'
                          }`}
                          placeholder="10-digit phone (e.g. 9876543210)"
                          maxLength={10}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                        />
                        {/* Phone check status indicator */}
                        {phoneCheckStatus === 'checking' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {/* Status messages */}
                      {!isEditMode && (
                        <>
                          {formData.phone && formData.phone.length !== 10 && phoneCheckStatus !== 'checking' && (
                            <p className="text-red-500 text-[10px] mt-1">Phone must be 10 digits ({formData.phone.length}/10)</p>
                          )}
                          
                          {phoneCheckStatus === 'checking' && (
                            <p className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                            </p>
                          )}
                          
                          {phoneCheckStatus === 'not_found' && (
                            <p className="text-emerald-600 text-[10px] mt-1 flex items-center gap-1">
                              <Check className="w-3 h-3" /> New member - ready to add
                            </p>
                          )}
                          
                          {phoneCheckStatus === 'found_active' && foundMember && (
                            <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                              <p className="text-red-600 text-xs font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Member already exists
                              </p>
                              <p className="text-red-500 text-[10px] mt-0.5">
                                {foundMember.full_name} is already an active member.
                              </p>
                            </div>
                          )}
                          
                          {phoneCheckStatus === 'found_inactive' && foundMember && (
                            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-amber-700 text-xs font-semibold flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" /> Former member found
                                  </p>
                                  <p className="text-amber-600 text-[10px] mt-0.5 truncate">
                                    {foundMember.full_name} • {foundMember.total_periods} previous period{foundMember.total_periods > 1 ? 's' : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowRejoinModal(true)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg transition-all flex-shrink-0"
                                >
                                  Reactivate
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Edit mode simple validation */}
                      {isEditMode && formData.phone && formData.phone.length !== 10 && (
                        <p className="text-red-500 text-[10px] mt-1">Phone must be 10 digits ({formData.phone.length}/10)</p>
                      )}
                      {isEditMode && formData.phone && formData.phone.length === 10 && (
                        <p className="text-emerald-600 text-[10px] mt-1">✓ Valid phone</p>
                      )}
                    </div>

                    {/* Edit Mode: Show all fields */}
                    {isEditMode && (
                      <>
                        {/* Email */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Email <span className="text-slate-400">(name@domain.com)</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2.5 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm ${
                              formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-400' : 'border-slate-200'
                            }`}
                            placeholder="email@example.com"
                          />
                          {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                            <p className="text-red-500 text-[10px] mt-1">Invalid email format</p>
                          )}
                          {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                            <p className="text-emerald-600 text-[10px] mt-1">✓ Valid email</p>
                          )}
                        </div>

                        {/* Gender Selection */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['male', 'female', 'other'] as Gender[]).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setFormData({ ...formData, gender: g })}
                                className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                                  formData.gender === g
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Height & Weight */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Height (cm)</label>
                            <input
                              type="text"
                              value={formData.height || ''}
                              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                              placeholder="170"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg)</label>
                            <input
                              type="text"
                              value={formData.weight || ''}
                              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                              placeholder="70"
                            />
                          </div>
                        </div>

                        {/* Joining Date - Read Only */}
                        {selectedMember?.joining_date && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Joining Date</label>
                            <div className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium">
                              {new Date(selectedMember.joining_date).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                        )}

                        {/* Info Notice for Edit Mode */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-[10px] text-amber-700 leading-tight">
                            Plan & payment: change during renewal
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Details (Add Mode Only) */}
                {wizardStep === 2 && !isEditMode && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-2">
                      <p className="text-sm text-slate-800 font-medium">Additional Details</p>
                      <p className="text-[10px] text-slate-500">Required information</p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Email <span className="text-slate-400 text-[9px]">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm ${
                          formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-400' : 'border-slate-200'
                        }`}
                        placeholder="member@email.com"
                      />
                      {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                        <p className="text-red-500 text-[10px] mt-1">Invalid email format</p>
                      )}
                      {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                        <p className="text-emerald-600 text-[10px] mt-1">✓ Valid email</p>
                      )}
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['male', 'female', 'other'] as Gender[]).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                              formData.gender === g
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Height & Weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Height (cm) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.height || ''}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                          placeholder="170"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.weight || ''}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                          placeholder="70"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Membership (Add Mode Only) - COMPACT */}
                {wizardStep === 3 && !isEditMode && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <div className="text-center mb-1">
                      <p className="text-sm text-slate-800 font-medium">Membership Plan</p>
                      <p className="text-[10px] text-slate-500">Select plan and joining date</p>
                    </div>

                    {/* Plan Selection - Regular plans in one row (max 4), Special plans in next row (max 4) */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Plan</label>
                      <div className="space-y-2">
                        {/* Regular Plans Row - Max 4 per row */}
                        {regularPlans.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5">
                            {regularPlans.map((plan) => (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, plan_id: plan.id, membership_plan: plan.label, plan_amount: plan.amount })}
                                className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border ${
                                  formData.plan_id === plan.id
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <div className="font-bold text-[10px] leading-tight line-clamp-2 break-words text-center">{plan.label}</div>
                                <div className="text-[9px] opacity-80 mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                                <div className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} month{plan.totalMonths !== 1 ? 's' : ''}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Special Plans Row - Max 4 per row */}
                        {specialPlans.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5">
                            {specialPlans.map((plan) => (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, plan_id: plan.id, membership_plan: plan.label, plan_amount: plan.amount })}
                                className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border-2 ${
                                  formData.plan_id === plan.id
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-50 text-slate-600 border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                <div className="font-bold text-[10px] leading-tight line-clamp-2 break-words text-center">{plan.label}</div>
                                <div className="text-[9px] opacity-80 mt-1">₹{plan.amount.toLocaleString('en-IN')}</div>
                                <div className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} months</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount & Join Date - Single Row */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Amount</label>
                        <div className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold">
                          ₹{formData.plan_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      {/* Join Date */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Joining Date</label>
                        <input
                          type="date"
                          value={formData.joining_date}
                          onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm [color-scheme:light]"
                          required
                        />
                      </div>
                    </div>

                    {/* Next Due Date - Compact Info Box */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-semibold text-emerald-700">Next Due</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">
                          {(() => {
                            if (!formData.joining_date || !formData.plan_id) return '-';
                            const plan = plans.find(p => p.id === formData.plan_id);
                            if (!plan) return '-';
                            const baseMonths = plan.base_duration_months || plan.duration_months || 1;
                            const bonusMonths = plan.bonus_duration_months || 0;
                            const totalMonths = baseMonths + bonusMonths;
                            return format(
                              dateAddMonths(new Date(formData.joining_date), totalMonths),
                              'dd MMM yyyy'
                            );
                          })()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Fixed Footer with Navigation Buttons */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200/60 bg-slate-50/80">
              <div className="flex gap-3">
                {/* Back Button (Add mode, steps 2-3) */}
                {!isEditMode && wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm transition-colors border border-slate-200"
                  >
                    Back
                  </button>
                )}

                {/* Next/Submit Button */}
                <button
                  type="submit"
                  form="member-form"
                  disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
                  className={`flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/30 ${
                    !isEditMode && wizardStep === 1 ? 'w-full' : ''
                  }`}
                >
                  {(createMemberMutation.isPending || updateMemberMutation.isPending) ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>{isEditMode ? 'Saving...' : 'Adding...'}</span>
                    </span>
                  ) : (
                    isEditMode ? 'Save Changes' : (wizardStep < 3 ? 'Continue' : 'Add Member')
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Unified Member Popup - Same as Dashboard but with Edit option */}
      <UnifiedMemberPopup
        member={selectedMemberForPopup}
        isOpen={!!selectedMemberForPopup}
        onClose={() => setSelectedMemberForPopup(null)}
        onUpdate={() => {
          refetchMembers();
          // Also invalidate calendar queries so stats update immediately
          queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        showEditButton={true}
        onEdit={(memberData) => {
          // Find full member data to open edit modal
          const fullMember = members?.find(m => m.id === memberData.id);
          if (fullMember) {
            handleOpenEditModal(fullMember);
          }
        }}
      />

      {/* Advanced Filter Dialog - Compact & Elegant */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent 
          className="p-0 border-0 shadow-2xl max-w-[300px] mx-auto rounded-2xl overflow-hidden [&>button]:hidden"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.98))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))', backgroundColor: 'var(--theme-glass-bg, rgba(248, 250, 252, 0.8))' }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Filters</h2>
            </div>
            <button 
              onClick={() => setShowFilterDialog(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))' }}
            >
              <X className="w-3 h-3" style={{ color: 'var(--theme-text-secondary)' }} />
            </button>
          </div>

          {/* Compact Filter Content - No Scroll */}
          <div className="p-3 space-y-3" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))' }}>
            {/* Row 1: Status */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase w-14 flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>Status</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTempFilters(prev => ({ ...prev, status: f.key }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      tempFilters.status === f.key
                        ? 'bg-purple-500 text-white shadow-sm'
                        : ''
                    }`}
                    style={tempFilters.status !== f.key ? { 
                      backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Plan */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase w-14 flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>Plan</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {planFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTempFilters(prev => ({ ...prev, plan: f.key }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      tempFilters.plan === f.key
                        ? 'bg-purple-500 text-white shadow-sm'
                        : ''
                    }`}
                    style={tempFilters.plan !== f.key ? { 
                      backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Gender */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase w-14 flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>Gender</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {genderFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTempFilters(prev => ({ ...prev, gender: f.key }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      tempFilters.gender === f.key
                        ? 'bg-purple-500 text-white shadow-sm'
                        : ''
                    }`}
                    style={tempFilters.gender !== f.key ? { 
                      backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Joined */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase w-14 flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>Joined</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {joiningFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTempFilters(prev => ({ ...prev, joining: f.key }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      tempFilters.joining === f.key
                        ? 'bg-purple-500 text-white shadow-sm'
                        : ''
                    }`}
                    style={tempFilters.joining !== f.key ? { 
                      backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 5: Sort */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase w-14 flex-shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>Sort</span>
              <div className="flex gap-1 flex-wrap flex-1">
                {sortOptions.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTempFilters(prev => ({ ...prev, sortBy: f.key }))}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      tempFilters.sortBy === f.key
                        ? 'bg-purple-500 text-white shadow-sm'
                        : ''
                    }`}
                    style={tempFilters.sortBy !== f.key ? { 
                      backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                      color: 'var(--theme-text-secondary)'
                    } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t" style={{ borderColor: 'var(--theme-glass-border, rgba(226, 232, 240, 0.8))', backgroundColor: 'var(--theme-glass-bg, rgba(248, 250, 252, 0.8))' }}>
            <button
              onClick={() => {
                setTempFilters({
                  status: 'all',
                  plan: 'all',
                  gender: 'all',
                  joining: 'all',
                  sortBy: 'name_asc',
                });
              }}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors"
              style={{ 
                backgroundColor: 'var(--theme-glass-bg, rgba(226, 232, 240, 0.8))',
                color: 'var(--theme-text-secondary)'
              }}
            >
              Reset
            </button>
            <button
              onClick={() => {
                setFilters(tempFilters);
                setShowFilterDialog(false);
                const activeCount = [
                  tempFilters.status !== 'all',
                  tempFilters.plan !== 'all',
                  tempFilters.gender !== 'all',
                  tempFilters.joining !== 'all',
                  tempFilters.sortBy !== 'name_asc',
                ].filter(Boolean).length;
                if (activeCount > 0) {
                  toast.success(`${activeCount} filter${activeCount > 1 ? 's' : ''} applied! 🎯`);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-colors shadow-md"
            >
              Apply
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejoin Member Modal */}
      <RejoinMemberModal
        isOpen={showRejoinModal}
        onClose={() => setShowRejoinModal(false)}
        member={foundMember ? {
          id: foundMember.id,
          full_name: foundMember.full_name,
          phone: foundMember.phone,
          email: foundMember.email,
          photo_url: foundMember.photo_url,
          gender: foundMember.gender,
          status: foundMember.status,
          first_joining_date: foundMember.first_joining_date,
          joining_date: foundMember.joining_date,
          total_periods: foundMember.total_periods,
          lifetime_value: foundMember.lifetime_value,
          periods: foundMember.periods,
        } : null}
        onRejoin={handleRejoinMember}
        isLoading={isRejoinLoading}
      />
    </div>
  );
}

// Compact Member Card Component - PERFORMANCE OPTIMIZED with React.memo
const MemberCard = React.memo(function MemberCard({ member, index = 0 }: { member: any; index?: number }) {
  const getGradient = (plan: MembershipPlan) => {
    switch (plan) {
      case 'monthly': return 'from-violet-400 to-purple-500';
      case 'quarterly': return 'from-emerald-400 to-teal-500';
      case 'half_yearly': return 'from-blue-400 to-cyan-500';
      case 'annual': return 'from-amber-400 to-orange-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  const getPlanLabel = (plan: MembershipPlan) => {
    switch (plan) {
      case 'monthly': return '1M';
      case 'quarterly': return '3M';
      case 'half_yearly': return '6M';
      case 'annual': return '12M';
      default: return '';
    }
  };

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer blur-optimized"
      style={{ 
        backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', 
        borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
        borderWidth: '1px'
      }}
    >
      <div className="flex items-center gap-2 p-2">
        {/* Compact Photo */}
        <div className={`w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${getGradient(member.membership_plan)} flex items-center justify-center overflow-hidden`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-lg text-white/90 font-bold">{member.full_name.charAt(0)}</span>
          )}
        </div>

        {/* Info - Compact layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-bold truncate text-[11px] leading-tight" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{member.full_name}</h3>
            <span className={`text-[7px] px-1 py-0.5 rounded bg-gradient-to-r ${getGradient(member.membership_plan)} text-white font-bold flex-shrink-0`}>
              {getPlanLabel(member.membership_plan)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[9px] truncate" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{member.phone}</p>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>₹{member.plan_amount.toLocaleString('en-IN')}</span>
              {member.is_overdue && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
