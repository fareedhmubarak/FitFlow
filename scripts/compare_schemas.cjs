const fs = require('fs');

// Load Prod Schema
const prodSchema = JSON.parse(fs.readFileSync('prod_schema.json', 'utf8'));

// Dev Schema - columns we KNOW exist in Dev (from our session)
const devColumns = [
  // gym_members additions
  { table: 'gym_members', column: 'deactivated_at', type: 'timestamptz' },
  
  // gym_member_history table (entire table missing)
  { table: 'gym_member_history', column: 'id', type: 'uuid' },
  { table: 'gym_member_history', column: 'gym_id', type: 'uuid' },
  { table: 'gym_member_history', column: 'member_id', type: 'uuid' },
  { table: 'gym_member_history', column: 'change_type', type: 'text' },
  { table: 'gym_member_history', column: 'old_value', type: 'jsonb' },
  { table: 'gym_member_history', column: 'new_value', type: 'jsonb' },
  { table: 'gym_member_history', column: 'description', type: 'text' },
  { table: 'gym_member_history', column: 'changed_by', type: 'uuid' },
  { table: 'gym_member_history', column: 'created_at', type: 'timestamptz' },
];

// Build Prod lookup
const prodLookup = new Set();
prodSchema.forEach(col => {
  prodLookup.add(`${col.table_name}.${col.column_name}`);
});

// Find missing
console.log('=== MISSING IN PRODUCTION ===\n');
const missing = [];
devColumns.forEach(dev => {
  const key = `${dev.table}.${dev.column}`;
  if (!prodLookup.has(key)) {
    missing.push(dev);
    console.log(`❌ ${dev.table}.${dev.column} (${dev.type})`);
  }
});

if (missing.length === 0) {
  console.log('✅ All Dev columns exist in Prod!');
} else {
  console.log(`\n=== TOTAL MISSING: ${missing.length} ===`);
}
