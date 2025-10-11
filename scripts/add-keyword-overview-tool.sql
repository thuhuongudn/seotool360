-- Add Keyword Overview tool to seo_tools table
-- Premium tool for comprehensive keyword analysis with real data from Google Ads, SERP, and GSC
-- AI clustering keywords, search intent analysis, content gap identification, and detailed strategy creation

-- Check if the tool already exists before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seo_tools WHERE name = 'keyword-overview') THEN
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
      'keyword-overview',
      'Keyword Overview',
      'Phân tích toàn diện keyword với dữ liệu thực từ Google Ads, SERP và GSC. AI clustering keywords, phân tích search intent, tìm content gaps và tạo keyword strategy chi tiết với roadmap 90 ngày. Công cụ giúp bạn hiểu rõ cơ hội keyword, cạnh tranh và xây dựng chiến lược nội dung dựa trên dữ liệu thực tế.',
      'Target',
      'bg-blue-100',
      'text-blue-600',
      'google-insights',
      '/n8n/keyword-overview',
      'active',
      '#Google_Insights'
    );
  END IF;
END $$;
