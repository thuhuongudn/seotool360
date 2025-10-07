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
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const KEEP_TOOL_ID = '9714610d-a597-435e-852e-036944f4daf0'; // Oldest one
const DUPLICATE_IDS = [
  '62e53fcd-263e-48c6-bca2-820af25aa4b8',
  '821ba227-0275-439a-b413-9421c40ad8c2'
];

async function fixDuplicates() {
  try {
    console.log('');
    console.log('========================================');
    console.log('FIX CONTENT-OPTIMIZER DUPLICATES');
    console.log('========================================');
    console.log('');

    // Step 1: Check current state
    const { data: tools, error: toolsError } = await supabase
      .from('seo_tools')
      .select('id, name')
      .eq('name', 'content-optimizer');

    if (toolsError || !tools) {
      console.error('Failed to fetch tools:', toolsError?.message);
      process.exit(1);
    }

    console.log('Found', tools.length, 'content-optimizer tools:');
    tools.forEach(t => {
      console.log(`  - ${t.id}`);
    });
    console.log('');

    // Step 2: Check which tool has user access
    for (const tool of tools) {
      const { count } = await supabase
        .from('user_tool_access')
        .select('user_id', { count: 'exact', head: true })
        .eq('tool_id', tool.id);

      console.log(`Tool ${tool.id}: ${count || 0} users have access`);
    }
    console.log('');

    // Step 3: Migrate all access to the oldest tool
    console.log(`Migrating all access to tool: ${KEEP_TOOL_ID}...`);
    console.log('');

    for (const duplicateId of DUPLICATE_IDS) {
      // Get all users with access to duplicate
      const { data: duplicateAccess } = await supabase
        .from('user_tool_access')
        .select('user_id, permission, granted_by')
        .eq('tool_id', duplicateId);

      if (!duplicateAccess || duplicateAccess.length === 0) {
        console.log(`  No access records for ${duplicateId}`);
        continue;
      }

      console.log(`  Migrating ${duplicateAccess.length} access records from ${duplicateId}...`);

      // Insert into correct tool (will skip duplicates due to unique constraint)
      for (const access of duplicateAccess) {
        const { error } = await supabase
          .from('user_tool_access')
          .insert({
            user_id: access.user_id,
            tool_id: KEEP_TOOL_ID,
            permission: access.permission,
            granted_by: access.granted_by,
            created_at: new Date().toISOString()
          })
          .select();

        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.log(`    ✗ Failed for user ${access.user_id}: ${error.message}`);
        }
      }

      // Delete old access records
      const { error: deleteError } = await supabase
        .from('user_tool_access')
        .delete()
        .eq('tool_id', duplicateId);

      if (deleteError) {
        console.log(`    ✗ Failed to delete access records: ${deleteError.message}`);
      } else {
        console.log(`    ✓ Deleted ${duplicateAccess.length} old access records`);
      }
    }

    console.log('');

    // Step 4: Delete duplicate tools
    console.log('Deleting duplicate tools...');
    for (const duplicateId of DUPLICATE_IDS) {
      const { error } = await supabase
        .from('seo_tools')
        .delete()
        .eq('id', duplicateId);

      if (error) {
        console.log(`  ✗ Failed to delete ${duplicateId}: ${error.message}`);
      } else {
        console.log(`  ✓ Deleted tool ${duplicateId}`);
      }
    }

    console.log('');

    // Step 5: Verify final state
    const { data: finalTools } = await supabase
      .from('seo_tools')
      .select('id, name')
      .eq('name', 'content-optimizer');

    console.log('========================================');
    console.log('FINAL STATE');
    console.log('========================================');
    console.log(`Remaining content-optimizer tools: ${finalTools.length}`);

    if (finalTools.length === 1) {
      const { count: finalCount } = await supabase
        .from('user_tool_access')
        .select('user_id', { count: 'exact', head: true })
        .eq('tool_id', finalTools[0].id);

      console.log(`Tool ID: ${finalTools[0].id}`);
      console.log(`Users with access: ${finalCount || 0}`);
      console.log('');
      console.log('✅ Duplicates fixed successfully!');
    } else {
      console.log('⚠️  Still have', finalTools.length, 'tools');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicates();
