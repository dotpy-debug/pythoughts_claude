import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useEffect, useState } from 'react';
import { generateTocData, injectHeadingIds } from '../../utils/toc-generator';
import { TableOfContents } from '../blog/TableOfContents';

type MarkdownRendererProperties = {
  content: string;
  showToc?: boolean;
};

export default function MarkdownRenderer({ content, showToc = true }: MarkdownRendererProperties) {
  const [processedContent, setProcessedContent] = useState(content);
  const [tocData, setTocData] = useState<ReturnType<typeof generateTocData> | null>(null);

  useEffect(() => {
    try {
      const toc = generateTocData(content, 'markdown');
      setTocData(toc);

      const temporaryDiv = document.createElement('div');
      temporaryDiv.innerHTML = content;
      const withIds = injectHeadingIds(temporaryDiv.innerHTML);
      setProcessedContent(withIds);
    } catch (error) {
      console.warn('Failed to process markdown content:', error);
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
              h1: ({ node: _node, ...properties }) => (
                <h1 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              h2: ({ node: _node, ...properties }) => (
                <h2 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              h3: ({ node: _node, ...properties }) => (
                <h3 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              h4: ({ node: _node, ...properties }) => (
                <h4 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              h5: ({ node: _node, ...properties }) => (
                <h5 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              h6: ({ node: _node, ...properties }) => (
                <h6 {...properties} style={{ scrollMarginTop: '80px' }} />
              ),
              img: ({ node: _node, ...properties }) => (
                <img
                  {...properties}
                  className="rounded-lg max-w-full h-auto my-6"
                  loading="lazy"
                  alt={properties.alt || 'Blog image'}
                />
              ),
              iframe: ({ node: _node, ...properties }) => {
                const source = properties.src || '';
                const isYoutube =
                  source.includes('youtube.com') || source.includes('youtu.be');

                if (isYoutube) {
                  return (
                    <div className="relative aspect-video my-6 rounded-lg overflow-hidden">
                      <iframe
                        {...properties}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }

                return <iframe {...properties} className="w-full rounded-lg my-6" />;
              },
              a: ({ node: _node, ...properties }) => (
                <a
                  {...properties}
                  className="text-blue-400 hover:text-blue-300 underline"
                  target={properties.href?.startsWith('http') ? '_blank' : undefined}
                  rel={properties.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                />
              ),
              code: ({ node: _node, className, children, ...properties }) => {
                const isInline = !className?.includes('language-');
                if (isInline) {
                  return (
                    <code
                      className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono"
                      {...properties}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className={`block bg-gray-900 p-4 rounded-lg overflow-x-auto ${className || ''}`}
                    {...properties}
                  >
                    {children}
                  </code>
                );
              },
              table: ({ node: _node, ...properties }) => (
                <div className="overflow-x-auto my-6">
                  <table
                    className="min-w-full border-collapse border border-gray-700"
                    {...properties}
                  />
                </div>
              ),
              th: ({ node: _node, ...properties }) => (
                <th
                  className="border border-gray-700 px-4 py-2 bg-gray-800 text-left font-semibold"
                  {...properties}
                />
              ),
              td: ({ node: _node, ...properties }) => (
                <td className="border border-gray-700 px-4 py-2" {...properties} />
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
