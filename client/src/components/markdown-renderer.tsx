import { useMemo } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    try {
      if (!content || content.trim() === "") {
        return "";
      }

      const result = unified()
        .use(remarkParse) // Parse markdown
        .use(remarkGfm) // Support GitHub Flavored Markdown (tables, strikethrough, etc.)
        .use(remarkBreaks) // Convert line breaks to <br>
        .use(remarkRehype) // Convert from markdown to HTML
        .use(rehypeSanitize) // Sanitize HTML for security
        .use(rehypeStringify) // Convert to HTML string
        .processSync(content);

      return String(result);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return content; // Fallback to original content if parsing fails
    }
  }, [content]);

  if (!htmlContent.trim()) {
    return (
      <div className={`text-gray-500 dark:text-gray-400 italic ${className}`}>
        Không có nội dung
      </div>
    );
  }

  return (
    <div
      className={`prose prose-sm prose-gray dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // Custom CSS for better markdown rendering
        '--tw-prose-body': 'rgb(55 65 81)', // gray-700
        '--tw-prose-headings': 'rgb(17 24 39)', // gray-900
        '--tw-prose-lead': 'rgb(75 85 99)', // gray-600
        '--tw-prose-links': 'rgb(59 130 246)', // blue-500
        '--tw-prose-bold': 'rgb(17 24 39)', // gray-900
        '--tw-prose-counters': 'rgb(107 114 128)', // gray-500
        '--tw-prose-bullets': 'rgb(156 163 175)', // gray-400
        '--tw-prose-hr': 'rgb(229 231 235)', // gray-200
        '--tw-prose-quotes': 'rgb(17 24 39)', // gray-900
        '--tw-prose-quote-borders': 'rgb(229 231 235)', // gray-200
        '--tw-prose-captions': 'rgb(107 114 128)', // gray-500
        '--tw-prose-code': 'rgb(17 24 39)', // gray-900
        '--tw-prose-pre-code': 'rgb(229 231 235)', // gray-200
        '--tw-prose-pre-bg': 'rgb(249 250 251)', // gray-50
        '--tw-prose-th-borders': 'rgb(209 213 219)', // gray-300
        '--tw-prose-td-borders': 'rgb(229 231 235)', // gray-200
        
        // Dark mode colors
        '--tw-prose-invert-body': 'rgb(209 213 219)', // gray-300
        '--tw-prose-invert-headings': 'rgb(255 255 255)', // white
        '--tw-prose-invert-lead': 'rgb(156 163 175)', // gray-400
        '--tw-prose-invert-links': 'rgb(96 165 250)', // blue-400
        '--tw-prose-invert-bold': 'rgb(255 255 255)', // white
        '--tw-prose-invert-counters': 'rgb(156 163 175)', // gray-400
        '--tw-prose-invert-bullets': 'rgb(107 114 128)', // gray-500
        '--tw-prose-invert-hr': 'rgb(55 65 81)', // gray-700
        '--tw-prose-invert-quotes': 'rgb(243 244 246)', // gray-100
        '--tw-prose-invert-quote-borders': 'rgb(55 65 81)', // gray-700
        '--tw-prose-invert-captions': 'rgb(156 163 175)', // gray-400
        '--tw-prose-invert-code': 'rgb(255 255 255)', // white
        '--tw-prose-invert-pre-code': 'rgb(209 213 219)', // gray-300
        '--tw-prose-invert-pre-bg': 'rgb(15 23 42)', // slate-900
        '--tw-prose-invert-th-borders': 'rgb(75 85 99)', // gray-600
        '--tw-prose-invert-td-borders': 'rgb(55 65 81)', // gray-700
      } as React.CSSProperties}
    />
  );
}

export default MarkdownRenderer;