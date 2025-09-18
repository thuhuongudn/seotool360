#!/usr/bin/env node

// RBAC Permission System End-to-End Testing Script
// Tests admin vs member permissions and permission flow

const baseUrl = 'http://localhost:5000';

// Test accounts from seed script
const ADMIN_ACCOUNT = {
  email: 'nhathuocvietnhatdn@gmail.com', 
  password: 'Vietnhat@123'
};

const MEMBER_ACCOUNT = {
  email: 'anhnhan@nhathuocvietnhat.vn',
  password: 'Annhan@123'
};

// Tool IDs from seed script
const SOCIAL_MEDIA_TOOL_ID = 'cea68a24-6ea1-4764-90a6-ca3284d67a41';
const INTERNAL_LINK_TOOL_ID = '03a6e711-aa9f-4118-a9f7-89b10db8a129';

let adminToken = null;
let memberToken = null;

async function makeRequest(method, endpoint, data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const result = {
      status: response.status,
      ok: response.ok,
      data: null
    };
    
    try {
      result.data = await response.json();
    } catch (e) {
      result.data = await response.text();
    }
    
    return result;
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.message);
    return { status: 0, ok: false, data: null, error: error.message };
  }
}

async function loginUser(email, password) {
  console.log(`\n🔐 Attempting login for: ${email}`);
  
  const result = await makeRequest('POST', '/api/auth/login', {
    email,
    password
  });
  
  if (result.ok && result.data?.access_token) {
    console.log(`✅ Login successful for ${email}`);
    return result.data.access_token;
  } else {
    console.error(`❌ Login failed for ${email}:`, result.data);
    return null;
  }
}

async function testAdminAccess(token) {
  console.log('\n📊 Testing Admin Access...');
  
  // Test admin dashboard access
  const usersResult = await makeRequest('GET', '/api/admin/users', null, token);
  console.log(`Admin users endpoint: ${usersResult.status} ${usersResult.ok ? '✅' : '❌'}`);
  
  // Test admin tools access  
  const toolsResult = await makeRequest('GET', '/api/admin/seo-tools', null, token);
  console.log(`Admin tools endpoint: ${toolsResult.status} ${toolsResult.ok ? '✅' : '❌'}`);
  
  // Test audit logs access
  const auditResult = await makeRequest('GET', '/api/admin/audit-logs', null, token);
  console.log(`Admin audit logs: ${auditResult.status} ${auditResult.ok ? '✅' : '❌'}`);
  
  return {
    usersAccess: usersResult.ok,
    toolsAccess: toolsResult.ok,
    auditAccess: auditResult.ok
  };
}

async function testToolAccess(token, toolId, userType = 'unknown') {
  console.log(`\n🛠️ Testing ${userType} tool access for tool: ${toolId}`);
  
  // Test tool permission check
  const accessResult = await makeRequest('GET', `/api/user/tool-access/${toolId}`, null, token);
  console.log(`Tool access check: ${accessResult.status} ${accessResult.ok ? '✅' : '❌'}`);
  
  // Test tool activation
  const activateResult = await makeRequest('POST', '/api/seo-tools/activate', {
    toolId: toolId,
    input: { test: 'data' }
  }, token);
  console.log(`Tool activation: ${activateResult.status} ${activateResult.ok ? '✅' : '❌'}`);
  
  return {
    accessCheck: accessResult.ok,
    activation: activateResult.ok,
    accessData: accessResult.data,
    activateData: activateResult.data
  };
}

async function testPermissionManagement(adminToken, targetUserId, toolId) {
  console.log(`\n⚙️ Testing Permission Management...`);
  
  // Grant permission
  const grantResult = await makeRequest('POST', `/api/admin/users/${targetUserId}/tool-access`, {
    toolId: toolId
  }, adminToken);
  console.log(`Grant permission: ${grantResult.status} ${grantResult.ok ? '✅' : '❌'}`);
  
  // Check if permission was granted
  const checkResult = await makeRequest('GET', `/api/admin/users/${targetUserId}/tool-access`, null, adminToken);
  console.log(`Check granted permissions: ${checkResult.status} ${checkResult.ok ? '✅' : '❌'}`);
  
  // Revoke permission
  const revokeResult = await makeRequest('DELETE', `/api/admin/users/${targetUserId}/tool-access/${toolId}`, null, adminToken);
  console.log(`Revoke permission: ${revokeResult.status} ${revokeResult.ok ? '✅' : '❌'}`);
  
  return {
    grant: grantResult.ok,
    check: checkResult.ok,
    revoke: revokeResult.ok,
    grantData: grantResult.data,
    checkData: checkResult.data,
    revokeData: revokeResult.data
  };
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive RBAC Permission System Testing\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Test Admin Login
    console.log('\n📋 PHASE 1: ADMIN ACCOUNT TESTING');
    adminToken = await loginUser(ADMIN_ACCOUNT.email, ADMIN_ACCOUNT.password);
    if (!adminToken) {
      console.error('❌ CRITICAL: Admin login failed. Cannot continue testing.');
      return;
    }
    
    // 2. Test Admin Access
    const adminAccess = await testAdminAccess(adminToken);
    
    // 3. Test Admin Tool Access (bypass permissions)
    console.log('\n📋 Testing Admin Tool Access (Bypass)...');
    const adminToolTest = await testToolAccess(adminToken, SOCIAL_MEDIA_TOOL_ID, 'ADMIN');
    
    // 4. Test Member Login
    console.log('\n📋 PHASE 2: MEMBER ACCOUNT TESTING');
    memberToken = await loginUser(MEMBER_ACCOUNT.email, MEMBER_ACCOUNT.password);
    if (!memberToken) {
      console.error('❌ CRITICAL: Member login failed. Cannot continue testing.');
      return;
    }
    
    // 5. Test Member Limited Access
    console.log('\n🔒 Testing Member Limited Access...');
    const memberAdminResult = await makeRequest('GET', '/api/admin/users', null, memberToken);
    console.log(`Member admin access: ${memberAdminResult.status} ${memberAdminResult.ok ? '❌ SECURITY ISSUE' : '✅ Properly blocked'}`);
    
    // 6. Test Member Tool Access (should show permissions based on grants)
    const memberToolTest = await testToolAccess(memberToken, SOCIAL_MEDIA_TOOL_ID, 'MEMBER');
    
    // 7. Get Member User ID for permission management testing
    const memberProfileResult = await makeRequest('GET', '/api/users/me', null, memberToken);
    if (!memberProfileResult.ok) {
      console.error('❌ Could not get member profile for permission testing');
      return;
    }
    const memberUserId = memberProfileResult.data.userId;
    
    // 8. Test Permission Management Flow
    console.log('\n📋 PHASE 3: PERMISSION FLOW TESTING');
    const permissionTest = await testPermissionManagement(adminToken, memberUserId, SOCIAL_media_TOOL_ID);
    
    // 9. Test Tool Access After Permission Changes
    console.log('\n🔄 Testing Tool Access After Permission Changes...');
    
    // Test access after grant (should work)
    await testPermissionManagement(adminToken, memberUserId, SOCIAL_MEDIA_TOOL_ID);
    const afterGrantTest = await testToolAccess(memberToken, SOCIAL_MEDIA_TOOL_ID, 'MEMBER (after grant)');
    
    // Test access after revoke (should fail)
    await makeRequest('DELETE', `/api/admin/users/${memberUserId}/tool-access/${SOCIAL_MEDIA_TOOL_ID}`, null, adminToken);
    const afterRevokeTest = await testToolAccess(memberToken, SOCIAL_MEDIA_TOOL_ID, 'MEMBER (after revoke)');
    
    // 10. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n✅ ADMIN FUNCTIONALITY:');
    console.log(`  - Login: ${adminToken ? '✅' : '❌'}`);
    console.log(`  - Users Access: ${adminAccess.usersAccess ? '✅' : '❌'}`);
    console.log(`  - Tools Access: ${adminAccess.toolsAccess ? '✅' : '❌'}`);
    console.log(`  - Audit Access: ${adminAccess.auditAccess ? '✅' : '❌'}`);
    console.log(`  - Tool Bypass: ${adminToolTest.activation ? '✅' : '❌'}`);
    
    console.log('\n✅ MEMBER FUNCTIONALITY:');
    console.log(`  - Login: ${memberToken ? '✅' : '❌'}`);
    console.log(`  - Admin Blocked: ${!memberAdminResult.ok ? '✅' : '❌'}`);
    console.log(`  - Tool Access: ${memberToolTest.accessCheck ? '✅' : '❌'}`);
    
    console.log('\n✅ PERMISSION MANAGEMENT:');
    console.log(`  - Grant Permission: ${permissionTest.grant ? '✅' : '❌'}`);
    console.log(`  - Check Permission: ${permissionTest.check ? '✅' : '❌'}`);
    console.log(`  - Revoke Permission: ${permissionTest.revoke ? '✅' : '❌'}`);
    
    console.log('\n🎉 RBAC Testing Complete!');
    
  } catch (error) {
    console.error('\n❌ Testing failed with error:', error.message);
  }
}

// Run the test
runComprehensiveTest();