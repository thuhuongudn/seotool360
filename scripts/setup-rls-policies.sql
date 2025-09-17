-- ============================================
-- RLS SECURITY SETUP - Idempotent Migration
-- ============================================
-- This script enables Row Level Security and creates comprehensive 
-- security policies for all tables in the SEO AI Tools application.
-- It can be run multiple times safely (idempotent).

-- ============================================
-- ENABLE RLS ON ALL TABLES (Greenfield Safe)
-- ============================================

DO $$
BEGIN
    -- Enable RLS only if tables exist
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_tool_access') THEN
        ALTER TABLE user_tool_access ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tool_settings') THEN
        ALTER TABLE tool_settings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_log') THEN
        ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_media_posts') THEN
        ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'internal_link_suggestions') THEN
        ALTER TABLE internal_link_suggestions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seo_tools') THEN
        ALTER TABLE seo_tools ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tool_executions') THEN
        ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view and update their own profile
DROP POLICY IF EXISTS profile_own_access ON profiles;
CREATE POLICY profile_own_access ON profiles
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Admins can view all profiles  
DROP POLICY IF EXISTS profile_admin_access ON profiles;
CREATE POLICY profile_admin_access ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- USER_TOOL_ACCESS TABLE POLICIES
-- ============================================

-- Users can view their own tool access
DROP POLICY IF EXISTS user_tool_access_own_view ON user_tool_access;
CREATE POLICY user_tool_access_own_view ON user_tool_access
  FOR SELECT USING (auth.uid()::text = user_id);

-- Admins can manage all user tool access
DROP POLICY IF EXISTS user_tool_access_admin_manage ON user_tool_access;
CREATE POLICY user_tool_access_admin_manage ON user_tool_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- TOOL_SETTINGS TABLE POLICIES  
-- ============================================

-- Users can manage their own tool settings
DROP POLICY IF EXISTS tool_settings_own_access ON tool_settings;
CREATE POLICY tool_settings_own_access ON tool_settings
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Admins can view all tool settings (for support)
DROP POLICY IF EXISTS tool_settings_admin_view ON tool_settings;
CREATE POLICY tool_settings_admin_view ON tool_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- ADMIN_AUDIT_LOG TABLE POLICIES
-- ============================================

-- Only admins can read audit logs
DROP POLICY IF EXISTS admin_audit_log_admin_read ON admin_audit_log;
CREATE POLICY admin_audit_log_admin_read ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- Only service role can insert audit logs (system operations)
DROP POLICY IF EXISTS admin_audit_log_service_insert ON admin_audit_log;
CREATE POLICY admin_audit_log_service_insert ON admin_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- SEO_TOOLS TABLE POLICIES
-- ============================================

-- All authenticated users can read seo tools
DROP POLICY IF EXISTS seo_tools_authenticated_read ON seo_tools;
CREATE POLICY seo_tools_authenticated_read ON seo_tools
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify seo tools  
DROP POLICY IF EXISTS seo_tools_admin_modify ON seo_tools;
CREATE POLICY seo_tools_admin_modify ON seo_tools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- SOCIAL_MEDIA_POSTS TABLE POLICIES
-- ============================================

-- Users can only access their own posts
DROP POLICY IF EXISTS social_media_posts_owner_access ON social_media_posts;
CREATE POLICY social_media_posts_owner_access ON social_media_posts
  FOR ALL USING (owner_id = auth.uid()::text)
  WITH CHECK (owner_id = auth.uid()::text);

-- Admins can access all posts (for moderation/support)
DROP POLICY IF EXISTS social_media_posts_admin_override ON social_media_posts;
CREATE POLICY social_media_posts_admin_override ON social_media_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- INTERNAL_LINK_SUGGESTIONS TABLE POLICIES
-- ============================================

-- Users can only access their own internal link suggestions
DROP POLICY IF EXISTS internal_link_suggestions_owner_only ON internal_link_suggestions;
CREATE POLICY internal_link_suggestions_owner_only ON internal_link_suggestions
  FOR ALL USING (owner_id = auth.uid()::text)
  WITH CHECK (owner_id = auth.uid()::text);

-- Admins can access all suggestions (for moderation/support)
DROP POLICY IF EXISTS internal_link_suggestions_admin_override ON internal_link_suggestions;
CREATE POLICY internal_link_suggestions_admin_override ON internal_link_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- TOOL_EXECUTIONS TABLE POLICIES
-- ============================================

-- Users can only access their own tool executions
DROP POLICY IF EXISTS tool_executions_owner_only ON tool_executions;
CREATE POLICY tool_executions_owner_only ON tool_executions
  FOR ALL USING (owner_id = auth.uid()::text)
  WITH CHECK (owner_id = auth.uid()::text);

-- Admins can access all executions (for support/debugging)
DROP POLICY IF EXISTS tool_executions_admin_override ON tool_executions;
CREATE POLICY tool_executions_admin_override ON tool_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Verify all tables have RLS enabled and expected policy count
DO $$
BEGIN
    RAISE NOTICE 'RLS Security Setup Verification:';
    RAISE NOTICE 'Tables with RLS enabled: %', (
        SELECT COUNT(*) 
        FROM pg_tables t 
        WHERE t.schemaname = 'public' 
        AND t.rowsecurity = true
        AND t.tablename IN (
            'profiles', 'user_tool_access', 'tool_settings', 'admin_audit_log',
            'seo_tools', 'social_media_posts', 'internal_link_suggestions', 'tool_executions'
        )
    );
    RAISE NOTICE 'Total policies created: %', (
        SELECT COUNT(*) 
        FROM pg_policies p 
        WHERE p.tablename IN (
            'profiles', 'user_tool_access', 'tool_settings', 'admin_audit_log',
            'seo_tools', 'social_media_posts', 'internal_link_suggestions', 'tool_executions'
        )
    );
END $$;