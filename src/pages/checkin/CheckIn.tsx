import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Search, Users, Clock, MapPin, Camera } from 'lucide-react';
import {
  useTodayCheckIns,
  useTodayCheckInStats,
  useCreateCheckIn,
} from '../../hooks/useCheckIn';
import { useMembers } from '../../hooks/useMembers';
import { GymLoader } from '@/components/ui/GymLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('manual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const { data: checkIns, isLoading: checkInsLoading } = useTodayCheckIns();
  const { data: stats } = useTodayCheckInStats();
  const { data: members, isLoading: membersLoading } = useMembers();
  const createCheckIn = useCreateCheckIn();

  // Filter members based on search
  const filteredMembers = members?.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone.includes(searchTerm)
    );
  });

  const handleCheckIn = async () => {
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }

    try {
      await createCheckIn.mutateAsync({
        member_id: selectedMemberId,
        check_in_method: 'manual',
      });
      toast.success('Member checked in successfully');
      setSearchTerm('');
      setSelectedMemberId('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check in member';
      toast.error(errorMessage);
    }
  };

  if (checkInsLoading || membersLoading) {
    return <GymLoader message="Loading check-in..." />;
  }

  return (
    <div 
      className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]" 
      style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-50"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{t('checkIn.title')}</h1>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Scan QR or search member</p>
          </div>
          <QrCode className="w-6 h-6 text-emerald-600" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 backdrop-blur-xl rounded-xl p-3 border border-emerald-200/50"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{stats?.totalCheckIns || 0}</p>
                <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Today</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-400/20 to-blue-500/10 backdrop-blur-xl rounded-xl p-3 border border-blue-200/50"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{stats?.currentlyInside || 0}</p>
                <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Inside</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-400/20 to-purple-500/10 backdrop-blur-xl rounded-xl p-3 border border-purple-200/50"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{stats?.avgDuration || 0}m</p>
                <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Avg Time</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 relative z-10 space-y-4">
        {/* Tab Buttons */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'manual'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'backdrop-blur-md border border-white/40'
            }`}
            style={{ 
              backgroundColor: activeTab !== 'manual' ? 'var(--theme-glass-bg, rgba(255,255,255,0.5))' : undefined,
              color: activeTab !== 'manual' ? 'var(--theme-text-secondary, #475569)' : undefined 
            }}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            Search Member
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'qr'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'backdrop-blur-md border border-white/40'
            }`}
            style={{ 
              backgroundColor: activeTab !== 'qr' ? 'var(--theme-glass-bg, rgba(255,255,255,0.5))' : undefined,
              color: activeTab !== 'qr' ? 'var(--theme-text-secondary, #475569)' : undefined 
            }}
          >
            <Camera className="w-4 h-4 inline-block mr-2" />
            Scan QR
          </motion.button>
        </div>

        {/* Check-in Interface */}
        <AnimatePresence mode="wait">
          {activeTab === 'manual' ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl backdrop-blur-xl border border-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                  style={{ 
                    backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
                    color: 'var(--theme-text-primary, #1e293b)' 
                  }}
                />
              </div>

              {/* Member search results */}
              {searchTerm && filteredMembers && filteredMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 overflow-hidden"
                >
                  {filteredMembers.slice(0, 5).map((member, idx) => (
                    <motion.button
                      key={member.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setSearchTerm(member.full_name);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-emerald-50/50 transition-colors ${
                        idx !== 0 ? 'border-t border-slate-100' : ''
                      } ${selectedMemberId === member.id ? 'bg-emerald-50' : ''}`}
                    >
                      <Avatar className="w-10 h-10 border-2 border-emerald-200">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {member.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{member.phone}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Check-in Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCheckIn}
                disabled={!selectedMemberId || createCheckIn.isPending}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-xl shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createCheckIn.isPending ? 'Checking in...' : '✅ Check In'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="aspect-square bg-white/60 backdrop-blur-xl rounded-2xl border-2 border-dashed border-emerald-300 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Camera className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--theme-text-secondary, #475569)' }}>QR Scanner</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Position QR code in camera</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-xl shadow-emerald-500/30"
              >
                📷 Start Camera
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Check-ins */}
        <div className="pb-4">
          <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{t('checkIn.recentCheckIns')}</h3>
          
          {checkIns && checkIns.length > 0 ? (
            <div className="space-y-2">
              {checkIns.slice(0, 10).map((checkIn, idx) => (
                <motion.div
                  key={checkIn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-xl rounded-xl border border-white/40"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-emerald-200">
                      <AvatarImage src={checkIn.member?.photo_url || undefined} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {checkIn.member?.first_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                        {checkIn.member
                          ? `${checkIn.member.first_name} ${checkIn.member.last_name}`
                          : 'Unknown'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                        {checkIn.check_in_method === 'qr_code' ? '📷 QR' : '✍️ Manual'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                      {format(new Date(checkIn.check_in_time), 'hh:mm a')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                      {format(new Date(checkIn.check_in_time), 'MMM dd')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 backdrop-blur-xl rounded-2xl border border-white/40" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))' }}>
              <p style={{ color: 'var(--theme-text-muted, #64748b)' }}>No check-ins today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
