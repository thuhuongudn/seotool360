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

async function grantContentOptimizerToUsers() {
  try {
    console.log('');
    console.log('========================================');
    console.log('GRANT CONTENT OPTIMIZER TO EXISTING USERS');
    console.log('========================================');
    console.log('');
    console.log('Tool: Content Optimizer');
    console.log('UUID:', CONTENT_OPTIMIZER_ID);
    console.log('');
    console.log('Processing existing trial users...');
    console.log('');

    // Get all active trial users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .eq('plan', 'trial')
      .eq('status', 'active')
      .order('created_at');

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError.message);
      process.exit(1);
    }

    let totalGranted = 0;
    let alreadyHad = 0;
    let failed = 0;

    for (const user of users) {
      const userDisplay = user.username || user.user_id.substring(0, 8);

      // Check if user already has access
      const { data: existingAccess } = await supabase
        .from('user_tool_access')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('tool_id', CONTENT_OPTIMIZER_ID)
        .single();

      if (existingAccess) {
        alreadyHad++;
        console.log(`  ⏭  User ${userDisplay} already has access`);
        continue;
      }

      // Grant access
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
        console.log(`  ✗  Failed to grant to user ${userDisplay}: ${grantError.message}`);
      } else {
        totalGranted++;
        console.log(`  ✓  Granted to user: ${userDisplay}`);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('BACKFILL COMPLETED');
    console.log('========================================');
    console.log('Total active trial users:', users.length);
    console.log('Already had access:', alreadyHad);
    console.log('Newly granted:', totalGranted);
    console.log('Failed:', failed);
    console.log('========================================');
    console.log('');

    if (totalGranted > 0) {
      console.log(`✅ Successfully granted content-optimizer to ${totalGranted} users`);
    } else {
      console.log('ℹ️  No new grants needed - all users already have access');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the grant
grantContentOptimizerToUsers();
