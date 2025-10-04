-- Add Content Optimizer tool to seo_tools table
-- Based on Semrush Content Optimizer features

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
  'content-optimizer',
  'Content Optimizer',
  'Tối ưu hóa nội dung toàn diện với phân tích SEO, khả năng đọc và giọng điệu. Nhận gợi ý cải thiện dựa trên AI và đối thủ cạnh tranh hàng đầu.',
  'FileText',
  'bg-indigo-100',
  'text-indigo-600',
  'content-seo',
  '/n8n/content-optimizer',
  'active',
  '#contentseo'
) ON CONFLICT (name) DO NOTHING;
