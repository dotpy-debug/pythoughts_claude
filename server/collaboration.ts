/**
 * Hocuspocus WebSocket Server for Real-Time Collaboration
 *
 * This server handles collaborative editing using Yjs CRDTs.
 * Features:
 * - Document synchronization across multiple clients
 * - Presence awareness (cursor positions, user info)
 * - Automatic conflict resolution
 * - PostgreSQL persistence via Supabase
 */

import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';

// Supabase client for document persistence
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

/**
 * Database extension for persisting document state
 * Stores Yjs document state in Supabase
 */
const database = new Database({
  /**
   * Fetch document from Supabase
   * Called when a client connects to a document
   */
  fetch: async ({ documentName }) => {
    console.log(`[Hocuspocus] Fetching document: ${documentName}`);

    const { data, error } = await supabase
      .from('collaboration_documents')
      .select('content')
      .eq('document_id', documentName)
      .single();

    if (error || !data) {
      console.log(`[Hocuspocus] Document not found, creating new: ${documentName}`);
      return null; // Document doesn't exist yet
    }

    // Return the Yjs document state as Uint8Array
    return new Uint8Array(data.content);
  },

  /**
   * Store document to Supabase
   * Called periodically and when clients disconnect
   */
  store: async ({ documentName, state }) => {
    console.log(`[Hocuspocus] Storing document: ${documentName}`);

    const { error } = await supabase
      .from('collaboration_documents')
      .upsert({
        document_id: documentName,
        content: Array.from(state), // Convert Uint8Array to array for JSON storage
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`[Hocuspocus] Error storing document ${documentName}:`, error);
      throw error;
    }
  },
});

/**
 * Hocuspocus Server Configuration
 */
const server = Server.configure({
  // Port for WebSocket connections
  port: process.env.COLLABORATION_PORT ? parseInt(process.env.COLLABORATION_PORT) : 1234,

  // Extensions
  extensions: [
    database,
  ],

  /**
   * Authentication hook
   * Validate user permissions before allowing document access
   */
  async onAuthenticate({ documentName, connection, token }) {
    console.log(`[Hocuspocus] Authentication attempt for document: ${documentName}`);

    // Token should be in format: "Bearer <supabase_token>"
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      // Verify Supabase token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error('Invalid authentication token');
      }

      // Check if user has access to this document
      // documentName format: "post:{postId}"
      const postId = documentName.replace('post:', '');

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('author_id, status')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        throw new Error('Document not found');
      }

      // Allow access if user is the author or post is published
      const hasAccess = post.author_id === user.id || post.status === 'published';

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      // Set connection context for later use
      connection.readOnly = post.status === 'published' && post.author_id !== user.id;

      console.log(`[Hocuspocus] User ${user.id} authenticated for document: ${documentName}`);

      return {
        user: {
          id: user.id,
          name: user.user_metadata?.username || user.email,
          color: generateUserColor(user.id),
        },
      };
    } catch (error) {
      console.error('[Hocuspocus] Authentication error:', error);
      throw error;
    }
  },

  /**
   * Connection hook
   * Called when a client connects
   */
  async onConnect({ documentName, instance, connection }) {
    const connectionCount = instance.documents.get(documentName)?.getConnectionsCount() || 0;
    console.log(`[Hocuspocus] Client connected to ${documentName}. Total connections: ${connectionCount}`);
  },

  /**
   * Disconnection hook
   * Called when a client disconnects
   */
  async onDisconnect({ documentName, instance }) {
    const connectionCount = instance.documents.get(documentName)?.getConnectionsCount() || 0;
    console.log(`[Hocuspocus] Client disconnected from ${documentName}. Remaining connections: ${connectionCount}`);
  },

  /**
   * Update hook
   * Called when document is updated
   */
  async onChange({ documentName }) {
    console.log(`[Hocuspocus] Document updated: ${documentName}`);
  },
});

/**
 * Generate consistent color for user based on their ID
 */
function generateUserColor(userId: string): string {
  const colors = [
    '#10b981', // green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  // Use userId to deterministically select a color
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('[Hocuspocus] Shutting down gracefully...');
  await server.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Hocuspocus] Shutting down gracefully...');
  await server.destroy();
  process.exit(0);
});

// Start the server
console.log(`[Hocuspocus] Starting collaboration server on port ${server.configuration.port}...`);

export default server;
