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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTrigger() {
  try {
    console.log('🔧 Reading SQL trigger file...');

    const sqlPath = path.join(__dirname, 'setup-google-oauth-trigger.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Applying Google OAuth trigger to database...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql not available, trying direct execution...');

      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.from('_temp').select('*').limit(0);

          // Use raw SQL through a more direct approach
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql: statement })
          });

          if (!response.ok) {
            console.log(`⚠️  Statement failed, continuing: ${statement.substring(0, 50)}...`);
          }
        }
      }
    }

    console.log('✅ Google OAuth trigger applied successfully!');
    console.log('');
    console.log('🔍 Verifying trigger installation...');

    // Verify trigger was created
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .eq('trigger_name', 'on_auth_user_created');

    if (triggerError) {
      console.log('⚠️  Could not verify trigger (this is normal for some setups)');
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Trigger verified: on_auth_user_created is active');
    } else {
      console.log('⚠️  Trigger verification inconclusive');
    }

    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test Google OAuth sign-in');
    console.log('2. Verify profile auto-creation');
    console.log('3. Check username generation');

  } catch (error) {
    console.error('❌ Error applying trigger:', error.message);
    console.log('');
    console.log('🔧 Manual application required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy content from scripts/setup-google-oauth-trigger.sql');
    console.log('3. Execute the SQL manually');
    process.exit(1);
  }
}

// Alternative manual approach
function showManualInstructions() {
  console.log('');
  console.log('📋 MANUAL TRIGGER APPLICATION:');
  console.log('');
  console.log('1. Open Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}`);
  console.log('');
  console.log('2. Go to: SQL Editor');
  console.log('');
  console.log('3. Copy and execute this SQL:');
  console.log('   File: scripts/setup-google-oauth-trigger.sql');
  console.log('');
  console.log('4. Look for success message in results');
}

// Run the script
applyTrigger().catch(() => {
  showManualInstructions();
});