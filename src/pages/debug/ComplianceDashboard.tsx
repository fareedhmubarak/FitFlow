import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  Settings,
  Activity,
  Clock,
  Users,
  Database,
  Lock,
  Unlock,
  Eye,
  Download,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { useComplianceLogger, useComplianceMonitor, useComplianceReporting } from '../../hooks/useComplianceLogger';
import { supabase } from '../../lib/supabase';

interface ComplianceMetric {
  label: string;
  value: string | number;
  status: 'compliant' | 'warning' | 'non-compliant';
  description: string;
  icon: React.ElementType;
}

interface AnomalyItem {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdAt: string;
  status: string;
}

export function ComplianceDashboard() {
  const {
    isConfigured,
    complianceConfigs,
    getComplianceStatus,
    verifyIntegrity,
    quickSetup,
    isLoading: complianceLoading
  } = useComplianceLogger();

  const {
    isMonitoring,
    lastCheck,
    anomaliesDetected,
    startMonitoring,
    stopMonitoring
  } = useComplianceMonitor();

  const {
    generateMonthlyPackage,
    isGenerating
  } = useComplianceReporting();

  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Only available in development or with proper permissions
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Compliance Dashboard Unavailable
          </h1>
          <p className="text-gray-600 mb-4">
            The compliance dashboard is only available in development mode.
          </p>
          <Link
            to="/debug"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Debug Dashboard
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadAnomalies(),
        loadMetrics()
      ]);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadAnomalies = async () => {
    try {
      const { data } = await supabase
        .from('audit_anomalies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setAnomalies(data.map(anomaly => ({
          id: anomaly.id,
          type: anomaly.anomaly_type,
          severity: anomaly.severity,
          description: anomaly.description,
          createdAt: anomaly.created_at,
          status: anomaly.status
        })));
      }
    } catch (error) {
      console.error('Failed to load anomalies:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const status = getComplianceStatus();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent audit log count
      const { count: totalLogs } = await supabase
        .from('gym_audit_logs')
        .select('*', { count: 'exact' })
        .gte('timestamp', yesterday.toISOString());

      // Get recent anomaly count
      const { count: criticalAnomalies } = await supabase
        .from('audit_anomalies')
        .select('*', { count: 'exact' })
        .gte('created_at', yesterday.toISOString())
        .in('severity', ['high', 'critical']);

      // Get compliance configuration status
      const gdprConfig = complianceConfigs.find(c => c.complianceType === 'GDPR');
      const ccpaConfig = complianceConfigs.find(c => c.complianceType === 'CCPA');

      const complianceMetrics: ComplianceMetric[] = [
        {
          label: 'System Status',
          value: isMonitoring ? 'Active' : 'Inactive',
          status: isMonitoring ? 'compliant' : 'warning',
          description: isMonitoring ? 'Real-time monitoring active' : 'Monitoring not started',
          icon: Activity
        },
        {
          label: 'Configuration',
          value: isConfigured ? 'Configured' : 'Not Configured',
          status: isConfigured ? 'compliant' : 'non-compliant',
          description: `${complianceConfigs.length} compliance frameworks configured`,
          icon: Settings
        },
        {
          label: 'GDPR Compliance',
          value: gdprConfig ? 'Enabled' : 'Not Set',
          status: gdprConfig ? 'compliant' : 'warning',
          description: gdprConfig ? `${gdprConfig.retentionDays} days retention policy` : 'Configure GDPR settings',
          icon: Shield
        },
        {
          label: 'CCPA Compliance',
          value: ccpaConfig ? 'Enabled' : 'Not Set',
          status: ccpaConfig ? 'compliant' : 'warning',
          description: ccpaConfig ? `${ccpaConfig.retentionDays} days retention policy` : 'Configure CCPA settings',
          icon: Lock
        },
        {
          label: 'Recent Activity',
          value: totalLogs || 0,
          status: 'compliant',
          description: 'Audit events in last 24 hours',
          icon: Activity
        },
        {
          label: 'Security Alerts',
          value: criticalAnomalies || 0,
          status: (criticalAnomalies || 0) > 0 ? 'non-compliant' : 'compliant',
          description: 'High/critical anomalies in last 24 hours',
          icon: AlertTriangle
        }
      ];

      setMetrics(complianceMetrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleQuickSetup = async () => {
    const success = await quickSetup();
    if (success) {
      await loadDashboardData();
    }
  };

  const handleGenerateReport = async () => {
    const now = new Date();
    const reports = await generateMonthlyPackage(now.getFullYear(), now.getMonth() + 1);
    if (reports.length > 0) {
      alert(`Generated ${reports.length} compliance reports`);
    }
  };

  const handleVerifyIntegrity = async () => {
    const isValid = await verifyIntegrity();
    alert(`Audit log integrity check: ${isValid ? 'PASSED' : 'FAILED'}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'non-compliant':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/debug" className="text-gray-600 hover:text-gray-900">
              ← Back to Debug
            </Link>
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Compliance Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadDashboardData}
              disabled={isRefreshing}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>

            {!isConfigured && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleQuickSetup}
                disabled={complianceLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Quick Setup
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Compliance Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <metric.icon className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </div>
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
              className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                isMonitoring
                  ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              }`}
            >
              {isMonitoring ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span className="text-sm font-medium">{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVerifyIntegrity}
              className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex flex-col items-center gap-2"
            >
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">Verify Integrity</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="p-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Generate Report</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open('/debug', '_blank')}
              className="p-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Debug Logs</span>
            </motion.button>
          </div>

          {lastCheck && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <Clock className="w-4 h-4 inline mr-1" />
                Last monitoring check: {new Date(lastCheck).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-1">
              {['overview', 'anomalies', 'reports', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Compliance Frameworks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {complianceConfigs.map((config, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{config.complianceType}</h4>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Retention: {config.retentionDays} days</p>
                            <p>Encryption: {config.encryptionRequired ? 'Required' : 'Optional'}</p>
                            <p>Audit: {config.auditFrequency}</p>
                          </div>
                        </div>
                      ))}
                      {complianceConfigs.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>No compliance frameworks configured</p>
                          <p className="text-sm">Use Quick Setup to get started</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'anomalies' && (
                <motion.div
                  key="anomalies"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Anomalies</h3>
                  {anomalies.length > 0 ? (
                    <div className="space-y-2">
                      {anomalies.map((anomaly, index) => (
                        <motion.div
                          key={anomaly.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(anomaly.severity)}`}>
                                  {anomaly.severity.toUpperCase()}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{anomaly.type}</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{anomaly.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(anomaly.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              anomaly.status === 'open' ? 'bg-red-100 text-red-800' :
                              anomaly.status === 'resolved' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {anomaly.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No anomalies detected</p>
                      <p className="text-sm">System is operating normally</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Reports</h3>
                  <p className="text-gray-600 mb-4">
                    Generate comprehensive compliance reports for regulatory requirements
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Monthly Report'}
                  </motion.button>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">System Settings</h3>
                    <div className="space-y-4">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Real-time Monitoring</h4>
                          <button
                            onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isMonitoring ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isMonitoring ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">
                          {isMonitoring
                            ? 'Monitoring system activity and detecting anomalies in real-time'
                            : 'Real-time monitoring is disabled'
                          }
                        </p>
                      </div>

                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Data Retention</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Configure retention policies for compliance requirements
                        </p>
                        {complianceConfigs.map((config, index) => (
                          <div key={index} className="text-sm text-gray-700">
                            <span className="font-medium">{config.complianceType}:</span> {config.retentionDays} days
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplianceDashboard;