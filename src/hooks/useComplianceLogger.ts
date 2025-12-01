import { useCallback, useEffect, useState } from 'react';
import { complianceLogger, ComplianceConfig, AnomalyRule, ComplianceReport, AnomalyDetection } from '../lib/complianceLogger';
import { debugLogger } from '../lib/debugLogger';

export function useComplianceLogger() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [complianceConfigs, setComplianceConfigs] = useState<ComplianceConfig[]>([]);
  const [anomalyRules, setAnomalyRules] = useState<AnomalyRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load compliance configurations
  const loadComplianceConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you would fetch all configs for the gym
      const gdprConfig = await complianceLogger.getComplianceConfiguration('GDPR');
      const ccpaConfig = await complianceLogger.getComplianceConfiguration('CCPA');

      const configs = [gdprConfig, ccpaConfig].filter(Boolean) as ComplianceConfig[];
      setComplianceConfigs(configs);
      setIsConfigured(configs.length > 0);
    } catch (error) {
      console.error('Failed to load compliance configurations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize compliance on mount
  useEffect(() => {
    loadComplianceConfigs();
  }, [loadComplianceConfigs]);

  // Configure compliance settings
  const configureCompliance = useCallback(async (config: ComplianceConfig) => {
    try {
      setIsLoading(true);
      const success = await complianceLogger.configureCompliance(config);
      if (success) {
        await loadComplianceConfigs(); // Refresh configs
        debugLogger.logUserInteraction('compliance_configured', {
          complianceType: config.complianceType,
          retentionDays: config.retentionDays
        });
      }
      return success;
    } catch (error) {
      console.error('Failed to configure compliance:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadComplianceConfigs]);

  // Log anomaly detection
  const logAnomaly = useCallback(async (anomaly: AnomalyDetection) => {
    try {
      const success = await complianceLogger.logAnomaly(anomaly);
      if (success) {
        debugLogger.logUserInteraction('anomaly_logged', {
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          confidenceScore: anomaly.confidenceScore
        });
      }
      return success;
    } catch (error) {
      console.error('Failed to log anomaly:', error);
      return false;
    }
  }, []);

  // Create anomaly detection rule
  const createAnomalyRule = useCallback(async (rule: Omit<AnomalyRule, 'ruleName'> & { ruleName?: string }) => {
    try {
      setIsLoading(true);
      const success = await complianceLogger.createAnomalyRule(rule);
      if (success) {
        debugLogger.logUserInteraction('anomaly_rule_created', {
          ruleType: rule.ruleType,
          severityLevel: rule.severityLevel
        });
      }
      return success;
    } catch (error) {
      console.error('Failed to create anomaly rule:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate compliance report
  const generateReport = useCallback(async (report: Omit<ComplianceReport, 'reportData'>) => {
    try {
      setIsLoading(true);
      const reportId = await complianceLogger.generateComplianceReport(report);
      if (reportId) {
        debugLogger.logUserInteraction('compliance_report_generated', {
          reportType: report.reportType,
          reportId,
          complianceStandard: report.complianceStandard
        });
        return reportId;
      }
      return null;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify audit log integrity
  const verifyIntegrity = useCallback(async (date?: Date) => {
    try {
      const isValid = await complianceLogger.verifyLogIntegrity(date);
      debugLogger.logUserInteraction('audit_integrity_verified', {
        date: date?.toISOString(),
        isValid
      });
      return isValid;
    } catch (error) {
      console.error('Failed to verify audit integrity:', error);
      return false;
    }
  }, []);

  // Run anomaly detection
  const runAnomalyDetection = useCallback(async () => {
    try {
      await complianceLogger.runAnomalyDetection();
      debugLogger.logUserInteraction('anomaly_detection_run', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
    }
  }, []);

  // Get compliance status for dashboard
  const getComplianceStatus = useCallback(() => {
    const activeConfigs = complianceConfigs.filter(config =>
      config.retentionDays > 0 && config.encryptionRequired
    );

    return {
      isConfigured: isConfigured,
      totalConfigs: complianceConfigs.length,
      activeConfigs: activeConfigs.length,
      gdprCompliant: complianceConfigs.some(c => c.complianceType === 'GDPR'),
      ccpaCompliant: complianceConfigs.some(c => c.complianceType === 'CCPA'),
      hasRetentionPolicy: activeConfigs.length > 0,
      hasEncryptionEnabled: complianceConfigs.every(c => c.encryptionRequired)
    };
  }, [complianceConfigs, isConfigured]);

  // Setup default compliance configuration
  const setupDefaultCompliance = useCallback(async () => {
    const defaultConfigs = [
      {
        complianceType: 'GDPR' as const,
        retentionDays: 2555, // 7 years
        requiresConsent: true,
        dataSubjectRights: true,
        breachNotificationHours: 72,
        encryptionRequired: true,
        auditFrequency: 'monthly' as const
      },
      {
        complianceType: 'CCPA' as const,
        retentionDays: 1825, // 5 years
        requiresConsent: false,
        dataSubjectRights: true,
        breachNotificationHours: 72,
        encryptionRequired: true,
        auditFrequency: 'quarterly' as const
      }
    ];

    try {
      setIsLoading(true);
      for (const config of defaultConfigs) {
        await configureCompliance(config);
      }
      return true;
    } catch (error) {
      console.error('Failed to setup default compliance:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [configureCompliance]);

  // Setup default anomaly detection rules
  const setupDefaultAnomalyRules = useCallback(async () => {
    const defaultRules = [
      {
        ruleName: 'excessive_login_attempts',
        ruleType: 'threshold' as const,
        conditions: { action: 'login_success' },
        thresholdValue: 50,
        timeWindowMinutes: 1440, // 24 hours
        severityLevel: 'medium' as const,
        description: 'Detect excessive login attempts within 24 hours',
        isActive: true
      },
      {
        ruleName: 'high_error_rate',
        ruleType: 'statistical' as const,
        conditions: { event_type: 'error', success: false },
        thresholdValue: 10,
        timeWindowMinutes: 60, // 1 hour
        severityLevel: 'high' as const,
        description: 'Detect high error rate within 1 hour',
        isActive: true
      },
      {
        ruleName: 'slow_api_responses',
        ruleType: 'threshold' as const,
        conditions: { endpoint: '*' },
        thresholdValue: 5000, // 5 seconds
        timeWindowMinutes: 60,
        severityLevel: 'medium' as const,
        description: 'Detect slow API responses (>5s)',
        isActive: true
      },
      {
        ruleName: 'unusual_data_access',
        ruleType: 'pattern' as const,
        conditions: { resource_type: 'member', action: 'select' },
        thresholdValue: 1000,
        timeWindowMinutes: 1440, // 24 hours
        severityLevel: 'high' as const,
        description: 'Detect unusual data access patterns',
        isActive: true
      }
    ];

    try {
      setIsLoading(true);
      let successCount = 0;
      for (const rule of defaultRules) {
        const success = await createAnomalyRule(rule);
        if (success) successCount++;
      }
      return successCount === defaultRules.length;
    } catch (error) {
      console.error('Failed to setup default anomaly rules:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [createAnomalyRule]);

  // Quick setup for new gyms
  const quickSetup = useCallback(async () => {
    try {
      setIsLoading(true);
      const complianceSetup = await setupDefaultCompliance();
      const rulesSetup = await setupDefaultAnomalyRules();

      const success = complianceSetup && rulesSetup;

      if (success) {
        debugLogger.logUserInteraction('compliance_quick_setup_completed', {
          timestamp: new Date().toISOString(),
          gdprConfigured: true,
          ccpaConfigured: true,
          anomalyRulesConfigured: true
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to complete quick setup:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setupDefaultCompliance, setupDefaultAnomalyRules]);

  return {
    // State
    isConfigured,
    complianceConfigs,
    anomalyRules,
    isLoading,

    // Configuration methods
    configureCompliance,
    createAnomalyRule,
    setupDefaultCompliance,
    setupDefaultAnomalyRules,
    quickSetup,

    // Monitoring methods
    logAnomaly,
    generateReport,
    verifyIntegrity,
    runAnomalyDetection,

    // Utility methods
    loadComplianceConfigs,
    getComplianceStatus
  };
}

// Hook for real-time compliance monitoring
export function useComplianceMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [anomaliesDetected, setAnomaliesDetected] = useState(0);
  const { runAnomalyDetection, verifyIntegrity } = useComplianceLogger();

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    debugLogger.logUserInteraction('compliance_monitoring_started', {
      timestamp: new Date().toISOString()
    });

    // Run checks every 5 minutes
    const interval = setInterval(async () => {
      try {
        await runAnomalyDetection();
        await verifyIntegrity();
        setLastCheck(new Date());
        setAnomaliesDetected(prev => prev + 1);
      } catch (error) {
        console.error('Compliance monitoring error:', error);
      }
    }, 5 * 60 * 1000);

    // Store interval ID for cleanup
    (window as any).__complianceMonitorInterval = interval;
  }, [isMonitoring, runAnomalyDetection, verifyIntegrity]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    const interval = (window as any).__complianceMonitorInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).__complianceMonitorInterval;
    }

    debugLogger.logUserInteraction('compliance_monitoring_stopped', {
      timestamp: new Date().toISOString(),
      totalAnomalies: anomaliesDetected
    });
  }, [isMonitoring, anomaliesDetected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    isMonitoring,
    lastCheck,
    anomaliesDetected,
    startMonitoring,
    stopMonitoring
  };
}

// Hook for compliance reporting
export function useComplianceReporting() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateReport } = useComplianceLogger();

  // Generate common report types
  const generateGDPRReport = useCallback(async (startDate: Date, endDate: Date) => {
    setIsGenerating(true);
    try {
      const reportId = await generateReport({
        reportType: 'access_log',
        complianceStandard: 'GDPR',
        periodStart: startDate,
        periodEnd: endDate,
        status: 'draft'
      });
      return reportId;
    } catch (error) {
      console.error('Failed to generate GDPR report:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [generateReport]);

  const generateSecurityReport = useCallback(async (startDate: Date, endDate: Date) => {
    setIsGenerating(true);
    try {
      const reportId = await generateReport({
        reportType: 'security_incident',
        periodStart: startDate,
        periodEnd: endDate,
        status: 'draft'
      });
      return reportId;
    } catch (error) {
      console.error('Failed to generate security report:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [generateReport]);

  const generateDataProcessingReport = useCallback(async (startDate: Date, endDate: Date) => {
    setIsGenerating(true);
    try {
      const reportId = await generateReport({
        reportType: 'data_processing',
        complianceStandard: 'GDPR',
        periodStart: startDate,
        periodEnd: endDate,
        status: 'draft'
      });
      return reportId;
    } catch (error) {
      console.error('Failed to generate data processing report:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [generateReport]);

  // Generate monthly compliance package
  const generateMonthlyPackage = useCallback(async (year: number, month: number) => {
    setIsGenerating(true);
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      const reports = await Promise.all([
        generateGDPRReport(startDate, endDate),
        generateSecurityReport(startDate, endDate),
        generateDataProcessingReport(startDate, endDate)
      ]);

      debugLogger.logUserInteraction('monthly_compliance_package_generated', {
        year,
        month,
        reportCount: reports.filter(Boolean).length
      });

      return reports.filter(Boolean);
    } catch (error) {
      console.error('Failed to generate monthly package:', error);
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, [generateGDPRReport, generateSecurityReport, generateDataProcessingReport]);

  return {
    reports,
    isGenerating,
    generateGDPRReport,
    generateSecurityReport,
    generateDataProcessingReport,
    generateMonthlyPackage
  };
}