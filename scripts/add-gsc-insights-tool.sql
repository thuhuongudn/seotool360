-- Add GSC Insights tool to seo_tools table
-- Provides content creators with high-level overview of content performance in Google Search

-- Check if the tool already exists before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seo_tools WHERE name = 'gsc-insights') THEN
    INSERT INTO seo_tools (
      name,
      title,
      description,
      icon,
      icon_bg_color,
      icon_color,
      category,
      n8n_endpoint,
      status,
      tags
    ) VALUES (
      'gsc-insights',
      'Search Console Insights',
      'Cung cấp cho người tạo nội dung cái nhìn tổng quan về hiệu suất nội dung trên Google Search và mức độ tương tác của người dùng trên website của họ.',
      'BarChart3',
      'bg-green-100',
      'text-green-600',
      'google-insights',
      '/n8n/gsc-insights',
      'active',
      '#Google_Insights'
    );
  END IF;
END $$;

-- Update keyword-planner and search-intent tags to #Google_Insights
UPDATE seo_tools
SET tags = '#Google_Insights', category = 'google-insights'
WHERE name IN ('keyword-planner', 'search-intent');
