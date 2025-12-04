import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { GymLoader } from '@/components/ui/GymLoader';
import { Search, ChevronLeft, X, Phone, Mail, Edit, Calendar, User, Ruler, Weight, Plus, DollarSign, Save, Filter, MessageCircle, CreditCard, Power, Check, ChevronDown, Users, TrendingUp, Sparkles, RefreshCw, LayoutGrid, Table2, Clock, ArrowUpDown, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

export default function MembersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemberForPopup, setSelectedMemberForPopup] = useState<UnifiedMemberData | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [plans, setPlans] = useState<MembershipPlanWithPromo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [wizardStep, setWizardStep] = useState(1);
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
    membership_plan: 'monthly',
    plan_amount: 1000,
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

  // Filter members - simplified to just status
  const filteredMembers = members?.filter((member) => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm);
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && member.status === activeFilter;
  })?.sort((a, b) => {
    // Default A-Z sorting by name
    const comparison = a.full_name.localeCompare(b.full_name);
    return sortOrder === 'asc' ? comparison : -comparison;
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
    };
    setSelectedMemberForPopup(memberData);
  };

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

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

      // Create member using membership service
      const member = await membershipService.createMember({
        ...data,
        photo_url: photoUrl,
      } as Parameters<typeof membershipService.createMember>[0]);

      return member;
    },
    onSuccess: () => {
      toast.success('Member added successfully! 🎉');
      refetchMembers();
      setIsAddModalOpen(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        gender: undefined,
        height: '',
        weight: '',
        joining_date: new Date().toISOString().split('T')[0],
        membership_plan: 'monthly',
        plan_amount: 1000,
        photo_url: undefined,
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      console.error('Error creating member:', error);
      toast.error(error.message || 'Failed to add member');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: Partial<MemberFormData> }) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

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
      };

      // Only update photo_url if it was changed
      if (photoFile || (photoFile === null && photoPreview === null && data.photo_url === null)) {
        updateData.photo_url = photoUrl;
      }

      const { data: member, error } = await supabase
        .from('gym_members')
        .update(updateData)
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      toast.success('Member updated successfully! 🎉');
      refetchMembers();
      setIsAddModalOpen(false); // Close the modal
      setIsEditMode(false);
      setSelectedMember(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error: any) => {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update member');
    },
  });

  const planOptions: { value: MembershipPlan; label: string; amount: number }[] = [
    { value: 'monthly', label: '1 Month', amount: 1000 },
    { value: 'quarterly', label: '3 Months', amount: 2500 },
    { value: 'half_yearly', label: '6 Months', amount: 5000 },
    { value: 'annual', label: '12 Months', amount: 7500 },
  ];

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
      membership_plan: 'monthly',
      plan_amount: 1000,
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

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchMembers();
    setRefreshing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  // Handle Excel export
  const handleExportExcel = () => {
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

      exportService.exportFilteredMembersToExcel(exportData, activeFilter);
      toast.success(`Exported ${filteredMembers.length} members to Excel! 📊`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export members');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
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
            {/* Export Excel Button */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center"
              title="Export to Excel"
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
          
          {/* Filter Dropdown */}
          <div className="relative z-50">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`h-[38px] px-3 rounded-xl border shadow-sm flex items-center gap-1.5 text-sm font-medium transition-all ${
                activeFilter !== 'all' 
                  ? 'bg-[#10B981] text-white border-[#10B981]' 
                  : 'bg-white/70 text-slate-600 border-white/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-xs">{statusFilters.find(f => f.key === activeFilter)?.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* Filter Dropdown Menu */}
            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-white backdrop-blur-xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-50 min-w-[140px]"
                  >
                    {statusFilters.map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => {
                          setActiveFilter(filter.key);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                          activeFilter === filter.key 
                            ? 'bg-[#10B981]/10 text-[#10B981]' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* Animated Stats Cards */}
      <div className="flex-shrink-0 px-4 pb-2 relative z-0">
        <div className="grid grid-cols-3 gap-2">
          {/* Total Members */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className='backdrop-blur-md rounded-2xl p-3 shadow-md relative overflow-hidden'
            style={{ 
              backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            {/* Progress bar at bottom */}
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-cyan-200/30'>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, delay: 0.5 }}
                className='h-full bg-gradient-to-r from-cyan-400 to-sky-500'
              />
            </div>
            <div className='flex items-center gap-1.5 mb-1'>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className='w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center'
              >
                <Users className="w-2.5 h-2.5 text-white" />
              </motion.div>
              <span className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Total</span>
            </div>
            <p className='text-base font-extrabold text-cyan-600'>
              <AnimatedNumber value={totalMembers} />
            </p>
          </motion.div>

          {/* Active Members */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className='backdrop-blur-md rounded-2xl p-3 shadow-md relative overflow-hidden'
            style={{ 
              backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            {/* Progress bar at bottom */}
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-emerald-200/30'>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${activePercentage}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className='h-full bg-gradient-to-r from-emerald-400 to-emerald-500'
              />
            </div>
            <div className='flex items-center gap-1.5 mb-1'>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                className='w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center'
              >
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </motion.div>
              <span className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Active</span>
              {activeMembers > 100 && (
                <TrendingUp className='w-3 h-3 text-emerald-500' />
              )}
            </div>
            <p className='text-base font-extrabold text-emerald-600'>
              <AnimatedNumber value={activeMembers} />
            </p>
          </motion.div>

          {/* Inactive Members */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className='backdrop-blur-md rounded-2xl p-3 shadow-md relative overflow-hidden'
            style={{ 
              backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))', 
              borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
              borderWidth: '1px'
            }}
          >
            {/* Progress bar at bottom */}
            <div className='absolute bottom-0 left-0 right-0 h-1 bg-slate-200/30'>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalMembers > 0 ? (inactiveMembers / totalMembers) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className='h-full bg-gradient-to-r from-slate-400 to-slate-500'
              />
            </div>
            <div className='flex items-center gap-1.5 mb-1'>
              <div className='relative'>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className='w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center'
                >
                  <div className='w-1.5 h-1.5 rounded-full bg-white'></div>
                </motion.div>
                {inactiveMembers > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className='absolute inset-0 rounded-full bg-slate-400/40'
                  />
                )}
              </div>
              <span className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Inactive</span>
            </div>
            <p className='text-base font-extrabold' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              <AnimatedNumber value={inactiveMembers} />
            </p>
          </motion.div>
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
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4"
              >
                <AnimatePresence>
                  {filteredMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: Math.min(index * 0.02, 0.3),
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMemberClick(member)}
                    >
                      <MemberCard member={member} index={index} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Table View - compact with proper columns */
              <motion.div 
                key="table-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pb-2"
              >
                {/* Table Container */}
                <div 
                  className="backdrop-blur-md rounded-xl shadow-sm overflow-hidden"
                  style={{ 
                    backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.8))', 
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
                  
                  {/* Table Body */}
                  <div className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                    <AnimatePresence>
                      {filteredMembers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ 
                            duration: 0.15, 
                            delay: Math.min(index * 0.01, 0.15),
                            type: "spring",
                            stiffness: 500,
                            damping: 35
                          }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleMemberClick(member)}
                          className="grid grid-cols-[32px_1fr_0.8fr_52px_52px_52px_20px] gap-1 px-2 py-1.5 hover:bg-emerald-50/50 active:bg-emerald-100/50 transition-colors cursor-pointer"
                        >
                          {/* Photo */}
                          <div className="flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-white shadow-sm flex-shrink-0">
                              {member.photo_url ? (
                                <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
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
                            <motion.div
                              animate={member.status === 'active' ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className={`w-2.5 h-2.5 rounded-full ${
                                member.status === 'active'
                                  ? 'bg-emerald-500 shadow-sm shadow-emerald-400/50'
                                  : 'bg-slate-300'
                              }`}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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

      {/* Add/Edit Member Modal - Dark Glassmorphism with Readable Text */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) { setIsEditMode(false); setWizardStep(1); } }}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[280px] max-h-[55vh] mx-auto mb-16 [&>button]:hidden popup-scale">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 max-h-[55vh] flex flex-col"
          >
            {/* Header - Compact */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-white">{isEditMode ? 'Edit Member' : 'Add Member'}</h2>
                {!isEditMode && (
                  <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    {wizardStep}/3
                  </span>
                )}
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setWizardStep(1); }}
                className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50 transition-colors"
              >
                <X className="w-2.5 h-2.5 text-slate-300" />
              </button>
            </div>

            {/* Step Indicator - Only for Add mode */}
            {!isEditMode && (
              <div className="flex items-center justify-center gap-1.5 py-1 bg-slate-800/30 flex-shrink-0">
                {[1, 2, 3].map((step) => (
                  <motion.div
                    key={step}
                    animate={{ 
                      scale: wizardStep === step ? 1.2 : 1,
                      backgroundColor: wizardStep >= step ? '#10B981' : 'rgba(100,116,139,0.5)'
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      wizardStep >= step ? 'bg-emerald-500' : 'bg-slate-500/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Scrollable Form Content */}
            <form id="member-form" onSubmit={isEditMode ? handleSubmitEdit : (e) => { e.preventDefault(); if (wizardStep < 3) { setWizardStep(wizardStep + 1); } else { handleSubmitAdd(e); } }} className="p-2 space-y-1 overflow-y-auto scrollbar-hide flex-1 min-h-0">
              <AnimatePresence mode="wait">
                {/* Step 1: Photo & Basic Info */}
                {(wizardStep === 1 || isEditMode) && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-1"
                  >
                    {/* Photo Section - Ultra Compact */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700/50 flex-shrink-0 border border-slate-600">
                        {photoPreview ? (
                          <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User className="w-3.5 h-3.5" />
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
                      <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Full Name *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-2 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[11px] font-medium"
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Phone Number *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-2 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[11px] font-medium"
                        placeholder="10-digit phone number"
                        maxLength={10}
                        required
                      />
                    </div>

                    {/* Edit Mode: Show all fields */}
                    {isEditMode && (
                      <>
                        {/* Email */}
                        <div>
                          <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Email</label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-2 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[11px]"
                            placeholder="Email address"
                          />
                        </div>

                        {/* Gender Selection - Ultra compact */}
                        <div>
                          <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Gender</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['male', 'female', 'other'] as Gender[]).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setFormData({ ...formData, gender: g })}
                                className={`py-0.5 rounded text-[9px] font-semibold transition-all border ${
                                  formData.gender === g
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-slate-700/50 text-slate-300 border-slate-600'
                                }`}
                              >
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Height & Weight - Ultra Compact */}
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Height (cm)</label>
                            <input
                              type="text"
                              value={formData.height || ''}
                              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                              className="w-full px-2 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[11px]"
                              placeholder="170"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-semibold text-slate-300 mb-0.5 ml-0.5">Weight (kg)</label>
                            <input
                              type="text"
                              value={formData.weight || ''}
                              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                              className="w-full px-2 py-1 rounded-md border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[11px]"
                              placeholder="70"
                            />
                          </div>
                        </div>

                        {/* Info Notice for Edit Mode - Ultra Compact */}
                        <div className="bg-amber-500/20 border border-amber-500/40 rounded p-1 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                          <p className="text-[7px] text-amber-300 leading-tight">
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
                    className="space-y-2"
                  >
                    <div className="text-center mb-1">
                      <p className="text-xs text-white font-medium">Additional Details</p>
                      <p className="text-[10px] text-slate-400">Optional information</p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                        placeholder="member@email.com"
                      />
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Gender</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['male', 'female', 'other'] as Gender[]).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                              formData.gender === g
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Height & Weight */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Height (cm)</label>
                        <input
                          type="text"
                          value={formData.height || ''}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                          placeholder="170"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Weight (kg)</label>
                        <input
                          type="text"
                          value={formData.weight || ''}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                          placeholder="70"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Membership (Add Mode Only) */}
                {wizardStep === 3 && !isEditMode && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2"
                  >
                    <div className="text-center mb-1">
                      <p className="text-xs text-white font-medium">Membership Plan</p>
                      <p className="text-[10px] text-slate-400">Select plan and joining date</p>
                    </div>

                    {/* Plan Selection */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1 ml-1">Select Plan</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {planOptions.map((plan) => (
                          <button
                            key={plan.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, membership_plan: plan.value, plan_amount: plan.amount })}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border ${
                              formData.membership_plan === plan.value
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            <div>{plan.label}</div>
                            <div className="text-[10px] mt-0.5 opacity-80">₹{plan.amount.toLocaleString('en-IN')}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={formData.plan_amount}
                        onChange={(e) => setFormData({ ...formData, plan_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm font-bold"
                        min="0"
                        required
                      />
                    </div>

                    {/* Join Date */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 ml-1">Joining Date</label>
                      <input
                        type="date"
                        value={formData.joining_date}
                        onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm [color-scheme:dark]"
                        required
                      />
                    </div>

                    {/* Auto-calculated Next Due Date */}
                    <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-300">Next Due Date</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">
                          {formData.joining_date ? format(
                            dateAddMonths(
                              new Date(formData.joining_date),
                              formData.membership_plan === 'monthly' ? 1 :
                              formData.membership_plan === 'quarterly' ? 3 :
                              formData.membership_plan === 'half_yearly' ? 6 : 12
                            ),
                            'dd MMM yyyy'
                          ) : '-'}
                        </span>
                      </div>
                      <p className="text-[9px] text-emerald-400/70 mt-0.5">Auto-calculated based on plan duration</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Fixed Footer with Navigation Buttons */}
            <div className="flex-shrink-0 px-2 py-1.5 border-t border-slate-700/50 bg-slate-800/50">
              <div className="flex gap-1.5">
                {/* Back Button (Add mode, steps 2-3) */}
                {!isEditMode && wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg font-semibold text-[10px] transition-colors border border-slate-600"
                  >
                    Back
                  </button>
                )}

                {/* Next/Submit Button */}
                <button
                  type="submit"
                  form="member-form"
                  disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
                  className={`flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg font-semibold text-[10px] transition-colors disabled:opacity-50 shadow-md shadow-emerald-500/30 ${
                    !isEditMode && wizardStep === 1 ? 'w-full' : ''
                  }`}
                >
                  {(createMemberMutation.isPending || updateMemberMutation.isPending) ? (
                    <span className="flex items-center justify-center gap-1">
                      <div className="animate-spin rounded-full h-2.5 w-2.5 border-2 border-white border-t-transparent"></div>
                      <span>{isEditMode ? 'Saving...' : 'Adding...'}</span>
                    </span>
                  ) : (
                    isEditMode ? 'Save' : (wizardStep < 3 ? 'Next' : 'Add')
                  )}
                </button>
              </div>

              {/* Skip Button (Add mode, step 2) */}
              {!isEditMode && wizardStep === 2 && (
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="w-full text-[8px] text-slate-400 hover:text-slate-300 py-0.5 transition-colors mt-0.5"
                >
                  Skip →
                </button>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Unified Member Popup - Same as Dashboard but with Edit option */}
      <UnifiedMemberPopup
        member={selectedMemberForPopup}
        isOpen={!!selectedMemberForPopup}
        onClose={() => setSelectedMemberForPopup(null)}
        onUpdate={() => refetchMembers()}
        showEditButton={true}
        onEdit={(memberData) => {
          // Find full member data to open edit modal
          const fullMember = members?.find(m => m.id === memberData.id);
          if (fullMember) {
            handleOpenEditModal(fullMember);
          }
        }}
      />
    </div>
  );
}

// Compact Member Card Component - optimized for grid view
function MemberCard({ member, index = 0 }: { member: any; index?: number }) {
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
      className="backdrop-blur-md rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
      style={{ 
        backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
        borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
        borderWidth: '1px'
      }}
    >
      <div className="flex items-center gap-2 p-2">
        {/* Compact Photo */}
        <div className={`w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${getGradient(member.membership_plan)} flex items-center justify-center overflow-hidden`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
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
                <motion.span 
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-red-500"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
