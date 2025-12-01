import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { debugLogger } from '../../lib/debugLogger';
import {
  Activity,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Server,
  Filter,
  Download,
  RefreshCw,
  Trash2,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface DebugStats {
  activeSessions: number;
  apiCalls24h: number;
  errorRate: number;
  avgResponseTime: number;
  totalLogs: number;
  errorCount: number;
}

interface LogEntry {
  id: string;
  event_type: string;
  event_category: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  user_id?: string;
  session_id: string;
  gym_id: string;
}

interface ApiLogEntry {
  id: string;
  method: string;
  endpoint: string;
  request_body?: any;
  response_status: number;
  response_body?: any;
  duration_ms: number;
  timestamp: string;
  user_id?: string;
  session_id: string;
  gym_id: string;
}

interface SessionEntry {
  id: string;
  user_id?: string;
  start_time: string;
  last_activity: string;
  end_time?: string;
  is_active: boolean;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
  gym_id: string;
}

export function DebugDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeLogs, setRealTimeLogs] = useState<LogEntry[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [stats, setStats] = useState<DebugStats>({
    activeSessions: 0,
    apiCalls24h: 0,
    errorRate: 0,
    avgResponseTime: 0,
    totalLogs: 0,
    errorCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('24h');

  // Only available in development
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
          <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Debug Dashboard Unavailable
          </h1>
          <p className="text-gray-600 mb-4">
            The debug dashboard is only available in development mode.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to App
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadInitialData();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription
    };
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentLogs(),
        loadApiLogs(),
        loadSessions()
      ]);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count active sessions
      const { count: activeSessions } = await supabase
        .from('gym_sessions')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Count API calls in last 24h
      const { count: apiCalls24h } = await supabase
        .from('gym_api_logs')
        .select('*', { count: 'exact' })
        .gte('timestamp', yesterday.toISOString());

      // Count errors
      const { count: errorCount } = await supabase
        .from('gym_audit_logs')
        .select('*', { count: 'exact' })
        .eq('success', false)
        .gte('timestamp', yesterday.toISOString());

      // Get average response time
      const { data: responseTimes } = await supabase
        .from('gym_api_logs')
        .select('duration_ms')
        .gte('timestamp', yesterday.toISOString())
        .limit(1000);

      const avgResponseTime = responseTimes?.length > 0 ?
        responseTimes.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / responseTimes.length : 0;

      setStats({
        activeSessions: activeSessions || 0,
        apiCalls24h: apiCalls24h || 0,
        errorRate: apiCalls24h > 0 ? ((errorCount || 0) / apiCalls24h) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        totalLogs: apiCalls24h + (errorCount || 0),
        errorCount: errorCount || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const { data } = await supabase
        .from('gym_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      setRealTimeLogs(data || []);
    } catch (error) {
      console.error('Failed to load recent logs:', error);
    }
  };

  const loadApiLogs = async () => {
    try {
      const { data } = await supabase
        .from('gym_api_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      setApiLogs(data || []);
    } catch (error) {
      console.error('Failed to load API logs:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await supabase
        .from('gym_sessions')
        .select('*')
        .order('last_activity', { ascending: false })
        .limit(20);

      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to new audit logs
    const channel = supabase
      .channel('debug-dashboard')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gym_audit_logs',
        filter: `timestamp=gt.${new Date(Date.now() - 60000).toISOString()}`
      }, (payload) => {
        setRealTimeLogs(prev => [payload.new as LogEntry, ...prev].slice(0, 50));
        loadStats(); // Refresh stats when new logs arrive
      })
      .subscribe();
  };

  const handleRefresh = () => {
    loadInitialData();
  };

  const handleExportLogs = async () => {
    try {
      const { data } = await supabase
        .from('gym_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      const csv = convertToCSV(data || []);
      downloadCSV(csv, `debug_logs_${new Date().toISOString()}.csv`);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = realTimeLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.event_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = {
    emerald: '#10b981',
    red: '#ef4444',
    amber: '#f59e0b',
    blue: '#3b82f6'
  };

  const eventTypeData = [
    { name: 'User Interaction', value: realTimeLogs.filter(l => l.event_type === 'user_interaction').length, color: COLORS.emerald },
    { name: 'API Call', value: realTimeLogs.filter(l => l.event_type === 'api_call').length, color: COLORS.blue },
    { name: 'System Event', value: realTimeLogs.filter(l => l.event_type === 'system_event').length, color: COLORS.amber },
    { name: 'Error', value: realTimeLogs.filter(l => l.event_type === 'error').length, color: COLORS.red }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              ← Back to App
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Debug Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportLogs}
              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  Active Sessions
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Server className="w-4 h-4" />
                  API Calls (24h)
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.apiCalls24h.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingDown className="w-4 h-4" />
                  Error Rate
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.errorRate.toFixed(1)}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Avg Response Time
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}ms</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4" />
                  Total Logs
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLogs.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4" />
                  Errors
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.errorCount}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold mb-4">Event Type Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={eventTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold mb-4">API Response Times</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={apiLogs.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="endpoint" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="duration_ms" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-1">
              {['overview', 'audit-logs', 'api-calls', 'sessions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Overview Stats
                    </h3>
                    <p className="text-gray-600">
                      Detailed statistics are shown in the charts above
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'audit-logs' && (
                <motion.div
                  key="audit-logs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Audit Logs</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Success</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <AnimatePresence>
                          {filteredLogs.map((log, index) => (
                            <motion.tr
                              key={log.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  log.event_type === 'error' ? 'bg-red-100 text-red-800' :
                                  log.event_type === 'api_call' ? 'bg-blue-100 text-blue-800' :
                                  log.event_type === 'user_interaction' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.event_type}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{log.action}</td>
                              <td className="px-4 py-2 text-sm">
                                {log.success ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-red-600">✗</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'api-calls' && (
                <motion.div
                  key="api-calls"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent API Calls</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {apiLogs.slice(0, 20).map((log, index) => (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                log.method === 'POST' ? 'bg-green-100 text-green-800' :
                                log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.method}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.endpoint}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                log.response_status >= 200 && log.response_status < 300 ? 'bg-green-100 text-green-800' :
                                log.response_status >= 400 ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {log.response_status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.duration_ms}ms</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'sessions' && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sessions.map((session, index) => (
                          <motion.tr
                            key={session.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                              {session.id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(session.start_time).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(session.last_activity).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {session.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default DebugDashboard;