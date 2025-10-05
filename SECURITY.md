# Security Best Practices

## Environment Variables

### ⚠️ Critical: Client vs Server Environment Variables

**Understanding VITE_* Prefix:**

Vite exposes any environment variable prefixed with `VITE_` to the client-side bundle. This means:

- ✅ `VITE_SUPABASE_URL` → Exposed to browser (safe - public URL)
- ✅ `VITE_SUPABASE_ANON_KEY` → Exposed to browser (safe - public key with RLS)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` → Server-only (bypasses RLS)

### CLIENT-SAFE Variables (can use VITE_* prefix)

These variables are safe to expose in the browser because they're either public or protected by other security measures:

```env
# Supabase public configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon/public key)

# Third-party API keys (client-side usage)
VITE_OPENAI_API_KEY=sk-... (for client-side AI features)
VITE_GEMINI_API_KEY=AIza... (for Gemini API)
VITE_GOOGLE_MAPS_API_KEY=AIza... (for Google Maps)
VITE_TINYMCE_KEY=... (for TinyMCE editor)
```

### 🔐 SERVER-ONLY Variables (NEVER add VITE_* prefix)

These variables must **NEVER** be exposed to the client:

```env
# Supabase admin keys (bypass RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (admin key)
SUPABASE_DB_URL=postgresql://... (direct database access)

# Session secrets
SESSION_SECRET=... (for session encryption)

# Database credentials
DATABASE_URL=postgresql://...
PGHOST=...
PGUSER=...
PGPASSWORD=...
```

## Supabase Authentication Architecture

### Client-Side Authentication (Secure)

```typescript
// ✅ CORRECT: Use Supabase Auth with anon key
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Users authenticate via Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Session tokens are JWT-based and respect RLS policies
```

### Server-Side Operations (Secure)

```typescript
// ✅ CORRECT: Use service role key only on server
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-only
);

// Admin operations that bypass RLS
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*'); // No RLS restrictions
```

### ❌ ANTI-PATTERNS (Never Do This)

```typescript
// ❌ WRONG: Exposing service role key to client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SERVICE_ROLE_KEY, // NEVER do this!
);

// ❌ WRONG: Sending service role key in HTTP headers
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SERVICE_ROLE_KEY}`
  }
});

// ❌ WRONG: Hardcoding tokens
const ADMIN_TOKEN = 'eyJ...'; // Never hardcode!
```

## Row Level Security (RLS)

### Why RLS is Critical

The `VITE_SUPABASE_ANON_KEY` is intentionally public - anyone can see it in your JavaScript bundle. Security comes from:

1. **RLS Policies** - Database-level access control
2. **JWT Claims** - User identity embedded in session token
3. **Role-Based Access** - Policies check user roles

### Example RLS Policy

```sql
-- Only allow users to read their own data
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Only admins can update user roles
CREATE POLICY "Admins can update roles"
ON user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

### Verify RLS is Enabled

```bash
# Run RLS verification script
node scripts/verify-rls-security.cjs

# Or check manually in Supabase Dashboard
# Database → Tables → Select table → "RLS enabled" toggle
```

## API Security Checklist

### Before Deploying

- [ ] No service_role keys in client code
- [ ] All server-only vars lack `VITE_` prefix
- [ ] RLS policies enabled on all tables
- [ ] No hardcoded secrets in code
- [ ] `.env` files in `.gitignore`
- [ ] Production secrets set in Heroku Config Vars

### Regular Audits

```bash
# Search for potential key leaks
rg -n "service_role|SUPABASE_SERVICE|Bearer\s+eyJ" -S

# Check for hardcoded keys
rg -n "sk-[A-Za-z0-9]{40,}" -S  # OpenAI keys
rg -n "AIza[A-Za-z0-9_-]{35}" -S  # Google API keys

# Verify environment variable usage
rg -n "VITE_.*SERVICE|VITE_.*SECRET" -S  # Should be empty!
```

## Incident Response

### If Service Role Key is Exposed

1. **Immediate Action:**
   ```bash
   # Rotate keys in Supabase Dashboard
   # Settings → API → Reset service_role key
   ```

2. **Update Environment:**
   ```bash
   # Update Heroku config
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=new_key

   # Update local .env
   echo "SUPABASE_SERVICE_ROLE_KEY=new_key" >> .env
   ```

3. **Verify No Exposure:**
   ```bash
   # Check git history
   git log -p --all -S "old_key"

   # If found in history, consider repo as compromised
   # Rotate all keys and review audit logs
   ```

### If Database Credentials are Exposed

1. **Rotate credentials in Supabase Dashboard**
2. **Review database audit logs for unauthorized access**
3. **Update connection strings everywhere:**
   - Heroku Config Vars
   - Local `.env`
   - Any CI/CD secrets

## Security Headers

Ensure your server sets these headers:

```typescript
// server/index.ts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  next();
});
```

## Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Audit Report](./docs/SECURITY_AUDIT_SUPABASE_KEYS.md)

---

**Last Updated:** 2025-10-06
**Next Audit:** Quarterly
