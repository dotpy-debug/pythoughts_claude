/**
 * Presence Bar Component
 *
 * Displays active collaborators editing the document.
 * Shows user avatars, names, and cursor colors.
 */

import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { User } from 'lucide-react';

interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

interface PresenceBarProps {
  provider: HocuspocusProvider | null;
}

/**
 * Presence Bar
 *
 * Monitors provider awareness state and displays active users
 */
export function PresenceBar({ provider }: PresenceBarProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!provider) return;

    // Function to update user list from awareness
    const updateUsers = () => {
      const awareness = provider.awareness;
      const states = Array.from(awareness?.getStates().values() || []);

      const activeUsers: PresenceUser[] = states
        .filter((state: any) => state.user && state.user.id)
        .map((state: any) => ({
          id: state.user.id,
          name: state.user.name || 'Anonymous',
          color: state.user.color || '#10b981',
        }));

      setUsers(activeUsers);
    };

    // Listen to awareness changes
    provider.awareness?.on('change', updateUsers);

    // Initial update
    updateUsers();

    // Cleanup
    return () => {
      provider.awareness?.off('change', updateUsers);
    };
  }, [provider]);

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center gap-1 text-sm text-gray-400">
        <User className="w-4 h-4" />
        <span>{users.length} editing</span>
      </div>

      <div className="flex -space-x-2">
        {users.map((user) => (
          <UserAvatar key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

/**
 * User Avatar
 */
function UserAvatar({ user }: { user: PresenceUser }) {
  // Get initials from name
  const initials = user.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-gray-800"
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {initials}
    </div>
  );
}
