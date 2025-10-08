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

const CORRECT_TOOL_ID = '9714610d-a597-435e-852e-036944f4daf0';

async function checkAndUpdateTrigger() {
  try {
    console.log('');
    console.log('========================================');
    console.log('CHECK AUTO-GRANT TRIGGER FUNCTION');
    console.log('========================================');
    console.log('');

    // Step 1: Check current function definition
    console.log('Checking current auto_grant_tools_to_new_user function...');

    const { data: funcDef, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'auto_grant_tools_to_new_user'
      `
    });

    if (funcError) {
      console.log('⚠️  Cannot check function definition via RPC');
      console.log('Will update trigger function directly...');
    } else if (funcDef && funcDef[0]) {
      console.log('Current function found');
      // Check if it contains the wrong tool ID
      if (funcDef[0].definition.includes('62e53fcd-263e-48c6-bca2-820af25aa4b8')) {
        console.log('❌ Function contains WRONG tool ID: 62e53fcd-263e-48c6-bca2-820af25aa4b8');
      } else if (funcDef[0].definition.includes(CORRECT_TOOL_ID)) {
        console.log('✅ Function already has CORRECT tool ID:', CORRECT_TOOL_ID);
      }
    }
    console.log('');

    // Step 2: Update the function with correct tool IDs
    console.log('Updating auto_grant_tools_to_new_user function with correct tool IDs...');
    console.log('');

    const updateSQL = `
CREATE OR REPLACE FUNCTION public.auto_grant_tools_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_system_user_id text := '00000000-0000-0000-0000-000000000000';
    v_tool_ids text[] := ARRAY[
        '1b2f8454-3fef-425d-bef8-b445dc54dbac', -- keyword-planner
        '1ff742f6-52d2-49ef-8979-7647423438ca', -- search-intent
        '${CORRECT_TOOL_ID}'  -- content-optimizer (CORRECT ID)
    ];
    v_tool_id text;
    v_granted_count integer := 0;
BEGIN
    IF NEW.plan = 'trial' AND NEW.status = 'active' THEN
        FOREACH v_tool_id IN ARRAY v_tool_ids
        LOOP
            BEGIN
                INSERT INTO public.user_tool_access (
                    user_id,
                    tool_id,
                    permission,
                    granted_by,
                    created_at
                )
                VALUES (
                    NEW.user_id,
                    v_tool_id,
                    'use',
                    v_system_user_id,
                    now()
                )
                ON CONFLICT (user_id, tool_id) DO NOTHING;

                IF FOUND THEN
                    v_granted_count := v_granted_count + 1;
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to grant tool % to user %: %',
                        v_tool_id, NEW.user_id, SQLERRM;
            END;
        END LOOP;

        IF v_granted_count > 0 THEN
            RAISE NOTICE 'Auto-granted % tools to new user %', v_granted_count, NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
`;

    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: updateSQL
    });

    if (updateError) {
      console.log('❌ Cannot update via exec_sql RPC');
      console.log('Error:', updateError.message);
      console.log('');
      console.log('📝 Please run this SQL manually on your database:');
      console.log('');
      console.log(updateSQL);
      console.log('');
      console.log('Or use the updated file: scripts/04-auto-grant-tools-for-new-users.sql');
    } else {
      console.log('✅ Function updated successfully!');
      console.log('');
    }

    // Step 3: Test by checking what would be granted to a test user
    console.log('Testing: What tools would be granted to a new trial user?');
    console.log('');
    console.log('Tool IDs in array:');
    console.log('  1. keyword-planner: 1b2f8454-3fef-425d-bef8-b445dc54dbac');
    console.log('  2. search-intent: 1ff742f6-52d2-49ef-8979-7647423438ca');
    console.log('  3. content-optimizer:', CORRECT_TOOL_ID);
    console.log('');

    // Verify these tools exist
    const toolIds = [
      '1b2f8454-3fef-425d-bef8-b445dc54dbac',
      '1ff742f6-52d2-49ef-8979-7647423438ca',
      CORRECT_TOOL_ID
    ];

    for (const toolId of toolIds) {
      const { data: tool, error: toolError } = await supabase
        .from('seo_tools')
        .select('id, name, title')
        .eq('id', toolId)
        .single();

      if (toolError || !tool) {
        console.log(`  ❌ Tool ${toolId} NOT FOUND in database!`);
      } else {
        console.log(`  ✅ ${tool.name} (${tool.title})`);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log('✅ Correct tool ID:', CORRECT_TOOL_ID);
    console.log('📝 Function updated (or see manual SQL above)');
    console.log('');
    console.log('Next steps:');
    console.log('1. If update failed, run the SQL manually');
    console.log('2. Test by creating a new trial user');
    console.log('3. Verify new user has all 3 tools auto-granted');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAndUpdateTrigger();
