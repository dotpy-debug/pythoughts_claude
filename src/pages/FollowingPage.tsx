import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, UserCheck, UserMinus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

type Following = {
  id: string;
  following_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    bio: string;
  };
};

export function FollowingPage() {
  const { user } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFollowing = useCallback(async () => {
    try {
      setLoading(true);

      // If username provided, load that user's following
      // Otherwise, load current user's following
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
          following_id,
          created_at,
          profiles:following_id (username, avatar_url, bio)
        `)
        .eq('follower_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast profiles from array to single object (Supabase returns array for joins)
      const following = (data || []).map((item: any) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));

      setFollowing(following);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleUnfollow = async (followId: string) => {
    if (!confirm('Unfollow this user?')) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;

      setFollowing(following.filter(f => f.id !== followId));
    } catch (error) {
      console.error('Error unfollowing:', error);
      alert('Failed to unfollow user');
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
        <p className="text-gray-400">Please sign in to view following</p>
      </div>
    );
  }

  const isOwnProfile = !username || (user && profile?.id === user.id);
  const displayName = profile?.username || 'Your';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> {displayName} following
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          {following.length} {following.length === 1 ? 'user' : 'users'}
        </p>
      </div>

      {following.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <UserCheck size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">Not following anyone yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {following.map((follow) => (
            <div
              key={follow.id}
              className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green transition-colors"
            >
              <div className="flex items-center space-x-4">
                {follow.profiles?.avatar_url ? (
                  <img
                    src={follow.profiles.avatar_url}
                    alt={follow.profiles?.username}
                    className="w-16 h-16 rounded-full border-2 border-terminal-green object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 border-2 border-terminal-green rounded-full flex items-center justify-center">
                    <UserCheck size={24} className="text-terminal-green" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-100">
                    {follow.profiles?.username}
                  </h3>
                  {follow.profiles?.bio && (
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {follow.profiles.bio}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Following since {new Date(follow.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isOwnProfile && (
                <ShadcnButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnfollow(follow.id)}
                >
                  <UserMinus className="mr-2" size={16} />
                  Unfollow
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
