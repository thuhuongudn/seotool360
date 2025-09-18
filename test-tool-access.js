// Manual test script to debug tool access issues
console.log("=== TOOL ACCESS DEBUG TEST ===");

// Test 1: Check if we can reach the server
console.log("\n1. Testing server connection...");
fetch('http://localhost:5000/api/seo-tools')
  .then(res => res.json())
  .then(data => {
    console.log("✓ Server reachable");
    console.log("Available tools:", data.map(t => ({ id: t.id, name: t.name })));
    
    // Test 2: Try internal-link-helper tool without auth
    console.log("\n2. Testing internal-link-helper tool access without auth...");
    return fetch('http://localhost:5000/api/user/tool-access/03a6e711-aa9f-4118-a9f7-89b10db8a129');
  })
  .then(res => {
    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));
    return res.json();
  })
  .then(data => {
    console.log("Response data:", data);
  })
  .catch(err => {
    console.error("Error:", err);
  });

// Test 3: Check auth context in browser
console.log("\n3. Checking browser auth state...");
if (typeof window !== 'undefined' && window.supabase) {
  window.supabase.auth.getSession().then(({ data: { session } }) => {
    console.log("Supabase session:", session ? "EXISTS" : "NULL");
    if (session) {
      console.log("Access token length:", session.access_token?.length || 0);
      console.log("User ID:", session.user?.id);
    }
  });
}