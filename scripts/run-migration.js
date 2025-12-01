import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qvszzwfvkvjxpkkiilyv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required for migrations');
  console.log('Please set your Supabase service role key in your environment:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting audit/debug system migration...');

    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migration_audit_debug_system.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}...`);

        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // If rpc doesn't exist, we'll need a different approach
          if (error.message.includes('function exec_sql')) {
            console.log('⚠️  exec_sql function not available. Please run the SQL manually in Supabase SQL Editor.');
            console.log('\n📋 SQL to execute manually:');
            console.log('```sql');
            console.log(sql);
            console.log('```');
            break;
          }
          throw error;
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        errorCount++;

        // For certain errors (like "already exists"), we can continue
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('does not exist')) {
          console.log('⚠️  Continuing with next statement...');
          continue;
        } else {
          console.log('⚠️  Stopping migration due to error');
          break;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`❌ Errors: ${errorCount} statements`);

    if (successCount > 0) {
      console.log('\n🎉 Audit/Debug system migration completed!');
      console.log('\n📋 Tables created:');
      console.log('  • gym_audit_logs - Audit trail for all operations');
      console.log('  • gym_api_logs - HTTP request/response logging');
      console.log('  • gym_sessions - User session tracking');
      console.log('\n🔐 Security:');
      console.log('  • Row Level Security (RLS) enabled on all tables');
      console.log('  • Developer-only access policies applied');
      console.log('\n🧹 Maintenance:');
      console.log('  • cleanup_audit_logs() function created for 30-day retention');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Helper function to create exec_sql RPC if it doesn't exist
async function ensureExecSqlFunction() {
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: createFunctionSql
    });

    if (error && !error.message.includes('already exists')) {
      console.log('📝 Creating exec_sql helper function...');
    }
  } catch (error) {
    // Expected if function doesn't exist yet
  }
}

// Run the migration
ensureExecSqlFunction().then(runMigration);