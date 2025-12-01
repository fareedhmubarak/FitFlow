import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase, getCurrentGymId } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { GymLoader } from '@/components/ui/GymLoader';
import { Search, ChevronLeft, X, Phone, Mail, Edit, Calendar, User, Ruler, Weight, Plus, DollarSign, Save, Filter, MessageCircle, CreditCard, Power, Check, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addMonths as dateAddMonths } from 'date-fns';
import { getRandomPersonPhoto } from '../../lib/memberPhoto';
import toast from 'react-hot-toast';
import PhotoPicker from '../../components/members/PhotoPicker';
import { uploadImage } from '../../lib/imageUpload';
import { membershipService } from '../../lib/membershipService';
import { gymService, MembershipPlanWithPromo } from '@/lib/gymService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';

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
    // Convert Member to UnifiedMemberData
    const memberData: UnifiedMemberData = {
      id: member.id,
      name: member.full_name,
      phone: member.phone,
      photo_url: member.photo_url,
      status: member.status,
      plan_name: member.membership_plan,
      plan_amount: member.plan_amount,
    };
    setSelectedMemberForPopup(memberData);
  };

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      let photoUrl = data.photo_url || getRandomPersonPhoto(data.gender);

      // Upload photo if provided
      if (photoFile) {
        try {
          const uploadResult = await uploadImage(photoFile, 'images', `members/${gymId}`);
          photoUrl = uploadResult.url;
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
    return <GymLoader message="Loading members..." />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden">
      {/* Background Blobs - extend into safe areas */}
      <motion.div 
        animate={{ 
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          repeatType: "reverse", 
          ease: "easeInOut" 
        }}
        style={{ borderRadius: '9999px' }}
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          repeatType: "reverse", 
          ease: "easeInOut" 
        }}
        style={{ borderRadius: '9999px' }}
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none z-0" 
      />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-2 relative z-10"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <Link to="/">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-[#1e293b]"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="text-lg font-bold text-[#0f172a]">Members</h1>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenAddModal}
            className="w-9 h-9 rounded-full bg-[#10B981] shadow-md shadow-[#10B981]/30 flex items-center justify-center text-white"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Search + Filter Row */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white/70 backdrop-blur-xl border border-white/50 text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm text-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          
          {/* Filter Dropdown */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`h-full px-3 rounded-xl border shadow-sm flex items-center gap-1.5 text-sm font-medium transition-all ${
                activeFilter !== 'all' 
                  ? 'bg-[#10B981] text-white border-[#10B981]' 
                  : 'bg-white/70 text-slate-600 border-white/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden xs:inline">{statusFilters.find(f => f.key === activeFilter)?.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* Filter Dropdown Menu */}
            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-20"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-white/95 backdrop-blur-xl rounded-xl border border-white/60 shadow-xl overflow-hidden z-30 min-w-[120px]"
                  >
                    {statusFilters.map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => {
                          setActiveFilter(filter.key);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
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

      {/* Compact Stats Row */}
      <div className="flex-shrink-0 px-4 pb-2 relative z-10">
        <div className="flex gap-2">
          <div className="flex-1 bg-white/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/50">
            <p className="text-lg font-bold text-[#0f172a]">{members?.length || 0}</p>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Total</p>
          </div>
          <div className="flex-1 bg-white/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/50">
            <p className="text-lg font-bold text-emerald-600">{members?.filter(m => m.status === 'active').length || 0}</p>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Active</p>
          </div>
          <div className="flex-1 bg-white/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/50">
            <p className="text-lg font-bold text-slate-400">{members?.filter(m => m.status === 'inactive').length || 0}</p>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Inactive</p>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="flex-1 px-4 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {filteredMembers && filteredMembers.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 pb-4">
            <AnimatePresence>
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => handleMemberClick(member)}
                >
                  <MemberCard member={member} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/40 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-600 mb-3 font-medium text-sm">No members found</p>
              <button 
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-[#10B981] text-white rounded-full font-bold shadow-lg shadow-[#10B981]/30 text-sm"
              >
                Add Your First Member
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[340px] mx-auto [&>button]:hidden max-h-[90vh] overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-3xl rounded-[32px] overflow-hidden shadow-2xl border border-white/50"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#0f172a]">Add Member</h2>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdd} className="space-y-4">
                {/* Photo Picker Section - ALWAYS VISIBLE */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border-2 border-emerald-200/50">
                  <h2 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Member Photo
                  </h2>
                  <div style={{ minHeight: '200px' }}>
                    <PhotoPicker
                      currentPhoto={photoPreview}
                      onPhotoSelected={handlePhotoSelected}
                      disabled={createMemberMutation.isPending}
                    />
                  </div>
                </div>

                {/* Personal Info */}
                <div className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-white/50">
                  <h2 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        placeholder="10-digit phone"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

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

              {/* Membership Info */}
              <div className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 shadow-lg border border-white/50">
                  <h2 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Membership Details
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                        Joining Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.joining_date}
                        onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        required
                      />
                    </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                      Plan <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {planOptions.map((plan) => (
                        <button
                          key={plan.value}
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            membership_plan: plan.value,
                            plan_amount: plan.amount 
                          })}
                          className={`p-3 rounded-xl font-semibold text-xs transition-all ${
                            formData.membership_plan === plan.value
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md scale-105'
                              : 'bg-white/60 text-slate-600 hover:bg-white/80'
                          }`}
                        >
                          <div>{plan.label}</div>
                          <div className="text-sm font-bold mt-0.5">₹{plan.amount.toLocaleString('en-IN')}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        value={formData.plan_amount}
                        onChange={(e) => setFormData({ ...formData, plan_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-semibold"
                        placeholder="0"
                        min="0"
                        step="100"
                        required
                      />
                    </div>
                  </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMemberMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
              </form>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Unified Member Popup - Same as Dashboard */}
      <UnifiedMemberPopup
        member={selectedMemberForPopup}
        isOpen={!!selectedMemberForPopup}
        onClose={() => setSelectedMemberForPopup(null)}
        onUpdate={() => refetchMembers()}
      />
    </div>
  );
}

function MemberCard({ member }: { member: any }) {
  const getGradient = (plan: MembershipPlan) => {
    switch (plan) {
      case 'monthly': return 'from-blue-400 to-cyan-300';
      case 'quarterly': return 'from-purple-400 to-pink-300';
      case 'half_yearly': return 'from-orange-400 to-yellow-300';
      case 'annual': return 'from-emerald-400 to-green-300';
    }
  };

  const getMembershipStatusColor = () => {
    if (member.status === 'active' && member.membership_end_date) {
      const endDate = new Date(member.membership_end_date);
      const today = new Date();
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilEnd <= 0) {
        return 'from-red-400 to-red-300';
      } else if (daysUntilEnd <= 7) {
        return 'from-yellow-400 to-orange-300';
      } else {
        return 'from-green-400 to-emerald-300';
      }
    }

    return member.status === 'active' ? 'from-green-400 to-emerald-300' : 'from-gray-400 to-gray-300';
  };

  const getStatusText = () => {
    if (member.status === 'active' && member.membership_end_date) {
      const endDate = new Date(member.membership_end_date);
      const today = new Date();
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilEnd <= 0) {
        return 'Expired';
      } else if (daysUntilEnd <= 7) {
        return `${daysUntilEnd}d`;
      } else {
        return 'Active';
      }
    }

    return member.status === 'active' ? 'Active' : 'Inactive';
  };

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="bg-white/60 backdrop-blur-md rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all border border-white/50 cursor-pointer"
    >
      <div className="flex gap-2 p-2">
        {/* Photo */}
        <div className={`w-16 h-16 flex-shrink-0 rounded-xl bg-gradient-to-br ${getGradient(member.membership_plan)} flex items-center justify-center relative overflow-hidden`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-white/90 font-bold">{member.full_name.charAt(0)}</span>
          )}

          {/* Status Badge */}
          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
            member.status === 'active' && (!member.membership_end_date || new Date(member.membership_end_date) >= new Date()) ? 'bg-emerald-500' : 'bg-red-400'
          } ring-1 ring-white`}></div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <h3 className="font-bold text-[#0f172a] truncate text-xs leading-tight">{member.full_name}</h3>
            <p className="text-[9px] text-slate-500 truncate mt-0.5">{member.phone}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-bold text-[#0f172a]">₹{member.plan_amount.toLocaleString('en-IN')}</span>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] px-1.5 py-0.5 rounded-md bg-gradient-to-r ${getGradient(member.membership_plan)} text-white font-bold`}>
                {member.membership_plan === 'monthly' ? '1M' :
                 member.membership_plan === 'quarterly' ? '3M' :
                 member.membership_plan === 'half_yearly' ? '6M' : '12M'}
              </span>
              {member.is_overdue && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-red-500 text-white font-bold">
                  Due
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
