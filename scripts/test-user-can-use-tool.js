#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const CONTENT_OPTIMIZER_ID = '62e53fcd-263e-48c6-bca2-820af25aa4b8';

async function testUserAccess() {
  try {
    console.log('');
    console.log('========================================');
    console.log('TEST USER CAN USE CONTENT OPTIMIZER');
    console.log('========================================');
    console.log('');

    // Get a random trial user
    const { data: users } = await supabase
      .from('profiles')
      .select('user_id, username')
      .eq('plan', 'trial')
      .eq('status', 'active')
      .limit(3);

    for (const user of users) {
      console.log(`Testing user: ${user.username}`);
      console.log(`User ID: ${user.user_id}`);
      console.log('');

      // 1. Check if tool exists
      const { data: tool, error: toolError } = await supabase
        .from('seo_tools')
        .select('id, name, title, status')
        .eq('name', 'content-optimizer')
        .single();

      if (toolError || !tool) {
        console.log('  ❌ Tool "content-optimizer" not found in seo_tools table');
        console.log('');
        continue;
      }

      console.log(`  ✓ Tool exists: ${tool.title} (${tool.name})`);
      console.log(`    Status: ${tool.status}`);
      console.log(`    ID: ${tool.id}`);

      // 2. Check if user has access
      const { data: access, error: accessError } = await supabase
        .from('user_tool_access')
        .select('tool_id, permission, created_at')
        .eq('user_id', user.user_id)
        .eq('tool_id', tool.id)
        .single();

      if (accessError || !access) {
        console.log('  ❌ User does NOT have access to content-optimizer');
        console.log(`    Error: ${accessError?.message || 'No access record found'}`);
        console.log('');

        // Try to grant access
        console.log('  → Attempting to grant access...');
        const { error: grantError } = await supabase
          .from('user_tool_access')
          .insert({
            user_id: user.user_id,
            tool_id: tool.id,
            permission: 'use',
            granted_by: '00000000-0000-0000-0000-000000000000',
            created_at: new Date().toISOString()
          });

        if (grantError) {
          console.log(`    ❌ Failed to grant: ${grantError.message}`);
        } else {
          console.log('    ✅ Access granted successfully!');
        }
        console.log('');
        continue;
      }

      console.log('  ✓ User HAS access to content-optimizer');
      console.log(`    Permission: ${access.permission}`);
      console.log(`    Granted at: ${access.created_at}`);

      // 3. Check user's token balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, status, trial_ends_at')
        .eq('user_id', user.user_id)
        .single();

      console.log('  ✓ User profile:');
      console.log(`    Plan: ${profile.plan}`);
      console.log(`    Status: ${profile.status}`);
      console.log(`    Trial ends: ${profile.trial_ends_at}`);

      // 4. List all tools user can access
      const { data: allAccess } = await supabase
        .from('user_tool_access')
        .select(`
          tool_id,
          permission,
          seo_tools (name, title)
        `)
        .eq('user_id', user.user_id);

      console.log(`  ✓ All tools user can access (${allAccess.length} total):`);
      allAccess.forEach(a => {
        console.log(`    - ${a.seo_tools.name} (${a.seo_tools.title})`);
      });

      console.log('');
      console.log('  ✅ This user CAN use content-optimizer!');
      console.log('');
      console.log('---');
      console.log('');
    }

    console.log('========================================');
    console.log('Summary:');
    console.log('If users still cannot access the tool, check:');
    console.log('1. Browser cache - ask user to hard refresh (Ctrl+Shift+R)');
    console.log('2. Frontend is fetching tools correctly with useToolAccess()');
    console.log('3. SUPABASE_URL and SUPABASE_ANON_KEY are correct in frontend');
    console.log('4. RLS policies allow users to read their user_tool_access');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testUserAccess();
