import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useEffect, useState } from 'react';
import { generateTocData, injectHeadingIds } from '../../utils/toc-generator';
import { TableOfContents } from '../blog/TableOfContents';

type MarkdownRendererProps = {
  content: string;
  showToc?: boolean;
};

export default function MarkdownRenderer({ content, showToc = true }: MarkdownRendererProps) {
  const [processedContent, setProcessedContent] = useState(content);
  const [tocData, setTocData] = useState<ReturnType<typeof generateTocData> | null>(null);

  useEffect(() => {
    try {
      const toc = generateTocData(content, 'markdown');
      setTocData(toc);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const withIds = injectHeadingIds(tempDiv.innerHTML);
      setProcessedContent(withIds);
    } catch (error) {
      setProcessedContent(content);
      setTocData(null);
    }
  }, [content]);

  const hasToc = showToc && tocData && tocData.headingCount > 0;

  return (
    <div className={`flex gap-8 ${hasToc ? 'lg:grid lg:grid-cols-[1fr_250px]' : ''}`}>
      <div className="flex-1 min-w-0">
        <article className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              h2: ({ node, ...props }) => (
                <h2 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              h3: ({ node, ...props }) => (
                <h3 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              h4: ({ node, ...props }) => (
                <h4 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              h5: ({ node, ...props }) => (
                <h5 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              h6: ({ node, ...props }) => (
                <h6 {...props} style={{ scrollMarginTop: '80px' }} />
              ),
              img: ({ node, ...props }) => (
                <img
                  {...props}
                  className="rounded-lg max-w-full h-auto my-6"
                  loading="lazy"
                  alt={props.alt || 'Blog image'}
                />
              ),
              iframe: ({ node, ...props }) => {
                const src = props.src || '';
                const isYoutube =
                  src.includes('youtube.com') || src.includes('youtu.be');

                if (isYoutube) {
                  return (
                    <div className="relative aspect-video my-6 rounded-lg overflow-hidden">
                      <iframe
                        {...props}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }

                return <iframe {...props} className="w-full rounded-lg my-6" />;
              },
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  className="text-blue-400 hover:text-blue-300 underline"
                  target={props.href?.startsWith('http') ? '_blank' : undefined}
                  rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                />
              ),
              code: ({ node, inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code
                      className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className={`block bg-gray-900 p-4 rounded-lg overflow-x-auto ${className || ''}`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-6">
                  <table
                    className="min-w-full border-collapse border border-gray-700"
                    {...props}
                  />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border border-gray-700 px-4 py-2 bg-gray-800 text-left font-semibold"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-gray-700 px-4 py-2" {...props} />
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </article>
      </div>

      {hasToc && (
        <div className="hidden lg:block">
          <TableOfContents items={tocData.items} />
        </div>
      )}
    </div>
  );
}
