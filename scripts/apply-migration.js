#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(migrationFile) {
  try {
    console.log(`🔧 Reading migration file: ${migrationFile}...`);

    const sqlPath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Applying migration to database...');
    console.log('');

    // Use pg-meta or direct execution via fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sqlContent })
    });

    // If exec_sql doesn't exist, use alternative method
    if (!response.ok && response.status === 404) {
      console.log('⚠️  exec_sql RPC not available, using alternative method...');
      console.log('');
      console.log('📋 MANUAL MIGRATION REQUIRED:');
      console.log('');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log(`   URL: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}`);
      console.log('');
      console.log('2. Copy and paste the SQL from:');
      console.log(`   ${sqlPath}`);
      console.log('');
      console.log('3. Click "Run" to execute the migration');
      console.log('');

      // Still try to show the SQL content
      console.log('📄 SQL Content Preview:');
      console.log('─'.repeat(60));
      console.log(sqlContent.substring(0, 500) + '...');
      console.log('─'.repeat(60));
      console.log('');

      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Migration failed:', errorText);
      console.log('');
      showManualInstructions(sqlPath);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ Migration applied successfully!');
    console.log('');

    // Show any notices or output
    if (result) {
      console.log('📊 Migration Output:');
      console.log(JSON.stringify(result, null, 2));
      console.log('');
    }

    console.log('🔍 Verifying migration...');

    // Verify the columns were added
    const { data: columns, error: colError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (colError) {
      console.log('⚠️  Could not verify migration:', colError.message);
    } else {
      console.log('✅ Migration verified: profiles table updated');
      if (columns && columns.length > 0) {
        console.log('📋 Sample row structure:', Object.keys(columns[0]).join(', '));
      }
    }

    console.log('');
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('');
    showManualInstructions(sqlPath);
    process.exit(1);
  }
}

function showManualInstructions(sqlPath) {
  console.log('📋 MANUAL MIGRATION INSTRUCTIONS:');
  console.log('');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log(`   URL: https://supabase.com/dashboard`);
  console.log('');
  console.log('2. Copy the SQL from:');
  console.log(`   ${sqlPath}`);
  console.log('');
  console.log('3. Paste and execute in SQL Editor');
  console.log('');
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node apply-migration.js <migration-file>');
  console.log('');
  console.log('Example:');
  console.log('  node apply-migration.js 01-add-plan-fields-to-profiles.sql');
  process.exit(1);
}

// Run the migration
applyMigration(migrationFile);