import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Download, FileText, TrendingUp, Users, MapPin, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';

export default function ReportsDashboard() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string>('revenue');

  // Mock data for charts
  const revenueData = [
    { month: 'Jan', amount: 125000 },
    { month: 'Feb', amount: 145000 },
    { month: 'Mar', amount: 135000 },
    { month: 'Apr', amount: 165000 },
    { month: 'May', amount: 175000 },
    { month: 'Jun', amount: 195000 },
  ];

  const membershipData = [
    { month: 'Jan', new: 15, active: 120, churned: 5 },
    { month: 'Feb', new: 20, active: 135, churned: 3 },
    { month: 'Mar', new: 18, active: 150, churned: 4 },
    { month: 'Apr', new: 25, active: 171, churned: 2 },
    { month: 'May', new: 22, active: 191, churned: 3 },
    { month: 'Jun', new: 30, active: 218, churned: 2 },
  ];

  const reports = [
    { id: 'revenue', name: t('reports.revenue'), icon: TrendingUp },
    { id: 'membership', name: t('reports.membership'), icon: Users },
    { id: 'attendance', name: t('reports.attendance'), icon: MapPin },
    { id: 'classUtilization', name: t('reports.classUtilization'), icon: Dumbbell },
  ];

  return (
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
        <div className="flex items-center justify-between mb-4">
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
            <h1 className="text-lg font-bold text-[#0f172a]">{t('reports.title')}</h1>
          </div>
          <UserProfileDropdown />
        </div>

        {/* Header - Line 2: Report Tabs + Download Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {reports.map((report) => (
              <motion.button
                key={report.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedReport(report.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${
                  selectedReport === report.id
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                    : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
              >
                <report.icon className="w-3.5 h-3.5" />
                <span>{report.name}</span>
              </motion.button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-[#1e293b]"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-2 scrollbar-hide relative z-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {selectedReport === 'revenue' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pb-4"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-emerald-200/50 shadow-sm">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">
                  ₹{revenueData.reduce((sum, d) => sum + d.amount, 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-emerald-600 font-semibold mt-2">
                  +18% vs last period
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-400/20 to-cyan-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-blue-200/50 shadow-sm">
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Average Monthly</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">
                  ₹{Math.round(
                    revenueData.reduce((sum, d) => sum + d.amount, 0) / revenueData.length
                  ).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-2">
                  Per month
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-400/20 to-pink-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-purple-200/50 shadow-sm">
                <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Growth Rate</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">
                  +12%
                </p>
                <p className="text-xs text-purple-600 font-semibold mt-2">
                  Month over month
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[24px] p-6 shadow-lg border border-white/50">
              <h3 className="text-sm font-bold text-[#0f172a] mb-4">Revenue Trend</h3>
              <div className="flex items-end justify-between h-48 gap-3">
                {revenueData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.amount / 200000) * 100}%` }}
                      transition={{ delay: index * 0.1, type: 'spring' }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-cyan-500 rounded-t-xl transition-all hover:from-emerald-600 hover:to-cyan-600 cursor-pointer shadow-md"
                    ></motion.div>
                    <p className="text-xs font-bold text-[#64748b]">
                      {data.month}
                    </p>
                    <p className="text-[10px] text-[#94a3b8] font-semibold">
                      ₹{(data.amount / 1000).toFixed(0)}k
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {selectedReport === 'membership' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pb-4"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-400/20 to-indigo-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-blue-200/50 shadow-sm">
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">New Members</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">
                  {membershipData.reduce((sum, d) => sum + d.new, 0)}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-2">Last 6 months</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-emerald-200/50 shadow-sm">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Active Members</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">
                  {membershipData[membershipData.length - 1].active}
                </p>
                <p className="text-xs text-emerald-600 font-semibold mt-2">Current</p>
              </div>
              <div className="bg-gradient-to-br from-red-400/20 to-pink-400/20 backdrop-blur-xl rounded-[20px] p-4 border border-red-200/50 shadow-sm">
                <p className="text-xs text-red-700 font-bold uppercase tracking-wider">Churn Rate</p>
                <p className="text-3xl font-bold text-[#0f172a] mt-1">2.1%</p>
                <p className="text-xs text-red-600 font-semibold mt-2">Monthly average</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/40 backdrop-blur-xl rounded-[24px] overflow-hidden shadow-lg border border-white/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                        New
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                        Active
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                        Churned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/30">
                    {membershipData.map((data, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#0f172a]">
                          {data.month}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-600 font-bold">
                          +{data.new}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[#0f172a] font-semibold">
                          {data.active}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">
                          -{data.churned}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {selectedReport === 'attendance' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-12 text-center shadow-lg border border-white/50">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#0f172a] mb-2">
                Attendance Report
              </h3>
              <p className="text-[#64748b] text-sm">
                Track daily and monthly attendance patterns
              </p>
            </div>
          </motion.div>
        )}

        {selectedReport === 'classUtilization' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-12 text-center shadow-lg border border-white/50">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Dumbbell className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#0f172a] mb-2">
                Class Utilization
              </h3>
              <p className="text-[#64748b] text-sm">
                Analyze class booking rates and capacity usage
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
