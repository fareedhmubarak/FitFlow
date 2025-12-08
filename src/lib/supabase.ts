import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Development flag - set to false to use real authentication
const BYPASS_AUTH = false; // Disabled - using real gym authentication now

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create raw supabase client for internal logging (to avoid infinite loops)
const rawSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Tables to exclude from logging to prevent infinite loops
const EXCLUDED_TABLES = [
  'gym_audit_logs',
  'gym_api_logs', 
  'gym_sessions',
  'gym_navigation_logs',
  'gym_click_logs',
  'gym_error_logs',
  'gym_performance_logs'
];

// Session tracking for API logs
let currentSessionId: string | null = null;
let apiLogQueue: any[] = [];
let isFlushingApiLogs = false;

export function setSessionId(sessionId: string) {
  currentSessionId = sessionId;
}

// Flush API logs to database
async function flushApiLogs() {
  if (isFlushingApiLogs || apiLogQueue.length === 0) return;
  
  isFlushingApiLogs = true;
  const logsToFlush = [...apiLogQueue];
  apiLogQueue = [];

  try {
    await rawSupabase.from('gym_api_logs').insert(logsToFlush);
  } catch (error) {
    console.error('Failed to flush API logs:', error);
  } finally {
    isFlushingApiLogs = false;
  }
}

// Queue an API log entry
function queueApiLog(log: any) {
  if (!import.meta.env.DEV) return; // Only log in development
  
  apiLogQueue.push({
    ...log,
    gym_id: null, // Will be set by RLS or can be fetched if needed
    session_id: currentSessionId,
    created_at: new Date().toISOString()
  });

  // Auto-flush when queue gets large or after delay
  if (apiLogQueue.length >= 10) {
    flushApiLogs();
  }
}

// Set up periodic flush
if (typeof window !== 'undefined') {
  setInterval(flushApiLogs, 5000);
  window.addEventListener('beforeunload', flushApiLogs);
}

// Create a tracked Supabase client that logs API calls
function createTrackedClient(): SupabaseClient {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  
  // Only wrap in development mode
  if (!import.meta.env.DEV) {
    return client;
  }

  // Wrap the 'from' method to intercept all table operations
  const originalFrom = client.from.bind(client);
  
  client.from = (table: string) => {
    const queryBuilder = originalFrom(table);
    
    // Skip logging for excluded tables
    if (EXCLUDED_TABLES.includes(table)) {
      return queryBuilder;
    }

    // Wrap the query builder methods
    return wrapQueryBuilder(queryBuilder, table);
  };

  return client;
}

// Wrap query builder to track all operations
function wrapQueryBuilder(queryBuilder: any, table: string): any {
  const methods = ['select', 'insert', 'update', 'delete', 'upsert'];
  
  methods.forEach(method => {
    if (typeof queryBuilder[method] === 'function') {
      const original = queryBuilder[method].bind(queryBuilder);
      
      queryBuilder[method] = (...args: any[]) => {
        const startTime = performance.now();
        const result = original(...args);
        
        // Wrap the 'then' method to capture the result
        if (result && typeof result.then === 'function') {
          const originalThen = result.then.bind(result);
          
          result.then = (onFulfilled?: any, onRejected?: any) => {
            return originalThen(
              (response: any) => {
                const duration = Math.round(performance.now() - startTime);
                
                // Log the API call
                queueApiLog({
                  method: method.toUpperCase(),
                  endpoint: table,
                  request_body: sanitizeForLogging(args[0]),
                  response_status: response.error ? 400 : 200,
                  response_body: sanitizeForLogging(response.data),
                  duration_ms: duration,
                  success: !response.error,
                  error_message: response.error?.message || null
                });

                return onFulfilled ? onFulfilled(response) : response;
              },
              (error: any) => {
                const duration = Math.round(performance.now() - startTime);
                
                queueApiLog({
                  method: method.toUpperCase(),
                  endpoint: table,
                  request_body: sanitizeForLogging(args[0]),
                  response_status: 500,
                  duration_ms: duration,
                  success: false,
                  error_message: error?.message || 'Unknown error'
                });

                return onRejected ? onRejected(error) : Promise.reject(error);
              }
            );
          };
        }
        
        return result;
      };
    }
  });

  return queryBuilder;
}

// Sanitize data for logging (remove sensitive info, truncate large data)
function sanitizeForLogging(data: any): any {
  if (!data) return null;
  
  try {
    const str = JSON.stringify(data);
    // Truncate if too large
    if (str.length > 5000) {
      return { _truncated: true, _size: str.length, _preview: str.slice(0, 500) };
    }
    
    // Parse and sanitize
    const parsed = JSON.parse(str);
    return sanitizeObject(parsed);
  } catch {
    return { _error: 'Could not serialize' };
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20).map(sanitizeObject);
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credit_card', 'ssn'];
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Export the tracked client as the main supabase client
export const supabase = createTrackedClient();

// Export raw client for internal use (logging purposes)
export const supabaseRaw = rawSupabase;

// Helper to get current user's gym
export async function getCurrentGym() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Fallback: try to get from localStorage auth-storage
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed?.state?.gym) {
          return parsed.state.gym;
        }
      }
    } catch (e) {
      console.warn('Failed to parse auth-storage:', e);
    }
    return null;
  }

  const { data: gymUser } = await supabase
    .from('gym_users')
    .select('gym_id, gym_gyms(*)')
    .eq('auth_user_id', user.id)
    .single();

  return gymUser?.gym_gyms;
}

// CACHED gym_id for performance - avoids repeated DB calls
let cachedGymId: string | null = null;
let gymIdCacheExpiry: number = 0;
const GYM_ID_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to get current user's gym_id (CACHED)
export async function getCurrentGymId(): Promise<string | null> {
  // Return cached value if valid
  const now = Date.now();
  if (cachedGymId && gymIdCacheExpiry > now) {
    return cachedGymId;
  }

  // Try localStorage first (fastest)
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      if (parsed?.state?.user?.gym_id) {
        cachedGymId = parsed.state.user.gym_id;
        gymIdCacheExpiry = now + GYM_ID_CACHE_TTL;
        return cachedGymId;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // Fallback to auth + DB query
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: gymUser } = await supabase
    .from('gym_users')
    .select('gym_id')
    .eq('auth_user_id', user.id)
    .single();

  if (gymUser?.gym_id) {
    cachedGymId = gymUser.gym_id;
    gymIdCacheExpiry = now + GYM_ID_CACHE_TTL;
  }

  return gymUser?.gym_id || null;
}

// Clear gymId cache (call on logout)
export function clearGymIdCache() {
  cachedGymId = null;
  gymIdCacheExpiry = 0;
}
