#!/usr/bin/env node

/**
 * RLS Security Verification Script
 * 
 * This script verifies that Row Level Security is properly configured
 * for all tables in the SEO AI Tools application using direct PostgreSQL.
 * 
 * Usage: node scripts/verify-rls-security.js
 */

const { Client } = require('pg')

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing required environment variable: SUPABASE_DB_URL or DATABASE_URL')
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
})

const EXPECTED_TABLES = [
  'profiles', 
  'user_tool_access', 
  'tool_settings', 
  'admin_audit_log',
  'seo_tools', 
  'social_media_posts', 
  'internal_link_suggestions', 
  'tool_executions'
]

const EXPECTED_POLICIES_PER_TABLE = {
  'profiles': 2,                    // own_access + admin_access
  'user_tool_access': 2,            // own_view + admin_manage  
  'tool_settings': 2,               // own_access + admin_view
  'admin_audit_log': 2,             // admin_read + service_insert
  'seo_tools': 2,                   // authenticated_read + admin_modify
  'social_media_posts': 2,          // owner_access + admin_override
  'internal_link_suggestions': 2,   // owner_only + admin_override
  'tool_executions': 2              // owner_only + admin_override
}

async function verifyRLSSecurity() {
  console.log('🔒 Verifying RLS Security Configuration...\n')

  try {
    await client.connect()

    // Check RLS enabled on all tables
    console.log('📋 Checking RLS Status:')
    const rlsQuery = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      ORDER BY tablename
    `
    const rlsResult = await client.query(rlsQuery, [EXPECTED_TABLES])

    const enabledTables = rlsResult.rows.filter(t => t.rowsecurity).map(t => t.tablename)
    const disabledTables = rlsResult.rows.filter(t => !t.rowsecurity).map(t => t.tablename)

    console.log(`✅ Tables with RLS enabled: ${enabledTables.length}/${EXPECTED_TABLES.length}`)
    if (enabledTables.length > 0) {
      enabledTables.forEach(table => console.log(`   ✓ ${table}`))
    }

    if (disabledTables.length > 0) {
      console.log(`❌ Tables with RLS disabled: ${disabledTables.length}`)
      disabledTables.forEach(table => console.log(`   ✗ ${table}`))
      return false
    }

    // Check policy counts
    console.log('\n📊 Checking Policy Coverage:')
    let totalPolicies = 0
    let allPoliciesCorrect = true

    const policyQuery = `
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE tablename = ANY($1)
      GROUP BY tablename
      ORDER BY tablename
    `
    const policyResult = await client.query(policyQuery, [EXPECTED_TABLES])

    for (const tableName of EXPECTED_TABLES) {
      const tablePolicy = policyResult.rows.find(p => p.tablename === tableName)
      const actualCount = tablePolicy ? parseInt(tablePolicy.policy_count) : 0
      const expectedCount = EXPECTED_POLICIES_PER_TABLE[tableName] || 0
      totalPolicies += actualCount

      if (actualCount === expectedCount) {
        console.log(`✅ ${tableName}: ${actualCount}/${expectedCount} policies`)
      } else {
        console.log(`❌ ${tableName}: ${actualCount}/${expectedCount} policies (MISMATCH)`)
        allPoliciesCorrect = false
      }
    }

    console.log(`\n📈 Total policies: ${totalPolicies}`)

    // Check critical policies exist
    console.log('\n🔑 Checking Critical Security Policies:')
    const criticalPolicyQuery = `
      SELECT policyname 
      FROM pg_policies 
      WHERE policyname IN ('admin_audit_log_service_insert', 'profile_own_access', 'tool_executions_owner_only')
    `
    const criticalResult = await client.query(criticalPolicyQuery)
    
    const foundCriticalPolicies = criticalResult.rows.map(r => r.policyname)
    const expectedCritical = ['admin_audit_log_service_insert', 'profile_own_access', 'tool_executions_owner_only']
    
    for (const policyName of expectedCritical) {
      if (foundCriticalPolicies.includes(policyName)) {
        console.log(`   ✅ ${policyName}`)
      } else {
        console.log(`   ❌ ${policyName} (MISSING)`)
        allPoliciesCorrect = false
      }
    }

    if (enabledTables.length === EXPECTED_TABLES.length && allPoliciesCorrect) {
      console.log('\n🎉 RLS Security Verification PASSED')
      console.log('✅ All tables have RLS enabled')
      console.log('✅ All expected policies are present')
      console.log('✅ System is secure for production')
      return true
    } else {
      console.log('\n❌ RLS Security Verification FAILED')
      console.log('⚠️  Security gaps detected - run setup-rls-policies.sql')
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  } finally {
    await client.end()
  }
}

// Run verification
verifyRLSSecurity()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error)
    process.exit(1)
  })