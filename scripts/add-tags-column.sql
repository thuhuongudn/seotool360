-- Add tags column to seo_tools table
ALTER TABLE seo_tools ADD COLUMN IF NOT EXISTS tags TEXT;

-- Update existing tools with appropriate tags
UPDATE seo_tools SET tags = '#contentseo' WHERE name IN (
  'topical-map',
  'search-intent',
  'internal-link-helper',
  'article-rewriter',
  'social-media',
  'schema-markup',
  'keyword-planner'
);

UPDATE seo_tools SET tags = '#index' WHERE name IN (
  'bing-indexing',
  'google-indexing',
  'google-checker'
);

-- Leave other tools with NULL tags (no specific category)

-- Add Keyword Planner if it doesn't exist
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
  'keyword-planner',
  'Keyword Planner',
  'Tìm kiếm và phân tích từ khóa hiệu quả với dữ liệu từ Google Ads API.',
  'Target',
  'bg-emerald-100',
  'text-emerald-600',
  'content-seo',
  '/n8n/keyword-planner',
  'active',
  '#contentseo'
) ON CONFLICT (name) DO NOTHING;