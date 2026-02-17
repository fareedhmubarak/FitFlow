import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Wallet, 
  Settings, 
  Bell, 
  Search, 
  Plus, 
  Send, 
  DollarSign, 
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User
} from 'lucide-react';
import bgDesktop from '../images/bg-desktop.webp';
import bgMobile from '../images/bg-mobile.webp';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('Day');
  const [currentDate] = useState(new Date());

  const transactions = [
    { id: 1, name: 'Apple Inc', time: '20:16', amount: -84.00, icon: '🍎', color: 'bg-gray-900' },
    { id: 2, name: 'Figma Inc', time: '15:34', amount: -24.00, icon: '🎨', color: 'bg-purple-500' },
    { id: 3, name: 'Paypal', time: '12:09', amount: 240.00, icon: '💳', color: 'bg-blue-600' },
  ];

  const stats = [
    { label: 'Spent', value: 73, color: 'bg-emerald-400' },
    { label: 'Budget', value: 45, color: 'bg-rose-400' },
  ];

  const categoryData = [
    { label: 'Marketing', value: 42, color: 'bg-rose-400' },
    { label: 'Office', value: 28, color: 'bg-amber-400' },
    { label: 'HR', value: 17, color: 'bg-emerald-400' },
    { label: 'Accounting', value: 13, color: 'bg-blue-400' },
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = [45, 65, 35, 80, 55, 90, 40];

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    return days;
  };

  return (
    <div className="relative min-h-screen p-6 font-sans text-slate-800">
      <div className="fixed inset-0 pointer-events-none">
        <picture>
          <source media="(min-width: 768px)" srcSet={bgDesktop} />
          <img src={bgMobile} alt="" className="w-full h-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-cyan-400/20 to-blue-300/25"></div>
      </div>

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-orange-300/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-200/40 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-cyan-600 font-bold text-xl">P</span>
            </div>
            <span className="text-white font-semibold text-lg">Payrix</span>
          </div>

          <nav className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full p-1">
            {['Overview', 'Analytics', 'Cards', 'Settings'].map((item, idx) => (
              <button
                key={item}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  idx === 0 
                    ? 'bg-white text-slate-800 shadow-md' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {idx === 0 && <LayoutDashboard className="w-4 h-4 inline mr-2" />}
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition">
              <Search className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full pl-1 pr-3 py-1">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                JD
              </div>
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>
        </header>

        {/* Main Title */}
        <div className="mb-6">
          <p className="text-white/70 text-sm mb-1">August 14, 2025 at 9:00 AM</p>
          <h1 className="text-4xl font-light text-white">Overview Panel</h1>
        </div>

        {/* Time Filter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-1 flex gap-1">
            {['Day', 'Week', 'Month'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Account Card */}
          <div className="col-span-3">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 text-sm font-medium">Account Value</span>
                <span className="text-slate-400 text-xs">ID: 8674</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">$87,348.00</div>
              <div className="text-emerald-500 text-sm font-medium mb-6">Active</div>
              
              <div className="flex gap-3">
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 flex flex-col items-center gap-1 transition">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                  <span className="text-xs text-slate-600 font-medium">Pay</span>
                </button>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 flex flex-col items-center gap-1 transition">
                  <Plus className="w-5 h-5 text-slate-600" />
                  <span className="text-xs text-slate-600 font-medium">Add money</span>
                </button>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 flex flex-col items-center gap-1 transition">
                  <Send className="w-5 h-5 text-slate-600" />
                  <span className="text-xs text-slate-600 font-medium">Transfer</span>
                </button>
              </div>
            </div>
          </div>

          {/* Middle/Right Area */}
          <div className="col-span-6">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Spending Overview */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600 text-sm font-medium">Spending Overview</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">$52,396.15</div>
                <div className="text-slate-400 text-xs mb-4">vs last month</div>
                <div className="flex items-end gap-1 h-16">
                  {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${i % 2 === 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{ height: `${h}%`, opacity: 0.3 + (i * 0.06) }}
                    ></div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${s.color}`}></div>
                      <span className="text-slate-500">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Activity */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600 text-sm font-medium">Transaction Activity</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">123</div>
                <div className="text-slate-400 text-xs mb-4">transactions</div>
                <div className="flex items-end justify-between h-16 px-2">
                  {chartData.map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-2 rounded-full ${i % 2 === 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{ height: `${h * 0.6}px` }}
                      ></div>
                      <span className="text-[10px] text-slate-400">{weekDays[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600 text-sm font-medium">Category Breakdown</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">$2,800</div>
                <div className="text-slate-400 text-xs mb-4">spent</div>
                <div className="flex items-end gap-2 h-16">
                  {categoryData.map((cat, i) => (
                    <div
                      key={cat.label}
                      className={`rounded-full ${cat.color}`}
                      style={{ 
                        width: '8px', 
                        height: `${cat.value * 2}px`,
                        opacity: 0.8
                      }}
                    ></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {categoryData.map((cat) => (
                    <div key={cat.label} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${cat.color}`}></div>
                      <span className="text-[10px] text-slate-500">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Pending Transactions */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-slate-600 text-sm font-medium block">Pending Transactions</span>
                    <span className="text-3xl font-bold text-slate-800">5</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"></div>
                </div>
              </div>

              {/* Top Spending Team */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600 text-sm font-medium">Top Spending Team</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-800">73%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar & Transactions */}
          <div className="col-span-3 space-y-4">
            {/* Calendar */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-800">August 16</span>
                <div className="flex gap-1">
                  <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                    <ChevronDown className="w-3 h-3 rotate-90" />
                  </button>
                  <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-slate-400 font-medium">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {generateCalendarDays().map((day) => (
                  <div
                    key={day}
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                      day === 16 
                        ? 'bg-rose-500 text-white shadow-lg' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-800">Transactions</span>
                <MoreHorizontal className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition">
                    <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-lg`}>
                      {t.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.time}</div>
                    </div>
                    <div className={`font-semibold text-sm ${t.amount > 0 ? 'text-emerald-500' : 'text-slate-800'}`}>
                      {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Budget */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Spending Budget</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">$64,000.00</div>
              <div className="text-slate-400 text-xs mb-4">6 this month</div>
              
              <div className="relative h-48 flex items-end justify-center">
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-400 py-2">
                  <span>16k</span>
                  <span>12k</span>
                  <span>8k</span>
                  <span>4k</span>
                  <span>0</span>
                </div>
                <div className="flex-1 flex items-end justify-center gap-4 h-full pr-8">
                  <div className="relative w-12 bg-slate-100 rounded-full h-full overflow-hidden">
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-rose-400 to-rose-300 rounded-full" style={{ height: '60%' }}></div>
                    <div className="absolute top-1/3 w-full border-t-2 border-rose-500 border-dashed"></div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="text-rose-500 font-bold">$12,800</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Bar */}
        <div className="mt-6 flex justify-center">
          <div className="bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl border border-white/50 flex items-center gap-4">
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition">
                Top spend today?
              </button>
              <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition">
                Transactions this week?
              </button>
              <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition">
                Any pending issues?
              </button>
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400">
              <Search className="w-4 h-4" />
              <span className="text-sm">Ask anything or search</span>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;