#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

async function runMigration() {
  try {
    console.log('');
    console.log('========================================');
    console.log('RUN SQL MIGRATION: UPDATE AUTO-GRANT TRIGGER');
    console.log('========================================');
    console.log('');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'update-auto-grant-trigger.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration...');
    console.log('');

    // Try to execute via direct query
    // Note: Supabase may not support executing raw SQL directly
    // We'll need to use the SQL editor in Supabase dashboard

    console.log('⚠️  Direct SQL execution via Supabase client is limited');
    console.log('');
    console.log('Please run this SQL in one of these ways:');
    console.log('');
    console.log('1. Supabase Dashboard:');
    console.log('   - Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('   - Paste the content of: scripts/update-auto-grant-trigger.sql');
    console.log('   - Click "Run"');
    console.log('');
    console.log('2. Heroku Postgres:');
    console.log('   - Run: heroku pg:psql -a seotool360 < scripts/update-auto-grant-trigger.sql');
    console.log('');
    console.log('3. Local psql:');
    console.log('   - Run: psql "$DATABASE_URL" -f scripts/update-auto-grant-trigger.sql');
    console.log('');
    console.log('📄 SQL to execute:');
    console.log('========================================');
    console.log(sql);
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
