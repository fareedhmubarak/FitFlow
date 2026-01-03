import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase, getCurrentGymId } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { GymLoader } from '@/components/ui/GymLoader';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday as checkIsToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import MemberActionDialog from "../../components/members/MemberActionDialog";

// Type for member data expected by MemberActionDialog
interface MemberDataForDialog {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  photo_url?: string | null;
  membership_plan: string;
  plan_amount: number;
  status: 'active' | 'inactive';
  joining_date: string;
  membership_end_date?: string | null;
  next_payment_due_date?: string | null;
}

// Calendar types (inline to avoid import issues)
type CalendarPaymentStatus =
  | "paid"
  | "upcoming"
  | "due_today"
  | "overdue"
  | "overdue_multiple";

interface CalendarDayData {
  due_date: string;
  member_id: string;
  member_name: string;
  member_photo: string | null;
  amount_due: number;
  payment_status: CalendarPaymentStatus;
  days_overdue: number;
}

interface CalendarDataByDate {
  [date: string]: CalendarDayData[];
}

export default function PaymentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberDataForDialog | null>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch calendar data using our database function
  const { data: calendarData, isLoading } = useQuery<CalendarDayData[]>({
    queryKey: ["calendarData", year, month],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error("No gym ID");

      const { data, error } = await supabase.rpc("get_calendar_data", {
        p_gym_id: gymId,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;
      return data as CalendarDayData[];
    },
  });

  // Group calendar data by date
  const dataByDate: CalendarDataByDate = {};
  calendarData?.forEach((item) => {
    if (!dataByDate[item.due_date]) {
      dataByDate[item.due_date] = [];
    }
    dataByDate[item.due_date].push(item);
  });

  // Calculate enhanced calendar stats
  const monthStats = {
    total: calendarData?.length || 0,
    paid: calendarData?.filter((d) => d.payment_status === "paid").length || 0,
    dueToday:
      calendarData?.filter((d) => d.payment_status === "due_today").length || 0,
    overdue:
      calendarData?.filter((d) => d.payment_status.includes("overdue"))
        .length || 0,
    upcoming:
      calendarData?.filter((d) => d.payment_status === "upcoming").length || 0,
    totalAmount:
      calendarData?.reduce((sum, d) => sum + Number(d.amount_due), 0) || 0,
    paidAmount:
      calendarData
        ?.filter((d) => d.payment_status === "paid")
        .reduce((sum, d) => sum + Number(d.amount_due), 0) || 0,
    pendingAmount:
      calendarData
        ?.filter((d) => d.payment_status !== "paid")
        .reduce((sum, d) => sum + Number(d.amount_due), 0) || 0,
    collections: calendarData?.filter((d) => d.payment_status === "paid").length || 0,
    target: calendarData?.length || 0,
  };

  // Generate full month grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Handle month navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Handle member card click - fetch full member data and open action dialog
  const handleMemberClick = async (memberId: string) => {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) return;

      // Fetch full member data
      const { data: member, error: memberError } = await supabase
        .from("gym_members")
        .select("*")
        .eq("id", memberId)
        .eq("gym_id", gymId)
        .single();

      if (memberError) throw memberError;

      // Transform to the format needed by MemberActionDialog
      const memberForDialog: MemberDataForDialog = {
        id: member.id,
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
        gender: member.gender,
        photo_url: member.photo_url,
        membership_plan: member.membership_plan || 'Unknown',
        plan_amount: member.plan_amount || 0,
        status: member.status || 'active',
        joining_date: member.joining_date,
        membership_end_date: member.membership_end_date,
        next_payment_due_date: member.next_payment_due_date,
      };

      setSelectedMember(memberForDialog);
      setIsMemberDialogOpen(true);
    } catch (err) {
      console.error("Error fetching member:", err);
    }
  };

  // Handle dialog close and refresh data
  const handleMemberDialogClose = (open: boolean) => {
    setIsMemberDialogOpen(open);
    if (!open) {
      setSelectedMember(null);
      // Refresh calendar data after any changes
      queryClient.invalidateQueries({ queryKey: ["calendarData", year, month] });
    }
  };

  if (isLoading) {
    return <GymLoader message="Loading calendar..." />;
  }

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-[#E0F2FE] flex flex-col overflow-hidden" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Safe Area Background Extension - Top Only */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-[#E0F2FE] z-[200]" />

      {/* Background Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none"
      />

      {/* Header - Line 1: Logo | Title | Profile */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pb-3 relative z-50"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
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
            <h1 className="text-lg font-bold text-[#1A1A1A]">
              Payment Calendar
            </h1>
          </div>
          <UserProfileDropdown />
        </div>

        {/* Header - Line 2: Premium Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-4 gap-2"
        >
          {/* Members Card */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-2.5 border border-white/40 shadow-sm">
            <div className="flex flex-col items-center">
              <Users className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="text-xl font-bold text-[#1A1A1A] leading-none">{monthStats.total}</div>
              <div className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">Members</div>
            </div>
          </div>

          {/* Collected Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-xl rounded-2xl p-2.5 border border-blue-200/40 shadow-sm">
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mb-1" />
              <div className="text-lg font-bold text-blue-600 leading-none">₹{Math.floor(monthStats.paidAmount / 1000)}k</div>
              <div className="text-[8px] font-semibold text-blue-700 uppercase tracking-wide mt-0.5">Collected</div>
            </div>
          </div>

          {/* Pending Card */}
          <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 backdrop-blur-xl rounded-2xl p-2.5 border border-rose-200/40 shadow-sm">
            <div className="flex flex-col items-center">
              <Clock className="w-4 h-4 text-rose-600 mb-1" />
              <div className="text-lg font-bold text-rose-600 leading-none">₹{Math.floor(monthStats.pendingAmount / 1000)}k</div>
              <div className="text-[8px] font-semibold text-rose-700 uppercase tracking-wide mt-0.5">Pending</div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-xl rounded-2xl p-2.5 border border-purple-200/40 shadow-sm">
            <div className="flex flex-col items-center">
              <div className="relative w-8 h-8 mb-1">
                <svg className="transform -rotate-90 w-8 h-8">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-purple-200"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 12}`}
                    strokeDashoffset={`${2 * Math.PI * 12 * (1 - (monthStats.collections / monthStats.total))}`}
                    className="text-purple-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-purple-600">
                    {Math.round((monthStats.collections / monthStats.total) * 100)}%
                  </span>
                </div>
              </div>
              <div className="text-[8px] font-semibold text-purple-700 uppercase tracking-wide">Progress</div>
            </div>
          </div>
        </motion.div>
      </motion.header>

      {/* Calendar Section - Full Month Always Visible */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0 min-h-0">
        {/* Calendar Header with Month Navigation - Ultra Compact */}
        <div className="flex-shrink-0 px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToPreviousMonth}
              className="w-7 h-7 rounded-full bg-white/80 shadow-sm flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-[#1A1A1A]" />
            </motion.button>

            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              {format(currentDate, "MMM yyyy")}
            </h2>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToNextMonth}
              className="w-7 h-7 rounded-full bg-white/80 shadow-sm flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-[#1A1A1A]" />
            </motion.button>
          </div>

          {/* Day Labels - Tiny */}
          <div className="grid grid-cols-7 gap-0.5">
            {["S", "M", "T", "W", "T", "F", "S"].map(
              (day, idx) => (
                <div
                  key={idx}
                  className="text-center text-[9px] font-medium text-gray-500"
                >
                  {day}
                </div>
              )
            )}
          </div>
        </div>

        {/* Calendar Grid - Full Height, No Scroll, Complete Month */}
        <div className="flex-1 px-4 pb-4 overflow-hidden min-h-0">
          <div className="h-full bg-white/40 backdrop-blur-xl rounded-3xl p-2 border border-white/40 shadow-sm grid grid-rows-6 gap-1">
            {/* Create calendar weeks - always 6 rows to fit full month */}
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1 min-h-0">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const cellIndex = weekIndex * 7 + dayIndex;
                  const dayOffset = monthStart.getDay();

                  // Empty cells before month starts
                  if (cellIndex < dayOffset) {
                    return <div key={cellIndex} className="rounded-xl aspect-square"></div>;
                  }

                  // Days within the month
                  const dayIndexInMonth = cellIndex - dayOffset;
                  if (dayIndexInMonth >= calendarDays.length) {
                    return <div key={cellIndex} className="rounded-xl aspect-square"></div>;
                  }

                  const day = calendarDays[dayIndexInMonth];
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayData = dataByDate[dateStr] || [];

                  return (
                    <BeautifulCalendarDay
                      key={dateStr}
                      date={day}
                      data={dayData}
                      isCurrentMonth={isSameMonth(day, currentDate)}
                      onClick={() => dayData.length > 0 && setSelectedDate(dateStr)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Date Modal */}
      {selectedDate && dataByDate[selectedDate] && (
        <DateDetailsModal
          date={selectedDate}
          data={dataByDate[selectedDate]}
          onClose={() => setSelectedDate(null)}
          onMemberClick={handleMemberClick}
        />
      )}

      {/* Member Action Dialog */}
      <MemberActionDialog
        member={selectedMember}
        open={isMemberDialogOpen}
        onOpenChange={handleMemberDialogClose}
      />
    </div>
  );
}


function BeautifulCalendarDay({
  date,
  data,
  isCurrentMonth,
  onClick,
}: {
  date: Date;
  data: CalendarDayData[];
  isCurrentMonth: boolean;
  onClick: () => void;
}) {
  const dateNum = format(date, "d");
  const isToday = checkIsToday(date);
  const hasData = data.length > 0;

  // Determine the dominant status and border color
  const getStatusColor = () => {
    if (data.some(m => m.payment_status.includes("overdue"))) {
      return "border-l-[#DC2626]";
    }
    if (data.some(m => m.payment_status === "due_today")) {
      return "border-l-[#D97706]";
    }
    if (data.every(m => m.payment_status === "paid")) {
      return "border-l-[#059669]";
    }
    return "border-l-[#0284C7]";
  };

  // Calculate status for each member
  const membersWithStatus = data.map(member => ({
    ...member,
    statusBg: member.payment_status.includes("overdue") ? "bg-rose-100" :
              member.payment_status === "due_today" ? "bg-amber-100" :
              member.payment_status === "paid" ? "bg-emerald-100" : "bg-blue-100",
    statusText: member.payment_status.includes("overdue") ? "text-rose-700" :
                member.payment_status === "due_today" ? "text-amber-700" :
                member.payment_status === "paid" ? "text-emerald-700" : "text-blue-700",
  }));

  const totalAmount = data.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const statusBorder = hasData ? getStatusColor() : "";

  return (
    <motion.div
      whileHover={hasData ? { scale: 0.98 } : {}}
      whileTap={hasData ? { scale: 0.95 } : {}}
      onClick={hasData ? onClick : undefined}
      className={`h-full w-full rounded-lg transition-all duration-200 cursor-pointer relative overflow-hidden group
        ${!isCurrentMonth ? "opacity-30" : ""}
        ${hasData ? `bg-white/80 border-l-4 ${statusBorder} shadow-md hover:shadow-lg` : 'bg-transparent hover:bg-white/20'}
        ${isToday ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent' : ''}
      `}
    >
      {/* Date Number - Centered at top */}
      <div className={`absolute top-1 left-0 right-0 text-center text-xs font-bold ${hasData ? 'text-gray-700' : 'text-gray-400'}`}>
        {dateNum}
      </div>

      {/* Today Indicator */}
      {isToday && (
        <div className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
      )}

      {/* Member Items - Horizontal Layout */}
      {hasData && (
        <div className="flex flex-col h-full pt-6 pb-2 px-1 gap-1">
          {/* Show first 2-3 members */}
          {membersWithStatus.slice(0, 3).map((member) => (
              <div
                key={member.member_id}
                className={`flex items-center gap-1.5 px-1 py-0.5 rounded ${member.statusBg}`}
              >
              {/* Small Member Image */}
              <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                {member.member_photo ? (
                  <img
                    src={member.member_photo}
                    alt={member.member_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[6px] font-bold">${member.member_name.charAt(0)}</div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[6px] font-bold">
                    {member.member_name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Member Name */}
              <div className={`text-[7px] font-medium truncate flex-1 ${member.statusText}`}>
                {member.member_name.split(' ')[0]}
              </div>
            </div>
          ))}

          {/* Plus count for more members */}
          {data.length > 3 && (
            <div className="flex items-center justify-center gap-1 px-1 py-0.5 bg-purple-50 border border-purple-200 rounded">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center">
                <span className="text-[6px] text-white font-bold">+{data.length - 3}</span>
              </div>
              <span className="text-[7px] text-purple-600 font-medium">more</span>
            </div>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {hasData && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-lg">
          <div className="font-semibold">{data.length} member{data.length !== 1 ? 's' : ''}</div>
          <div className="text-gray-300">₹{totalAmount.toLocaleString('en-IN')}</div>
        </div>
      )}
    </motion.div>
  );
}


function DateDetailsModal({
  date,
  data,
  onClose,
  onMemberClick,
}: {
  date: string;
  data: CalendarDayData[];
  onClose: () => void;
  onMemberClick: (memberId: string) => void;
}) {
  const formattedDate = format(new Date(date), "EEEE, MMMM d, yyyy");
  const totalAmount = data.reduce((sum, d) => sum + Number(d.amount_due), 0);

  // Group by status
  const groupedData = {
    overdue: data.filter((d) => d.payment_status.includes("overdue")),
    dueToday: data.filter((d) => d.payment_status === "due_today"),
    upcoming: data.filter((d) => d.payment_status === "upcoming"),
    paid: data.filter((d) => d.payment_status === "paid"),
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white/80 backdrop-blur-3xl rounded-[32px] w-full max-w-[420px] max-h-[90vh] overflow-hidden shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] border border-white/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Hero Amount */}
          <div className="bg-gradient-to-br from-[#B8F3D8] via-[#A8E6E3] to-[#E8F4F9] p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-[6px_6px_12px_rgba(163,177,198,0.3),-6px_-6px_12px_rgba(255,255,255,0.8)] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <p className="text-sm text-[#666666] font-semibold mb-1">
              {formattedDate}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-semibold text-[#1A1A1A] mr-1">₹</span>
              <span className="text-5xl font-light text-[#1A1A1A] tracking-tight">
                {Math.floor(totalAmount).toLocaleString("en-IN")}
              </span>
              <span className="text-2xl font-light text-[#1A1A1A] opacity-60">
                .{(totalAmount % 100).toFixed(0).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full w-fit">
              <Users className="w-4 h-4 text-[#1A1A1A]" />
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {data.length} {data.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex gap-3 p-4 pt-0">
            {groupedData.paid.length > 0 && (
              <div className="flex-1 h-16 rounded-[20px] bg-gradient-to-br from-[#C8F8DC] to-[#B8F3D8] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                <p className="text-xs font-bold text-[#059669]">PAID ({groupedData.paid.length})</p>
              </div>
            )}
            {groupedData.overdue.length > 0 && (
              <div className="flex-1 h-16 rounded-[20px] bg-gradient-to-br from-[#FFD4C8] to-[#FFB8A8] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                <p className="text-xs font-bold text-[#DC2626]">OVERDUE ({groupedData.overdue.length})</p>
              </div>
            )}
            {groupedData.dueToday.length > 0 && (
              <div className="flex-1 h-16 rounded-[20px] bg-gradient-to-br from-[#FFF4CC] to-[#F8E89A] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                <p className="text-xs font-bold text-[#D97706]">DUE ({groupedData.dueToday.length})</p>
              </div>
            )}
          </div>

          {/* Member List */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-240px)] space-y-3">
            {/* Overdue */}
            {groupedData.overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB8A8] to-[#FFD4C8] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#DC2626] uppercase tracking-wide">
                    Overdue
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedData.overdue.map((member, index) => (
                    <CompactMemberCard
                      key={member.member_id}
                      member={member}
                      index={index}
                      variant="overdue"
                      onClick={() => onMemberClick(member.member_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {groupedData.dueToday.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F8E89A] to-[#FFF4CC] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#D97706] uppercase tracking-wide">
                    Due Today
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedData.dueToday.map((member, index) => (
                    <CompactMemberCard
                      key={member.member_id}
                      member={member}
                      index={index}
                      variant="dueToday"
                      onClick={() => onMemberClick(member.member_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {groupedData.upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A8E6E3] to-[#89CFF0] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#0284C7]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0284C7] uppercase tracking-wide">
                    Upcoming
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedData.upcoming.map((member, index) => (
                    <CompactMemberCard
                      key={member.member_id}
                      member={member}
                      index={index}
                      variant="upcoming"
                      onClick={() => onMemberClick(member.member_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paid */}
            {groupedData.paid.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B8F3D8] to-[#C8F8DC] shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#059669] uppercase tracking-wide">
                    Paid
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedData.paid.map((member, index) => (
                    <CompactMemberCard
                      key={member.member_id}
                      member={member}
                      index={index}
                      variant="paid"
                      onClick={() => onMemberClick(member.member_id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CompactMemberCard({
  member,
  index,
  variant,
  onClick,
}: {
  member: CalendarDayData;
  index: number;
  variant: "paid" | "overdue" | "dueToday" | "upcoming";
  onClick: () => void;
}) {
  const statusConfig = {
    paid: {
      gradient: "from-[#B8F3D8] to-[#C8F8DC]",
      icon: CheckCircle2,
      iconColor: "text-[#059669]",
      textColor: "text-[#059669]",
    },
    overdue: {
      gradient: "from-[#FFB8A8] to-[#FFD4C8]",
      icon: AlertCircle,
      iconColor: "text-[#DC2626]",
      textColor: "text-[#DC2626]",
    },
    dueToday: {
      gradient: "from-[#F8E89A] to-[#FFF4CC]",
      icon: Clock,
      iconColor: "text-[#D97706]",
      textColor: "text-[#D97706]",
    },
    upcoming: {
      gradient: "from-[#A8E6E3] to-[#89CFF0]",
      icon: Users,
      iconColor: "text-[#0284C7]",
      textColor: "text-[#0284C7]",
    },
  };

  const config = statusConfig[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className={`bg-gradient-to-r ${config.gradient} rounded-[16px] p-3 shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] cursor-pointer active:scale-[0.98] transition-transform`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-white shadow-[4px_4px_8px_rgba(163,177,198,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center flex-shrink-0">
          {member.member_photo ? (
            <img
              src={member.member_photo}
              alt={member.member_name}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-[#B8F3D8] to-[#A8E6E3] rounded-full flex items-center justify-center text-white text-sm font-bold">${member.member_name.charAt(0)}</div>`;
                }
              }}
            />
          ) : (
            <span className="text-sm font-bold text-[#1A1A1A]">
              {member.member_name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#1A1A1A] truncate">
            {member.member_name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <Icon className={`w-3 h-3 ${config.iconColor}`} />
            <span className={`text-xs ${config.textColor}`}>
              {variant === "overdue" && `${member.days_overdue} days late`}
              {variant === "dueToday" && "Due today"}
              {variant === "upcoming" && "Upcoming"}
              {variant === "paid" && "Paid"}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-base font-semibold text-[#1A1A1A]">
            ₹{Number(member.amount_due).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
