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
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function insertKeywordOverviewTool() {
  try {
    console.log('');
    console.log('========================================');
    console.log('INSERT KEYWORD OVERVIEW TOOL');
    console.log('========================================');
    console.log('');

    // Check if tool already exists
    const { data: existing, error: checkError } = await supabase
      .from('seo_tools')
      .select('id, name')
      .eq('name', 'keyword-overview')
      .maybeSingle();

    if (checkError) {
      throw new Error(`Error checking existing tool: ${checkError.message}`);
    }

    if (existing) {
      console.log('⚠️  Tool "keyword-overview" already exists with ID:', existing.id);
      console.log('');
      return;
    }

    // Insert the new tool
    const { data, error } = await supabase
      .from('seo_tools')
      .insert([
        {
          name: 'keyword-overview',
          title: 'Keyword Overview',
          description: 'Phân tích toàn diện keyword với dữ liệu thực từ Google Ads, SERP và GSC. AI clustering keywords, phân tích search intent, tìm content gaps và tạo keyword strategy chi tiết với roadmap 90 ngày. Công cụ giúp bạn hiểu rõ cơ hội keyword, cạnh tranh và xây dựng chiến lược nội dung dựa trên dữ liệu thực tế.',
          icon: 'Target',
          icon_bg_color: 'bg-blue-100',
          icon_color: 'text-blue-600',
          category: 'google-insights',
          n8n_endpoint: '/n8n/keyword-overview',
          status: 'active',
          tags: '#Google_Insights'
        }
      ])
      .select();

    if (error) {
      throw new Error(`Error inserting tool: ${error.message}`);
    }

    console.log('✅ Successfully inserted "Keyword Overview" tool');
    console.log('');
    console.log('Tool details:', JSON.stringify(data[0], null, 2));
    console.log('');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertKeywordOverviewTool();
