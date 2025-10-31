import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users, UserMinus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

type Follower = {
  id: string;
  follower_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    bio: string;
  };
};

export function FollowersPage() {
  const { user } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFollowers = useCallback(async () => {
    try {
      setLoading(true);

      // If username provided, load that user's followers
      // Otherwise, load current user's followers
      let targetUserId: string;

      if (username) {
        // Load profile for the specified username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
        targetUserId = profileData.id;
      } else {
        // Use current user's ID
        if (!user) return;
        targetUserId = user.id;
        setProfile(null);
      }

      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          id,
          follower_id,
          created_at,
          profiles:follower_id (username, avatar_url, bio)
        `)
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast profiles from array to single object (Supabase returns array for joins)
      const followers = (data || []).map((item: { id: string; follower_id: string; created_at: string; profiles: { username: string; avatar_url: string; bio: string } | { username: string; avatar_url: string; bio: string }[] }) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));

      setFollowers(followers);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const handleRemoveFollower = async (followId: string) => {
    if (!confirm('Remove this follower?')) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;

      setFollowers(followers.filter(f => f.id !== followId));
    } catch (error) {
      console.error('Error removing follower:', error);
      alert('Failed to remove follower');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!username && !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Please sign in to view followers</p>
      </div>
    );
  }

  const isOwnProfile = !username || (user && profile?.id === user.id);
  const displayName = profile?.username || 'Your';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> {displayName} followers
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
        </p>
      </div>

      {followers.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Users size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">No followers yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {followers.map((follower) => (
            <div
              key={follower.id}
              className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green transition-colors"
            >
              <div className="flex items-center space-x-4">
                {follower.profiles?.avatar_url ? (
                  <img
                    src={follower.profiles.avatar_url}
                    alt={follower.profiles?.username}
                    className="w-16 h-16 rounded-full border-2 border-terminal-green object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 border-2 border-terminal-green rounded-full flex items-center justify-center">
                    <Users size={24} className="text-terminal-green" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-100">
                    {follower.profiles?.username}
                  </h3>
                  {follower.profiles?.bio && (
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {follower.profiles.bio}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Followed {new Date(follower.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isOwnProfile && (
                <ShadcnButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFollower(follower.id)}
                >
                  <UserMinus className="mr-2" size={16} />
                  Remove
                </ShadcnButton>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <ShadcnButton
          variant="outline"
          onClick={() => navigate(username ? `/user/${username}` : '/profile')}
        >
          Back to Profile
        </ShadcnButton>
      </div>
    </div>
  );
}
