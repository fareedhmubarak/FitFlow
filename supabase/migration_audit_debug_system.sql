-- ===============================================
-- AUDIT/DEBUG SYSTEM MIGRATION
-- Multi-Tenant Gym Management System
-- ===============================================

-- ===============================================
-- 1. GYM_AUDIT_LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS gym_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES gym_users(id),
  event_type VARCHAR(50) NOT NULL,
  event_category VARCHAR(30) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gym_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_gym_timestamp ON gym_audit_logs(gym_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON gym_audit_logs(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON gym_audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON gym_audit_logs(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON gym_audit_logs(resource_type, resource_id);

-- ===============================================
-- 2. GYM_API_LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS gym_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES gym_users(id),
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gym_api_logs
CREATE INDEX IF NOT EXISTS idx_api_logs_gym_timestamp ON gym_api_logs(gym_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON gym_api_logs(endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON gym_api_logs(response_status, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_duration ON gym_api_logs(duration_ms);

-- ===============================================
-- 3. GYM_SESSIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS gym_sessions (
  id VARCHAR(255) PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES gyms(id),
  user_id UUID REFERENCES gym_users(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gym_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_gym_active ON gym_sessions(gym_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON gym_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON gym_sessions(last_activity DESC);

-- ===============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ===============================================
ALTER TABLE gym_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 5. DEVELOPER-ONLY RLS POLICIES
-- ===============================================
CREATE POLICY IF NOT EXISTS "Developers only audit logs" ON gym_audit_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Developers only API logs" ON gym_api_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Developers only sessions" ON gym_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ===============================================
-- 6. CLEANUP FUNCTION FOR 30-DAY RETENTION
-- ===============================================
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM gym_audit_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';

  DELETE FROM gym_api_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';

  UPDATE gym_sessions
  SET is_active = false
  WHERE last_activity < NOW() - INTERVAL '30 days' AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 7. UPDATED_AT TRIGGER FOR GYM_SESSIONS
-- ===============================================
CREATE TRIGGER IF NOT EXISTS update_gym_sessions_updated_at
  BEFORE UPDATE ON gym_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE gym_audit_logs IS 'Audit trail for all gym operations and data changes';
COMMENT ON COLUMN gym_audit_logs.event_type IS 'Type of event: create, update, delete, login, logout, etc.';
COMMENT ON COLUMN gym_audit_logs.event_category IS 'Category: auth, member, class, payment, etc.';
COMMENT ON COLUMN gym_audit_logs.action IS 'Specific action performed';
COMMENT ON COLUMN gym_audit_logs.resource_type IS 'Type of resource affected: member, class, payment, etc.';
COMMENT ON COLUMN gym_audit_logs.old_values IS 'JSON of previous state (for updates)';
COMMENT ON COLUMN gym_audit_logs.new_values IS 'JSON of new state';
COMMENT ON COLUMN gym_audit_logs.metadata IS 'Additional context data';

COMMENT ON TABLE gym_api_logs IS 'HTTP request/response logging for API monitoring and debugging';
COMMENT ON COLUMN gym_api_logs.request_headers IS 'Incoming HTTP headers (sanitized)';
COMMENT ON COLUMN gym_api_logs.request_body IS 'Incoming request body (sanitized)';
COMMENT ON COLUMN gym_api_logs.response_body IS 'API response (limited size)';

COMMENT ON TABLE gym_sessions IS 'User session tracking for authentication and activity monitoring';
COMMENT ON COLUMN gym_sessions.device_info IS 'Device and browser information';
COMMENT ON COLUMN gym_sessions.location_data IS 'Geolocation data (if available)';

COMMENT ON FUNCTION cleanup_audit_logs() IS 'Automated cleanup of audit logs older than 30 days and session management';