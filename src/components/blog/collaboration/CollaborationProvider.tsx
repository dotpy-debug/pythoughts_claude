/**
 * Collaboration Provider Component
 *
 * Integrates Yjs CRDT with tiptap editor for real-time collaborative editing.
 * Features:
 * - Real-time document synchronization
 * - Presence awareness (user cursors and selections)
 * - Automatic conflict resolution
 * - WebSocket connection management
 */

import { useEffect, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useAuth } from '../../../contexts/AuthContext';

interface CollaborationProviderProps {
  /** Post ID to collaborate on */
  postId: string;
  /** Callback when provider is ready */
  onProviderReady?: (provider: HocuspocusProvider) => void;
  /** Children components */
  children: React.ReactNode;
}

/**
 * Collaboration Provider
 *
 * Creates and manages the Hocuspocus provider for a specific document.
 * Pass the provider to tiptap editor via the Collaboration extension.
 */
export function CollaborationProvider({
  postId,
  onProviderReady,
  children,
}: CollaborationProviderProps) {
  const { user } = useAuth();
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!user) {
      console.warn('[Collaboration] User not authenticated');
      return;
    }

    console.log(`[Collaboration] Initializing provider for post: ${postId}`);

    // Get WebSocket URL from environment
    const wsUrl = import.meta.env.VITE_COLLABORATION_WS_URL || 'ws://localhost:1234';

    // Create Hocuspocus provider
    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: `post:${postId}`,
      token: user.id, // In production, this should be a proper auth token
      onConnect() {
        console.log('[Collaboration] Connected to server');
        setConnectionStatus('connected');
      },
      onDisconnect() {
        console.log('[Collaboration] Disconnected from server');
        setConnectionStatus('disconnected');
      },
      onSynced({ state }) {
        console.log('[Collaboration] Document synced:', state);
      },
      onAuthenticationFailed({ reason }) {
        console.error('[Collaboration] Authentication failed:', reason);
        setConnectionStatus('disconnected');
      },
      onStatus({ status }) {
        console.log('[Collaboration] Status changed:', status);
      },
      onMessage(message) {
        console.log('[Collaboration] Message received:', message);
      },
    });

    setProvider(newProvider);

    // Call onProviderReady when provider is ready
    if (onProviderReady) {
      onProviderReady(newProvider);
    }

    // Cleanup
    return () => {
      console.log('[Collaboration] Cleaning up provider');
      newProvider.destroy();
    };
  }, [postId, user, onProviderReady]);

  // Display connection status
  return (
    <div>
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      {/* Render children when provider is ready */}
      {provider && children}
    </div>
  );
}

/**
 * Connection Status Badge
 */
function ConnectionStatusBadge({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      pulse: true,
    },
    connected: {
      color: 'bg-green-500',
      text: 'Live',
      pulse: false,
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Offline',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-gray-300">{config.text}</span>
    </div>
  );
}
