import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * Publish scheduled posts that are due
 * This should be called periodically by a cron job or background process
 */
export async function publishScheduledPosts(): Promise<number> {
  try {
    const now = new Date().toISOString();

    // Find all drafts with scheduled_publish_at <= now
    const { data: duePostsDrafts, error: fetchError } = await supabase
      .from('post_drafts')
      .select('*')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now);

    if (fetchError) {
      logger.error('Error fetching scheduled posts', { error: fetchError });
      return 0;
    }

    if (!duePostsDrafts || duePostsDrafts.length === 0) {
      return 0;
    }

    let publishedCount = 0;

    for (const draft of duePostsDrafts) {
      try {
        // Create the post
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            title: draft.title,
            subtitle: draft.subtitle || '',
            content: draft.content,
            image_url: draft.image_url || null,
            category: draft.category || null,
            author_id: draft.author_id,
            post_type: draft.post_type,
            is_published: true,
            is_draft: false,
            published_at: draft.scheduled_publish_at, // Use the scheduled time as published time
          })
          .select()
          .single();

        if (postError) {
          logger.error('Error publishing scheduled post', {
            error: postError,
            draftId: draft.id
          });
          continue;
        }

        // Add tags if any
        if (post && draft.tags && Array.isArray(draft.tags) && draft.tags.length > 0) {
          for (const tagName of draft.tags) {
            const slug = tagName.toLowerCase().replace(/\s+/g, '-');

            // Find or create tag
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

              if (tagError) {
                logger.error('Error creating tag for scheduled post', {
                  error: tagError,
                  tagName
                });
                continue;
              }
              tagId = newTag.id;
            }

            // Link tag to post
            await supabase.from('post_tags').insert({
              post_id: post.id,
              tag_id: tagId,
            });
          }
        }

        // Delete the draft
        const { error: deleteError } = await supabase
          .from('post_drafts')
          .delete()
          .eq('id', draft.id);

        if (deleteError) {
          logger.error('Error deleting published draft', {
            error: deleteError,
            draftId: draft.id
          });
        }

        logger.info('Scheduled post published', {
          postId: post.id,
          draftId: draft.id,
          scheduledTime: draft.scheduled_publish_at
        });
        publishedCount++;
      } catch (error) {
        logger.error('Error processing scheduled post', {
          error,
          draftId: draft.id
        });
      }
    }

    return publishedCount;
  } catch (error) {
    logger.error('Error in publishScheduledPosts', { error });
    return 0;
  }
}

/**
 * Get count of pending scheduled posts for a user
 */
export async function getUserScheduledPostsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .not('scheduled_publish_at', 'is', null);

    if (error) {
      logger.error('Error fetching scheduled posts count', { error, userId });
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Error in getUserScheduledPostsCount', { error, userId });
    return 0;
  }
}

/**
 * Get upcoming scheduled posts for a user
 */
export async function getUserScheduledPosts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('post_drafts')
      .select('*')
      .eq('author_id', userId)
      .not('scheduled_publish_at', 'is', null)
      .order('scheduled_publish_at', { ascending: true });

    if (error) {
      logger.error('Error fetching scheduled posts', { error, userId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getUserScheduledPosts', { error, userId });
    return [];
  }
}

/**
 * Cancel a scheduled post (removes the schedule, keeps as draft)
 */
export async function cancelScheduledPost(draftId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_drafts')
      .update({ scheduled_publish_at: null })
      .eq('id', draftId)
      .eq('author_id', userId);

    if (error) {
      logger.error('Error cancelling scheduled post', { error, draftId });
      return false;
    }

    logger.info('Scheduled post cancelled', { draftId });
    return true;
  } catch (error) {
    logger.error('Error in cancelScheduledPost', { error, draftId });
    return false;
  }
}
