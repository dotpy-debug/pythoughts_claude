import { useState, lazy, Suspense } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Tag } from '../../lib/supabase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { MentionsInput } from '../mentions/MentionsInput';
import { TagInput } from '../tags/TagInput';
import { sanitizeInput, sanitizeURL, isValidContentLength } from '../../utils/security';
import { checkContentSafety, shouldAutoBlock } from '../../utils/contentFilter';
import { autoFlagContent } from '../../utils/autoFlag';
import { logger } from '../../lib/logger';

const MarkdownEditor = lazy(() => import('../blog/MarkdownEditor').then(mod => ({ default: mod.MarkdownEditor })));

type CreatePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  postType: 'news' | 'blog';
};

const categories = ['Tech', 'Product', 'Design', 'Engineering', 'Culture', 'Other'];

export function CreatePostModal({ isOpen, onClose, postType }: CreatePostModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [imageUrlError, setImageUrlError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setTitleError('');
    setContentError('');
    setImageUrlError('');
    setSubmitting(true);

    try {
      // Validate title length
      if (!title.trim() || title.trim().length < 3) {
        setTitleError('Title must be at least 3 characters');
        setSubmitting(false);
        return;
      }

      if (title.trim().length > 200) {
        setTitleError('Title must not exceed 200 characters');
        setSubmitting(false);
        return;
      }

      // Validate content length (min 10, max 10000 chars)
      if (!isValidContentLength(content, 10, 10000)) {
        setContentError('Content must be between 10 and 10,000 characters');
        setSubmitting(false);
        return;
      }

      // Sanitize and validate image URL if provided
      let sanitizedImageUrl = '';
      if (imageUrl.trim()) {
        sanitizedImageUrl = sanitizeURL(imageUrl.trim());
        if (!sanitizedImageUrl) {
          setImageUrlError('Invalid image URL. Please use a valid HTTP/HTTPS URL.');
          setSubmitting(false);
          return;
        }
      }

      // Sanitize title (prevent XSS in title)
      const sanitizedTitle = sanitizeInput(title.trim());

      // Check content safety with automated filtering
      const combinedContent = `${title} ${content}`;
      const safetyCheck = checkContentSafety(combinedContent);

      // Block content that is flagged as critical
      if (shouldAutoBlock(combinedContent)) {
        setError(
          `Content was blocked due to security concerns: ${safetyCheck.issues.join(', ')}. Please review and modify your post.`
        );
        setSubmitting(false);
        return;
      }

      // Warn about content that has issues but allow posting
      if (!safetyCheck.isSafe && safetyCheck.severity !== 'critical') {
        logger.warn('Content safety issues detected', {
          userId: user.id,
          issues: safetyCheck.issues,
          severity: safetyCheck.severity
        });
      }

      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          title: sanitizedTitle,
          content: content.trim(),
          image_url: sanitizedImageUrl || null,
          category: category || null,
          author_id: user.id,
          post_type: postType,
          is_published: true,
          is_draft: false,
          published_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Save tags
      if (newPost && selectedTags.length > 0) {
        for (const tag of selectedTags) {
          // Create tag if it doesn't exist (new tag)
          let tagId = tag.id;
          if (!tagId) {
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('slug', tag.slug)
              .single();

            if (existingTag) {
              tagId = existingTag.id;
            } else {
              const { data: newTag, error: tagError } = await supabase
                .from('tags')
                .insert({
                  name: tag.name,
                  slug: tag.slug,
                  description: '',
                })
                .select('id')
                .single();

              if (tagError) {
                logger.error('Error creating tag', {
                  tagName: tag.name,
                  errorMessage: tagError.message,
                  userId: user.id
                });
                continue;
              }
              tagId = newTag.id;
            }
          }

          // Link tag to post
          await supabase.from('post_tags').insert({
            post_id: newPost.id,
            tag_id: tagId,
          });
        }
      }

      // Auto-flag content if it has safety issues
      if (newPost && !safetyCheck.isSafe) {
        await autoFlagContent(newPost.id, 'post', combinedContent, user.id);
      }

      logger.info('Post created successfully', { postId: newPost.id, userId: user.id, postType });

      setTitle('');
      setContent('');
      setImageUrl('');
      setCategory('');
      setSelectedTags([]);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      logger.error('Failed to create post', {
        errorMessage,
        userId: user.id,
        postType
      });
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Terminal Window Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
          </div>
          <div className="flex items-center space-x-2">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-gray-100 font-mono text-sm">
              create_{postType === 'blog' ? 'blog' : 'post'}.sh
            </span>
          </div>
          <div className="w-14" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-60px)]">
          <Input
            id="title"
            label="Title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a catchy title..."
            error={titleError}
          />

          <div>
            <label className="block text-sm font-mono text-gray-300 mb-1.5">
              <span className="text-terminal-green">$ </span>Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono"
            >
              <option value="">Select a category (optional)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-mono text-gray-300 mb-1.5">
              <span className="text-terminal-green">$ </span>Tags (max 5)
            </label>
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              maxTags={5}
            />
          </div>

          <Input
            id="imageUrl"
            label="Image URL"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg (optional)"
            error={imageUrlError}
          />

          <div>
            <label className="block text-sm font-mono text-gray-300 mb-1.5">
              <span className="text-terminal-green">$ </span>Content
            </label>

            {postType === 'blog' ? (
              <Suspense fallback={
                <div className="h-[500px] bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                  <Loader2 className="animate-spin text-terminal-green" size={32} />
                </div>
              }>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your blog post in markdown..."
                />
              </Suspense>
            ) : (
              <MentionsInput
                value={content}
                onChange={setContent}
                rows={6}
                placeholder="What's on your mind? Use @ to mention users"
                className={`w-full px-4 py-2.5 rounded border ${
                  contentError ? 'border-red-500' : 'border-gray-700'
                } bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono resize-none placeholder:text-gray-500`}
              />
            )}

            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-gray-500 font-mono">
                {content.length} / 10,000 characters (min 10)
              </p>
              {contentError && (
                <p className="text-xs text-red-400 font-mono">
                  <span className="text-red-500">! </span>{contentError}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono">
              <span className="text-red-500">! </span>{error}
            </div>
          )}

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="submit"
              disabled={submitting}
              loading={submitting}
              variant="terminal"
              className="flex-1"
            >
              {submitting ? 'publishing...' : 'publish'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
            >
              cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
