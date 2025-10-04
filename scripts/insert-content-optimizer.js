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

async function insertContentOptimizerTool() {
  try {
    console.log('🔧 Inserting Content Optimizer tool into seo_tools table...');
    console.log('');

    const { data, error } = await supabase
      .from('seo_tools')
      .insert({
        name: 'content-optimizer',
        title: 'Content Optimizer',
        description: 'Tối ưu hóa nội dung toàn diện với phân tích SEO, khả năng đọc và giọng điệu. Nhận gợi ý cải thiện dựa trên AI và đối thủ cạnh tranh hàng đầu.',
        icon: 'FileText',
        icon_bg_color: 'bg-indigo-100',
        icon_color: 'text-indigo-600',
        category: 'content-seo',
        n8n_endpoint: '/n8n/content-optimizer',
        status: 'active',
        tags: '#contentseo'
      })
      .select();

    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        console.log('⚠️  Tool already exists in database');
        console.log('');

        // Try to update instead
        console.log('🔄 Updating existing tool...');
        const { data: updateData, error: updateError } = await supabase
          .from('seo_tools')
          .update({
            title: 'Content Optimizer',
            description: 'Tối ưu hóa nội dung toàn diện với phân tích SEO, khả năng đọc và giọng điệu. Nhận gợi ý cải thiện dựa trên AI và đối thủ cạnh tranh hàng đầu.',
            icon: 'FileText',
            icon_bg_color: 'bg-indigo-100',
            icon_color: 'text-indigo-600',
            category: 'content-seo',
            n8n_endpoint: '/n8n/content-optimizer',
            status: 'active',
            tags: '#contentseo'
          })
          .eq('name', 'content-optimizer')
          .select();

        if (updateError) {
          console.error('❌ Update failed:', updateError.message);
          process.exit(1);
        }

        console.log('✅ Tool updated successfully!');
        console.log('');
        console.log('📊 Updated tool:');
        console.log(JSON.stringify(updateData, null, 2));
      } else {
        console.error('❌ Insert failed:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        process.exit(1);
      }
    } else {
      console.log('✅ Tool inserted successfully!');
      console.log('');
      console.log('📊 Inserted tool:');
      console.log(JSON.stringify(data, null, 2));
    }

    console.log('');
    console.log('🔍 Verifying tool in database...');

    const { data: verifyData, error: verifyError } = await supabase
      .from('seo_tools')
      .select('*')
      .eq('name', 'content-optimizer')
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Verification successful!');
    console.log('');
    console.log('📋 Tool details:');
    console.log(`   ID: ${verifyData.id}`);
    console.log(`   Name: ${verifyData.name}`);
    console.log(`   Title: ${verifyData.title}`);
    console.log(`   Category: ${verifyData.category}`);
    console.log(`   Status: ${verifyData.status}`);
    console.log(`   Tags: ${verifyData.tags}`);
    console.log('');
    console.log('✅ Migration complete!');
    console.log('');
    console.log('🎉 Content Optimizer is now available at: /content-optimizer');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the insertion
insertContentOptimizerTool();
