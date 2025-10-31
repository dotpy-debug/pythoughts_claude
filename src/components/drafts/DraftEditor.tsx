import { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal, Save, Eye, Send, X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Category } from '../../lib/supabase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { TagInput } from '../tags/TagBadge';
import { ImageUpload } from '../uploads/ImageUpload';
import { sanitizeInput, sanitizeURL, isValidContentLength } from '../../utils/security';
import { useDraftRecovery } from '../../hooks/useDraftRecovery';
import { getActiveCategories } from '../../actions/categories';

type DraftEditorProps = {
  draftId?: string;
  postType: 'news' | 'blog';
  onClose: () => void;
  onPublish?: () => void;
};

export function DraftEditor({ draftId, postType, onClose, onPublish }: DraftEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const currentDraftIdRef = useRef<string | undefined>(draftId);

  // Draft recovery system
  const {
    saveDraftBackup,
    loadDraftBackup,
    clearDraftBackup,
    hasRecoverableDraft,
    getRecoveryMessage,
    hasShownRecoveryPrompt,
  } = useDraftRecovery(postType, draftId);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  const loadDraft = useCallback(async () => {
    if (!draftId || !user) return;

    try {
      const { data, error } = await supabase
        .from('post_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('author_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setSubtitle(data.subtitle || '');
        setImageUrl(data.image_url);
        setCategory(data.category);
        setTags(data.tags || []);
        setLastSaved(new Date(data.updated_at));
        if (data.scheduled_publish_at) {
          setSchedulePublish(true);
          // Convert UTC to local datetime-local format
          const localDate = new Date(data.scheduled_publish_at);
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const hours = String(localDate.getHours()).padStart(2, '0');
          const minutes = String(localDate.getMinutes()).padStart(2, '0');
          setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      setError('Failed to load draft');
    }
  }, [draftId, user]);

  useEffect(() => {
    if (draftId) {
      loadDraft();
    }
  }, [draftId, loadDraft]);

  // Check for recoverable draft on mount
  useEffect(() => {
    if (!draftId && !hasShownRecoveryPrompt.current && hasRecoverableDraft()) {
      setShowRecoveryPrompt(true);
      hasShownRecoveryPrompt.current = true;
    }
  }, [draftId, hasRecoverableDraft, hasShownRecoveryPrompt]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await getActiveCategories();
      setCategories(cats);
    };
    fetchCategories();
  }, []);

  const saveDraft = useCallback(async (autoSave = false) => {
    if (!user) return;

    if (!autoSave) {
      setSaving(true);
    }

    try {
      const draftData = {
        title: title.trim() || 'Untitled Draft',
        subtitle: subtitle.trim(),
        content: content,
        author_id: user.id,
        post_type: postType,
        image_url: imageUrl.trim(),
        category: category,
        tags: tags,
        auto_saved_at: new Date().toISOString(),
        scheduled_publish_at: schedulePublish && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : null,
      };

      if (currentDraftIdRef.current) {
        const { error } = await supabase
          .from('post_drafts')
          .update(draftData)
          .eq('id', currentDraftIdRef.current)
          .eq('author_id', user.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('post_drafts')
          .insert(draftData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          currentDraftIdRef.current = data.id;
        }
      }

      setLastSaved(new Date());
      setError('');
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!autoSave) {
        setError('Failed to save draft');
      }
    } finally {
      if (!autoSave) {
        setSaving(false);
      }
    }
  }, [user, title, content, subtitle, imageUrl, category, tags, postType, schedulePublish, scheduledDateTime]);

  useEffect(() => {
    if (content.length > 0 || title.length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft(true);
        // Also backup to localStorage
        saveDraftBackup({
          title,
          content,
          subtitle,
          imageUrl,
          category,
          tags,
        });
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, subtitle, imageUrl, category, tags, saveDraft, saveDraftBackup]);

  const handleRecoverDraft = useCallback(() => {
    const recoveredDraft = loadDraftBackup();
    if (recoveredDraft) {
      setTitle(recoveredDraft.title);
      setContent(recoveredDraft.content);
      setSubtitle(recoveredDraft.subtitle || '');
      setImageUrl(recoveredDraft.imageUrl || '');
      setCategory(recoveredDraft.category || '');
      setTags(recoveredDraft.tags || []);
    }
    setShowRecoveryPrompt(false);
  }, [loadDraftBackup]);

  const handleDismissRecovery = useCallback(() => {
    clearDraftBackup();
    setShowRecoveryPrompt(false);
  }, [clearDraftBackup]);

  const handlePublish = async () => {
    if (!user) return;

    setError('');
    setPublishing(true);

    try {
      if (!title.trim() || title.trim().length < 3) {
        setError('Title must be at least 3 characters');
        setPublishing(false);
        return;
      }

      if (!isValidContentLength(content, 10, 50000)) {
        setError('Content must be between 10 and 50,000 characters');
        setPublishing(false);
        return;
      }

      // Validate scheduled datetime if scheduling
      if (schedulePublish) {
        if (!scheduledDateTime) {
          setError('Please select a date and time for scheduled publishing');
          setPublishing(false);
          return;
        }

        const scheduledDate = new Date(scheduledDateTime);
        const now = new Date();

        if (scheduledDate <= now) {
          setError('Scheduled time must be in the future');
          setPublishing(false);
          return;
        }
      }

      let sanitizedImageUrl = '';
      if (imageUrl.trim()) {
        sanitizedImageUrl = sanitizeURL(imageUrl.trim());
        if (!sanitizedImageUrl) {
          setError('Invalid image URL');
          setPublishing(false);
          return;
        }
      }

      const sanitizedTitle = sanitizeInput(title.trim());
      const sanitizedSubtitle = sanitizeInput(subtitle.trim());

      // If scheduling, save the draft with scheduled time instead of publishing
      if (schedulePublish) {
        await saveDraft(false);
        onClose();
        return;
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          title: sanitizedTitle,
          subtitle: sanitizedSubtitle,
          content: content.trim(),
          image_url: sanitizedImageUrl || null,
          category: category || null,
          author_id: user.id,
          post_type: postType,
          is_published: true,
          is_draft: false,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (postError) throw postError;

      if (post && tags.length > 0) {
        for (const tagName of tags) {
          const slug = tagName.toLowerCase().replace(/\s+/g, '-');

          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          let tagId = existingTag?.id;

          if (!tagId) {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                name: tagName,
                slug: slug,
                description: '',
              })
              .select()
              .single();

            if (tagError) throw tagError;
            tagId = newTag.id;
          }

          await supabase.from('post_tags').insert({
            post_id: post.id,
            tag_id: tagId,
          });
        }
      }

      if (currentDraftIdRef.current) {
        await supabase
          .from('post_drafts')
          .delete()
          .eq('id', currentDraftIdRef.current)
          .eq('author_id', user.id);
      }

      // Clear localStorage backup after successful publish
      clearDraftBackup();

      onPublish?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post');
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
          </div>
          <div className="flex items-center space-x-3">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-gray-100 font-mono text-sm">
              draft_editor.md
            </span>
            {lastSaved && (
              <span className="text-xs text-gray-500 font-mono">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
            >
              <Eye size={14} className="mr-1" />
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={() => saveDraft(false)}
              disabled={saving}
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
            >
              <Save size={14} className="mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Recovery Prompt */}
        {showRecoveryPrompt && (
          <div className="mx-6 mt-4 p-4 bg-orange-900/20 border border-orange-500/50 rounded-lg flex items-start space-x-3">
            <AlertCircle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm text-orange-100 font-mono mb-3">
                {getRecoveryMessage()}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleRecoverDraft}
                  variant="terminal"
                  size="sm"
                  className="font-mono text-xs"
                >
                  Recover Draft
                </Button>
                <Button
                  onClick={handleDismissRecovery}
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showPreview ? (
            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl font-bold mb-2">{title || 'Untitled'}</h1>
              {subtitle && <p className="text-xl text-gray-400 mb-4 italic">{subtitle}</p>}
              {imageUrl && <img src={imageUrl} alt={title} className="w-full rounded mb-4" />}
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          ) : (
            <>
              <Input
                id="title"
                label="Title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
              />

              {postType === 'blog' && (
                <Input
                  id="subtitle"
                  label="Subtitle (optional)"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Add a subtitle or excerpt..."
                />
              )}

              <div>
                <label className="block text-sm font-mono text-gray-300 mb-1.5">
                  <span className="text-terminal-green">$ </span>Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <ImageUpload
                currentImageUrl={imageUrl}
                onImageChange={setImageUrl}
                maxSizeMB={5}
              />

              {postType === 'blog' && (
                <TagInput selectedTags={tags} onChange={setTags} maxTags={5} />
              )}

              <div>
                <label className="block text-sm font-mono text-gray-300 mb-1.5">
                  <span className="text-terminal-green">$ </span>Content
                </label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={postType === 'blog' ? 20 : 12}
                  className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono resize-none placeholder:text-gray-500"
                  placeholder={postType === 'blog' ? 'Write your story...' : "What's on your mind?"}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-500 font-mono">
                    {content.length.toLocaleString()} characters
                  </p>
                </div>
              </div>

              {/* Scheduled Publishing */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Clock size={18} className="text-terminal-green" />
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedulePublish}
                      onChange={(e) => {
                        setSchedulePublish(e.target.checked);
                        if (!e.target.checked) {
                          setScheduledDateTime('');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-terminal-green focus:ring-terminal-green focus:ring-2"
                    />
                    <span className="text-sm font-mono text-gray-300">Schedule for later</span>
                  </label>
                </div>

                {schedulePublish && (
                  <div className="space-y-2 pl-7">
                    <label className="block text-xs font-mono text-gray-400">
                      Publish on
                    </label>
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} className="text-gray-500" />
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="flex-1 px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono text-sm"
                      />
                    </div>
                    {scheduledDateTime && (
                      <p className="text-xs text-gray-500 font-mono pl-5">
                        Will publish on {new Date(scheduledDateTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono">
              <span className="text-red-500">! </span>{error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 p-4 flex items-center justify-between shrink-0">
          <Button
            onClick={onClose}
            variant="ghost"
            className="font-mono"
          >
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => saveDraft(false)}
              disabled={saving}
              variant="secondary"
              className="font-mono"
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              variant="terminal"
              className="font-mono"
            >
              {schedulePublish ? (
                <>
                  <Clock size={16} className="mr-2" />
                  {publishing ? 'Scheduling...' : 'Schedule Post'}
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  {publishing ? 'Publishing...' : 'Publish Now'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}