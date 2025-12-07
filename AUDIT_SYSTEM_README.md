# Gym/FitFlow Enterprise Audit & Debug System

## 🏗️ Overview

This comprehensive audit and debug system provides enterprise-grade logging, monitoring, and compliance capabilities for the Gym/FitFlow application. It tracks every user interaction, API call, database operation, and system event while ensuring data privacy, security, and regulatory compliance.

## 🎯 Key Features

### 📊 **Comprehensive Logging**
- **User Activity Tracking**: Every click, form submission, and navigation event
- **API Call Monitoring**: Complete request/response logging with performance metrics
- **Database Operation Auditing**: All Supabase queries tracked and analyzed
- **Error Handling**: Global error capture with detailed context and stack traces
- **Session Management**: Complete user session lifecycle tracking

### 🔒 **Enterprise Security**
- **Multi-Tenant Isolation**: Gym-based data segregation with Row Level Security
- **Data Sanitization**: Automatic PII redaction (passwords, tokens, emails, etc.)
- **Access Control**: Developer-only access in production environments
- **Integrity Verification**: Log tampering detection and prevention
- **Encryption**: Configurable encryption requirements for compliance

### 📋 **Regulatory Compliance**
- **GDPR Ready**: 7-year retention, consent management, data subject rights
- **CCPA Compliant**: 5-year retention, privacy rights, do-not-sell capabilities
- **SOX Support**: Financial audit trail and internal controls
- **Automated Reporting**: One-click compliance report generation
- **Configurable Policies**: Custom retention and notification settings

### 🤖 **AI-Powered Monitoring**
- **Anomaly Detection**: Automatic pattern recognition and threat identification
- **Real-Time Alerts**: Multi-channel notifications (email, Slack, webhooks)
- **Performance Monitoring**: API response time and database performance tracking
- **Security Intelligence**: Suspicious activity detection and prevention

## 📁 System Architecture

### Database Schema

#### Core Tables
```sql
gym_audit_logs     -- All user and system events
gym_api_logs       -- HTTP request/response logging
gym_sessions       -- User session tracking
```

#### Enterprise Tables
```sql
audit_log_integrity           -- Daily checksum verification
compliance_configurations     -- GDPR/CCPA/SOX settings
audit_anomalies              -- Security incidents and patterns
anomaly_detection_rules      -- Custom detection rules
compliance_reports           -- Generated compliance reports
audit_notifications          -- Alert configurations
audit_backup_tracker         -- Backup and archival tracking
```

### Frontend Components

#### Core Libraries
- **`debugLogger.ts`**: Singleton logger with session management
- **`apiLogger.ts`**: API call interception and logging
- **`complianceLogger.ts`**: Enterprise compliance management
- **`productionAuditLogger.ts`**: Production-grade audit system

#### React Hooks
- **`useDebugLogger.ts`**: Component-level debugging capabilities
- **`useComplianceLogger.ts`**: Compliance management and reporting
- **`useComplianceMonitor.ts`**: Real-time compliance monitoring
- **`useComplianceReporting.ts`**: Automated report generation

#### UI Components
- **`DebugDashboard.tsx`**: Real-time monitoring and analysis interface
- **`ComplianceDashboard.tsx`**: Enterprise compliance management
- **`ErrorBoundary.tsx`**: Global error handling and logging
- **`DebugInitializer.tsx`**: Application-level system setup

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run the setup script (automates everything)
node scripts/setup-audit-system.js

# Or run migrations manually
supabase db push
```

### 2. Development Environment

```bash
npm install
npm run dev
```

The debug system automatically activates in development mode.

### 3. Access Dashboards

- **Debug Dashboard**: `http://localhost:5173/debug`
- **Compliance Dashboard**: `http://localhost:5173/debug/compliance`

## 📱 Usage Examples

### Basic Logging

```typescript
import { debugLogger } from '@/lib/debugLogger';

// User interactions
debugLogger.logUserInteraction('button_clicked', {
  buttonId: 'save-member',
  component: 'MemberForm'
});

// Form submissions
debugLogger.logFormSubmit('member_registration', formData, {
  formId: 'member-form'
});

// Navigation
debugLogger.logNavigation('/members', {
  method: 'sidebar-click'
});

// Errors
debugLogger.logError(new Error('API call failed'), {
  endpoint: '/api/members',
  userId: currentUserId
});

// Performance
debugLogger.logPerformance('database_query', duration, {
  query: 'SELECT * FROM members',
  recordCount: 150
});
```

### React Hook Integration

```typescript
import { useDebugLogger } from '@/hooks/useDebugLogger';

function MemberForm() {
  const { logInteraction, logFormSubmit, logError } = useDebugLogger('MemberForm');

  const handleSubmit = (data) => {
    try {
      logFormSubmit('member_create', data);
      // ... form submission logic
    } catch (error) {
      logError(error, { action: 'member_creation' });
    }
  };

  return (
    <button onClick={() => logInteraction('cancel_clicked')}>
      Cancel
    </button>
  );
}
```

### Compliance Management

```typescript
import { complianceLogger, useComplianceLogger } from '@/lib/complianceLogger';

// Configure compliance
await complianceLogger.configureCompliance({
  complianceType: 'GDPR',
  retentionDays: 2555,
  requiresConsent: true,
  encryptionRequired: true
});

// Log anomalies
await complianceLogger.logAnomaly({
  anomalyType: 'suspicious_login',
  severity: 'high',
  confidenceScore: 0.95,
  description: 'Multiple failed login attempts from unusual location',
  affectedUserId: userId
});

// Generate reports
const reportId = await complianceLogger.generateComplianceReport({
  reportType: 'access_log',
  complianceStandard: 'GDPR',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
  status: 'draft'
});
```

### React Compliance Hook

```typescript
import { useComplianceLogger } from '@/hooks/useComplianceLogger';

function ComplianceManager() {
  const {
    isConfigured,
    complianceConfigs,
    generateReport,
    runAnomalyDetection,
    quickSetup
  } = useComplianceLogger();

  const handleQuickSetup = async () => {
    const success = await quickSetup();
    if (success) {
      console.log('Compliance configured successfully');
    }
  };

  const generateMonthlyReport = async () => {
    const reportId = await generateReport({
      reportType: 'security_incident',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      status: 'draft'
    });
  };

  return (
    <div>
      <p>Compliance Status: {isConfigured ? 'Configured' : 'Not Configured'}</p>
      <button onClick={handleQuickSetup}>Quick Setup</button>
      <button onClick={generateMonthlyReport}>Generate Report</button>
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Debug System
VITE_DEBUG_ENABLED=true              # Enable debug logging
VITE_LOG_LEVEL=info                  # debug, info, warn, error

# Production Audit
VITE_AUDIT_ENABLED=true              # Enable production audit logging
VITE_AUDIT_LOG_LEVEL=warn            # Minimum log level
VITE_AUDIT_RETENTION_DAYS=2555       # Default retention period

# Supabase
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Custom Configuration

```typescript
import { productionAuditLogger } from '@/lib/productionAuditLogger';

// Update production audit configuration
await productionAuditLogger.updateConfig({
  enableApiLogging: true,
  enablePerformanceTracking: false,
  dataRetentionDays: 1825,
  anonymizeData: true,
  excludeEndpoints: ['/health', '/metrics'],
  batchSize: 100,
  flushIntervalMs: 30000
});
```

## 📊 Monitoring & Analytics

### Debug Dashboard Features

- **Real-time Statistics**: Active sessions, API calls, error rates
- **Event Visualization**: Charts for event distribution and performance
- **Log Viewing**: Searchable audit logs, API calls, and sessions
- **Data Export**: CSV export for analysis and compliance
- **Performance Metrics**: Response times and database performance

### Compliance Dashboard Features

- **Compliance Status**: GDPR/CCPA/SOX configuration status
- **Anomaly Monitoring**: Real-time security incident detection
- **Report Generation**: Automated compliance report creation
- **Policy Management**: Configure retention and notification settings
- **Integrity Verification**: Log tampering detection and prevention

## 🔍 Data Privacy & Security

### Data Sanitization

The system automatically redacts sensitive information:

- **PII Fields**: Passwords, tokens, credit cards, SSNs, emails
- **Authentication**: API keys, access tokens, refresh tokens
- **Personal Data**: Phone numbers, addresses, personal information
- **Custom Patterns**: Configurable sensitive field detection

### Access Control

- **Development Mode**: Full access for debugging and development
- **Production Mode**: Restricted access with proper authentication
- **Row Level Security**: Gym-based data isolation
- **Role-Based Access**: Admin, developer, and viewer permissions

### Encryption & Integrity

- **Data Encryption**: Configurable encryption at rest and in transit
- **Log Integrity**: SHA-256 checksums for tamper detection
- **Secure Storage**: Encrypted backup and archival
- **Audit Trail**: Complete history of all system changes

## 🚨 Anomaly Detection

### Built-in Detection Rules

1. **Excessive Login Attempts**: 50+ logins in 24 hours
2. **High Error Rate**: 10+ errors in 1 hour
3. **Slow API Responses**: Response times > 5 seconds
4. **Unusual Data Access**: 1000+ record accesses in 24 hours
5. **Multiple Failed Auth**: 5+ failed attempts in 15 minutes
6. **Data Export Spike**: Unusual export activity patterns

### Custom Rules

```typescript
await complianceLogger.createAnomalyRule({
  ruleName: 'custom_rule',
  ruleType: 'threshold',
  conditions: { action: 'data_export', resource_type: 'members' },
  thresholdValue: 500,
  timeWindowMinutes: 60,
  severityLevel: 'high',
  description: 'Detect excessive member data exports',
  isActive: true
});
```

### Alert Configuration

```typescript
// Email notifications
await supabase.from('audit_notifications').insert({
  notification_type: 'email',
  trigger_event: 'anomaly_detected',
  configuration: {
    recipients: ['admin@yourgym.com', 'security@yourgym.com'],
    template: 'security_alert'
  }
});

// Slack notifications
await supabase.from('audit_notifications').insert({
  notification_type: 'slack',
  trigger_event: 'critical_anomaly',
  configuration: {
    webhook_url: 'https://hooks.slack.com/your-webhook',
    channel: '#security-alerts'
  }
});
```

## 📈 Performance & Scalability

### Optimization Features

- **Batch Processing**: Queue-based logging with configurable batch sizes
- **Offline Support**: Local storage when network is unavailable
- **Lazy Loading**: On-demand log loading for large datasets
- **Database Indexing**: Optimized queries for performance
- **Connection Pooling**: Efficient database connection management

### Production Considerations

- **Asynchronous Logging**: Non-blocking audit operations
- **Rate Limiting**: Configurable notification rate limits
- **Memory Management**: Automatic cleanup and garbage collection
- **Network Optimization**: Efficient API request batching

## 🔧 Troubleshooting

### Common Issues

**Debug system not working:**
```typescript
// Check development mode
console.log('Development mode:', import.meta.env.DEV);

// Verify gym ID
import { getCurrentGymId } from '@/lib/supabase';
const gymId = await getCurrentGymId();
console.log('Gym ID:', gymId);
```

**Missing logs in dashboard:**
```typescript
// Check real-time subscription
import { supabase } from '@/lib/supabase';
const channel = supabase.channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_audit_logs' })
  .subscribe();
```

**Compliance configuration errors:**
```typescript
// Verify RLS policies
const { data: policies } = await supabase
  .from('pg_policies')
  .select('*')
  .in('tablename', ['compliance_configurations', 'audit_anomalies']);
```

### Debug Tools

```typescript
// Enable verbose logging
localStorage.setItem('debug_audit', 'true');

// Check logger state
import { debugLogger } from '@/lib/debugLogger';
console.log('Logger session:', debugLogger.getSessionId());

// Manually flush logs
await debugLogger.flushAll();
```

## 📚 API Reference

### DebugLogger Class

```typescript
class DebugLogger {
  // Core logging methods
  logUserInteraction(action: string, details?: any): void
  logNavigation(path: string, details?: any): void
  logFormSubmit(formName: string, data: any, details?: any): void
  logApiCall(entry: ApiLogEntry): void
  logError(error: Error, context?: any): void
  logPerformance(name: string, duration: number, details?: any): void
  logAuth(action: string, details?: any): void

  // Session management
  setUserId(userId: string): void
  getSessionId(): string
  flushAll(): Promise<void>
}
```

### ComplianceLogger Class

```typescript
class ComplianceLogger {
  // Configuration
  configureCompliance(config: ComplianceConfig): Promise<boolean>
  getComplianceConfiguration(type?: string): Promise<ComplianceConfig | null>

  // Anomaly detection
  createAnomalyRule(rule: AnomalyRule): Promise<boolean>
  logAnomaly(anomaly: AnomalyDetection): Promise<boolean>
  runAnomalyDetection(): Promise<void>

  // Reporting
  generateComplianceReport(report: ComplianceReport): Promise<string | null>

  // Integrity
  verifyLogIntegrity(date?: Date): Promise<boolean>
}
```

## 🛠️ Development

### Adding New Features

1. **New Log Types**: Extend `LogEntry` interface in `debugLogger.ts`
2. **Custom Hooks**: Create new hooks in `hooks/useDebugLogger.ts`
3. **Dashboard Components**: Add to `pages/debug/` directory
4. **Database Schema**: Update migration files in `supabase/`

### Testing

```bash
# Run audit system tests
npm run test:audit

# Test with sample data
node scripts/test-audit-system.js
```

### Contributing

1. Follow TypeScript best practices
2. Add comprehensive JSDoc comments
3. Update documentation for new features
4. Test compliance with privacy regulations

## 📄 Licenses & Compliance

### Data Protection

- **GDPR Compliant**: Full support for GDPR requirements
- **CCPA Ready**: California Consumer Privacy Act support
- **SOX Compatible**: Sarbanes-Oxley Act compliance features
- **Data Minimization**: Only collect necessary audit information

### Security Standards

- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security and availability controls
- **NIST Framework**: Cybersecurity best practices
- **OWASP Guidelines**: Secure coding standards

## 🤝 Support & Contributing

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Debug Dashboard**: Use the built-in debugging tools
- **Community**: Create issues in the project repository
- **Support**: Contact the development team for assistance

### Contributing Guidelines

1. **Code Quality**: Follow TypeScript and React best practices
2. **Testing**: Add unit tests for new features
3. **Documentation**: Update relevant documentation
4. **Security**: Ensure no sensitive data leakage
5. **Performance**: Consider impact on system performance

---

## 🎉 Summary

This enterprise-grade audit and debug system provides comprehensive monitoring, security, and compliance capabilities for the Gym/FitFlow application. It combines advanced logging, AI-powered anomaly detection, and regulatory compliance features to ensure your application meets the highest standards of security and privacy.

The system is designed to be:
- **Comprehensive**: Tracks every relevant system event
- **Secure**: Protects sensitive data while maintaining auditability
- **Compliant**: Meets major regulatory requirements
- **Scalable**: Handles high-volume logging efficiently
- **User-Friendly**: Provides intuitive dashboards and management tools

Ready for production use and easily customizable for your specific requirements! 🚀