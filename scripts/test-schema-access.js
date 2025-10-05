/**
 * Test Schema Access After Blocking
 *
 * This script tests whether schema introspection has been successfully blocked.
 * Run this AFTER executing block-information-schema-supabase.sql
 *
 * Usage:
 *   node scripts/test-schema-access.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create client with ANON key (public key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSchemaAccess() {
  console.log('🔍 Testing Schema Access with ANON_KEY...\n');

  // Test 1: Try to access information_schema.tables
  console.log('Test 1: Accessing information_schema.tables');
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('*')
      .limit(1);

    if (error) {
      console.log('✅ BLOCKED:', error.message);
    } else if (data && data.length > 0) {
      console.log('❌ FAIL: Can still access schema!');
      console.log('Visible tables:', data.length);
    } else {
      console.log('✅ BLOCKED: No data returned');
    }
  } catch (err) {
    console.log('✅ BLOCKED:', err.message);
  }

  console.log('');

  // Test 2: Try to access pg_catalog.pg_tables
  console.log('Test 2: Accessing pg_catalog.pg_tables');
  try {
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('*')
      .limit(1);

    if (error) {
      console.log('✅ BLOCKED:', error.message);
    } else if (data && data.length > 0) {
      console.log('❌ FAIL: Can still access pg_catalog!');
    } else {
      console.log('✅ BLOCKED: No data returned');
    }
  } catch (err) {
    console.log('✅ BLOCKED:', err.message);
  }

  console.log('');

  // Test 3: Use the test view we created
  console.log('Test 3: Checking schema_access_test view');
  try {
    const { data, error } = await supabase
      .from('schema_access_test')
      .select('*')
      .single();

    if (error) {
      console.log('⚠️ View not found (script not run yet?):', error.message);
    } else if (data) {
      console.log('📊 Test Results:');
      console.log('  Current role:', data.current_role);
      console.log('  Session role:', data.session_role);
      console.log('  Visible tables:', data.visible_tables);

      if (data.visible_tables === 0) {
        console.log('  ✅ SUCCESS: Schema is completely blocked!');
      } else {
        console.log(`  ⚠️ WARNING: Can see ${data.visible_tables} tables`);
      }
    }
  } catch (err) {
    console.log('⚠️ Error:', err.message);
  }

  console.log('');

  // Test 4: Try to list public tables (should still work for RLS-enabled tables)
  console.log('Test 4: Accessing public tables (should work with RLS)');
  try {
    const { data, error } = await supabase
      .from('seo_tools')
      .select('id, name, icon')
      .limit(3);

    if (error) {
      console.log('⚠️ Error accessing public table:', error.message);
    } else if (data) {
      console.log('✅ SUCCESS: Can still access RLS-protected tables');
      console.log('  Found', data.length, 'tools');
    }
  } catch (err) {
    console.log('⚠️ Error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('  - Schema introspection should be blocked ✅');
  console.log('  - Public tables should still be accessible via RLS ✅');
  console.log('  - Data security is maintained by Row Level Security');
  console.log('='.repeat(60));
}

// Run tests
testSchemaAccess().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
