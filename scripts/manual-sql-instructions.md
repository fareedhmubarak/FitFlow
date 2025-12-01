# Manual SQL Execution Instructions

Since the Supabase CLI is not available in this environment, please execute the SQL manually using one of the following methods:

## Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://qvszzwfvkvjxpkkiilyv.supabase.co
2. Navigate to the **SQL Editor**
3. Copy and paste the following SQL statements one by one:

### Step 1: Create gym_audit_logs table
```sql
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
```

### Step 2: Create gym_api_logs table
```sql
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
```

### Step 3: Create gym_sessions table
```sql
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

-- Updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_gym_sessions_updated_at
  BEFORE UPDATE ON gym_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Enable Row Level Security (RLS)
```sql
ALTER TABLE gym_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;
```

### Step 5: Create Developer-only RLS Policies
```sql
CREATE POLICY IF NOT EXISTS "Developers only audit logs" ON gym_audit_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Developers only API logs" ON gym_api_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Developers only sessions" ON gym_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 6: Create Cleanup Function
```sql
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
```

## Method 2: Using psql (if you have access)

If you have direct database access via psql:

```bash
psql -h qvszzwfvkvjxpkkiilyv.supabase.co -U postgres -d postgres -f supabase/migration_audit_debug_system.sql
```

## Verification

After execution, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'gym_%';

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE tablename LIKE 'gym_%'
AND schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename LIKE 'gym_%';
```

## Next Steps

1. Test the tables by inserting sample data
2. Verify RLS policies work correctly
3. Set up automated cleanup function to run periodically
4. Test the audit logging in your application

## Notes

- The tables reference existing `gyms` and `gym_users` tables
- All tables have Row Level Security enabled
- Only users with `service_role` can access these tables
- The cleanup function maintains 30-day data retention
- Indexes are optimized for common query patterns