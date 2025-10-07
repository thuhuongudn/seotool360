#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

const CONTENT_OPTIMIZER_ID = '62e53fcd-263e-48c6-bca2-820af25aa4b8';
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

async function checkAndGrantContentOptimizer() {
  try {
    console.log('');
    console.log('========================================');
    console.log('CHECK & GRANT CONTENT OPTIMIZER');
    console.log('========================================');
    console.log('');

    // Step 1: Verify tool exists
    const { data: tool, error: toolError } = await supabase
      .from('seo_tools')
      .select('*')
      .eq('id', CONTENT_OPTIMIZER_ID)
      .single();

    if (toolError) {
      console.error('❌ Tool not found:', toolError.message);
      process.exit(1);
    }

    console.log('✓ Tool found:');
    console.log('  ID:', tool.id);
    console.log('  Name:', tool.name);
    console.log('  Title:', tool.title);
    console.log('');

    // Step 2: Get all trial users
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, username, plan, status')
      .eq('plan', 'trial')
      .eq('status', 'active');

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError.message);
      process.exit(1);
    }

    console.log(`✓ Found ${allUsers.length} active trial users`);
    console.log('');

    // Step 3: Check who has access
    const { data: accessList, error: accessError } = await supabase
      .from('user_tool_access')
      .select('user_id, tool_id, permission, created_at')
      .eq('tool_id', CONTENT_OPTIMIZER_ID);

    if (accessError) {
      console.error('❌ Failed to check access:', accessError.message);
      process.exit(1);
    }

    const usersWithAccess = new Set(accessList.map(a => a.user_id));
    const usersWithoutAccess = allUsers.filter(u => !usersWithAccess.has(u.user_id));

    console.log('✓ Access check:');
    console.log(`  Users with access: ${usersWithAccess.size}`);
    console.log(`  Users without access: ${usersWithoutAccess.length}`);
    console.log('');

    if (usersWithoutAccess.length === 0) {
      console.log('✅ All users already have content-optimizer access!');
      console.log('');

      // Show sample of users with access
      console.log('Sample of users with access (first 5):');
      for (let i = 0; i < Math.min(5, allUsers.length); i++) {
        const user = allUsers[i];
        const access = accessList.find(a => a.user_id === user.user_id);
        console.log(`  ✓ ${user.username || user.user_id.substring(0, 8)} - granted at ${access?.created_at}`);
      }
      console.log('');
      return;
    }

    // Step 4: Grant access to users who don't have it
    console.log('Granting access to users without permission...');
    console.log('');

    let granted = 0;
    let failed = 0;

    for (const user of usersWithoutAccess) {
      const userDisplay = user.username || user.user_id.substring(0, 8);

      const { error: grantError } = await supabase
        .from('user_tool_access')
        .insert({
          user_id: user.user_id,
          tool_id: CONTENT_OPTIMIZER_ID,
          permission: 'use',
          granted_by: SYSTEM_USER_ID,
          created_at: new Date().toISOString()
        });

      if (grantError) {
        failed++;
        console.log(`  ✗ Failed to grant to ${userDisplay}: ${grantError.message}`);
      } else {
        granted++;
        console.log(`  ✓ Granted to: ${userDisplay}`);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('GRANT COMPLETED');
    console.log('========================================');
    console.log('Total users checked:', allUsers.length);
    console.log('Already had access:', usersWithAccess.size);
    console.log('Newly granted:', granted);
    console.log('Failed:', failed);
    console.log('========================================');
    console.log('');

    if (granted > 0) {
      console.log(`✅ Successfully granted content-optimizer to ${granted} users`);
    }

    // Final verification
    console.log('');
    console.log('Final verification...');
    const { data: finalCheck } = await supabase
      .from('user_tool_access')
      .select('user_id')
      .eq('tool_id', CONTENT_OPTIMIZER_ID);

    console.log(`✓ Total users with content-optimizer access: ${finalCheck.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the check and grant
checkAndGrantContentOptimizer();
