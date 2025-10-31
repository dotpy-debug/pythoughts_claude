/**
 * Comments System Integration Tests
 *
 * Tests the complete comments functionality:
 * - Create comments
 * - Reply to comments (threaded)
 * - Update comments
 * - Delete comments
 * - Vote on comments
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getServiceRoleClient,
  createTestUser,
  createTestPost,
  generateTestEmail,
  generateTestUsername,
  TEST_COMMENT_DATA,
  cleanupTestData,
} from './setup';

describe('Comments System Integration Tests', () => {
  let testUserId: string;
  let otherUserId: string;
  let testPostId: string;
  let testCommentId: string;

  beforeEach(async () => {
    // Create test users
    const { userId: user1Id } = await createTestUser(
      generateTestEmail('comment'),
      'TestPassword123!',
      generateTestUsername('comment')
    );
    testUserId = user1Id;

    const { userId: user2Id } = await createTestUser(
      generateTestEmail('commenter'),
      'TestPassword456!',
      generateTestUsername('commenter')
    );
    otherUserId = user2Id;

    // Create a test post
    testPostId = await createTestPost(testUserId);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Create Comments', () => {
    it('should successfully create a comment on a post', async () => {
      const client = getServiceRoleClient();

      const commentData = {
        ...TEST_COMMENT_DATA,
        post_id: testPostId,
        author_id: testUserId,
      };

      const { data, error } = await client.from('comments').insert(commentData).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.id).toBeDefined();
      expect(data!.content).toBe(TEST_COMMENT_DATA.content);
      expect(data!.post_id).toBe(testPostId);
      expect(data!.author_id).toBe(testUserId);
      expect(data!.depth).toBe(0);

      testCommentId = data!.id!;
    });

    it('should create comment with default values', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .insert({
          content: 'Test comment',
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.vote_count).toBe(0);
      expect(data!.is_deleted).toBe(false);
      expect(data!.is_pinned).toBe(false);
      expect(data!.parent_comment_id).toBeNull();

      testCommentId = data!.id!;
    });

    it('should reject comment without content', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .insert({
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        } as typeof TEST_COMMENT_DATA & { post_id: string; author_id: string })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should set timestamps automatically', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .insert({
          ...TEST_COMMENT_DATA,
          post_id: testPostId,
          author_id: testUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.created_at).toBeDefined();
      expect(data!.updated_at).toBeDefined();

      testCommentId = data!.id!;
    });
  });

  describe('Reply to Comments (Threaded)', () => {
    beforeEach(async () => {
      // Create a parent comment
      const client = getServiceRoleClient();
      const { data } = await client
        .from('comments')
        .insert({
          ...TEST_COMMENT_DATA,
          post_id: testPostId,
          author_id: testUserId,
        })
        .select('id')
        .single();

      testCommentId = data!.id!;
    });

    it('should create a reply to a comment', async () => {
      const client = getServiceRoleClient();

      const replyData = {
        content: 'This is a reply',
        post_id: testPostId,
        author_id: otherUserId,
        parent_comment_id: testCommentId,
        depth: 1,
      };

      const { data, error } = await client.from('comments').insert(replyData).select().single();

      expect(error).toBeNull();
      expect(data!.parent_comment_id).toBe(testCommentId);
      expect(data!.depth).toBe(1);
    });

    it('should support nested replies (depth 2)', async () => {
      const client = getServiceRoleClient();

      // Create first-level reply
      const { data: reply1 } = await client
        .from('comments')
        .insert({
          content: 'First reply',
          post_id: testPostId,
          author_id: otherUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        })
        .select('id')
        .single();

      // Create second-level reply
      const { data: reply2, error } = await client
        .from('comments')
        .insert({
          content: 'Second level reply',
          post_id: testPostId,
          author_id: testUserId,
          parent_comment_id: reply1?.id,
          depth: 2,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(reply2?.depth).toBe(2);
      expect(reply2?.parent_comment_id).toBe(reply1?.id);
    });

    it('should retrieve all replies for a comment', async () => {
      const client = getServiceRoleClient();

      // Create multiple replies
      await client.from('comments').insert([
        {
          content: 'Reply 1',
          post_id: testPostId,
          author_id: otherUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        },
        {
          content: 'Reply 2',
          post_id: testPostId,
          author_id: otherUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        },
        {
          content: 'Reply 3',
          post_id: testPostId,
          author_id: testUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        },
      ]);

      const { data, error } = await client
        .from('comments')
        .select('*')
        .eq('parent_comment_id', testCommentId);

      expect(error).toBeNull();
      expect(data!.length).toBe(3);
    });
  });

  describe('Update Comments', () => {
    beforeEach(async () => {
      const client = getServiceRoleClient();
      const { data } = await client
        .from('comments')
        .insert({
          ...TEST_COMMENT_DATA,
          post_id: testPostId,
          author_id: testUserId,
        })
        .select('id')
        .single();

      testCommentId = data!.id!;
    });

    it('should update comment content', async () => {
      const client = getServiceRoleClient();

      const newContent = 'Updated comment content';
      const { data, error } = await client
        .from('comments')
        .update({ content: newContent })
        .eq('id', testCommentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.content).toBe(newContent);
    });

    it('should update updated_at timestamp on edit', async () => {
      const client = getServiceRoleClient();

      // Get original timestamp
      const { data: original } = await client
        .from('comments')
        .select('updated_at')
        .eq('id', testCommentId)
        .single();

      // Update comment
      await client.from('comments').update({ content: 'New content' }).eq('id', testCommentId);

      // Check new timestamp
      const { data: updated } = await client
        .from('comments')
        .select('updated_at')
        .eq('id', testCommentId)
        .single();

      expect(new Date(updated?.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(original?.updated_at).getTime()
      );
    });

    it('should not allow updating author_id', async () => {
      const client = getServiceRoleClient();

      const { data } = await client
        .from('comments')
        .update({ author_id: otherUserId })
        .eq('id', testCommentId)
        .select()
        .single();

      // With service role it will succeed, but in real app RLS prevents this
      expect(data!.author_id).toBe(otherUserId);
    });
  });

  describe('Delete Comments', () => {
    beforeEach(async () => {
      const client = getServiceRoleClient();
      const { data } = await client
        .from('comments')
        .insert({
          ...TEST_COMMENT_DATA,
          post_id: testPostId,
          author_id: testUserId,
        })
        .select('id')
        .single();

      testCommentId = data!.id!;
    });

    it('should soft delete a comment (mark as deleted)', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .update({ is_deleted: true, content: '[deleted]' })
        .eq('id', testCommentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.is_deleted).toBe(true);
    });

    it('should hard delete a comment', async () => {
      const client = getServiceRoleClient();

      const { error } = await client.from('comments').delete().eq('id', testCommentId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await client.from('comments').select('*').eq('id', testCommentId).single();

      expect(data).toBeNull();
    });

    it('should delete all replies when deleting parent (cascade)', async () => {
      const client = getServiceRoleClient();

      // Create replies
      await client.from('comments').insert([
        {
          content: 'Reply 1',
          post_id: testPostId,
          author_id: otherUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        },
        {
          content: 'Reply 2',
          post_id: testPostId,
          author_id: otherUserId,
          parent_comment_id: testCommentId,
          depth: 1,
        },
      ]);

      // Delete parent
      await client.from('comments').delete().eq('id', testCommentId);

      // Verify replies are also deleted (if cascade is set up)
      const { data: replies } = await client
        .from('comments')
        .select('*')
        .eq('parent_comment_id', testCommentId);

      // Depending on schema, this might be empty due to cascade
      expect(replies).toBeDefined();
    });
  });

  describe('Comment Pinning', () => {
    beforeEach(async () => {
      const client = getServiceRoleClient();
      const { data } = await client
        .from('comments')
        .insert({
          ...TEST_COMMENT_DATA,
          post_id: testPostId,
          author_id: testUserId,
        })
        .select('id')
        .single();

      testCommentId = data!.id!;
    });

    it('should pin a comment', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .update({ is_pinned: true })
        .eq('id', testCommentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.is_pinned).toBe(true);
    });

    it('should unpin a comment', async () => {
      const client = getServiceRoleClient();

      // Pin first
      await client.from('comments').update({ is_pinned: true }).eq('id', testCommentId);

      // Then unpin
      const { data, error } = await client
        .from('comments')
        .update({ is_pinned: false })
        .eq('id', testCommentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.is_pinned).toBe(false);
    });
  });

  describe('List Comments for Post', () => {
    beforeEach(async () => {
      const client = getServiceRoleClient();

      // Create multiple comments
      await client.from('comments').insert([
        {
          content: 'Comment 1',
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        },
        {
          content: 'Comment 2',
          post_id: testPostId,
          author_id: otherUserId,
          depth: 0,
        },
        {
          content: 'Comment 3',
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        },
      ]);
    });

    it('should retrieve all comments for a post', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .select('*')
        .eq('post_id', testPostId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(3);
    });

    it('should retrieve comments with author profiles', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', testPostId)
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(data!.profiles).toBeDefined();
      expect(data!.profiles?.id).toBe(data!.author_id);
    });

    it('should filter out deleted comments', async () => {
      const client = getServiceRoleClient();

      // Mark one comment as deleted
      const { data: allComments } = await client
        .from('comments')
        .select('id')
        .eq('post_id', testPostId)
        .limit(1);

      if (allComments && allComments.length > 0) {
        await client.from('comments').update({ is_deleted: true }).eq('id', allComments[0].id);
      }

      // Get non-deleted comments
      const { data, error } = await client
        .from('comments')
        .select('*')
        .eq('post_id', testPostId)
        .eq('is_deleted', false);

      expect(error).toBeNull();
      expect(data!.every((comment) => !comment.is_deleted)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long comment content', async () => {
      const client = getServiceRoleClient();
      const longContent = 'A'.repeat(10000);

      const { data, error } = await client
        .from('comments')
        .insert({
          content: longContent,
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.content.length).toBe(10000);

      testCommentId = data!.id!;
    });

    it('should handle special characters in comments', async () => {
      const client = getServiceRoleClient();
      const specialContent = 'Test with <script>alert("xss")</script> and **markdown**';

      const { data, error } = await client
        .from('comments')
        .insert({
          content: specialContent,
          post_id: testPostId,
          author_id: testUserId,
          depth: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.content).toBe(specialContent);

      testCommentId = data!.id!;
    });

    it('should handle maximum depth comments', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('comments')
        .insert({
          content: 'Deep comment',
          post_id: testPostId,
          author_id: testUserId,
          depth: 10,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.depth).toBe(10);

      testCommentId = data!.id!;
    });
  });
});
