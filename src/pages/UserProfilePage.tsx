import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, UserMinus, Users, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Post } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';
import { ShadcnCard, ShadcnCardContent } from '../components/ui/ShadcnCard';

const PostList = lazy(() => import('../components/posts/PostList').then(mod => ({ default: mod.PostList })));

type UserStats = {
  totalPosts: number;
  totalFollowers: number;
  totalFollowing: number;
};

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalPosts: 0,
    totalFollowers: 0,
    totalFollowing: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const loadUserProfile = useCallback(async () => {
    if (!username) return;

    try {
      setLoading(true);

      // Load user profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load user stats
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', profileData.id);

      const { data: followersData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('following_id', profileData.id);

      const { data: followingData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', profileData.id);

      setStats({
        totalPosts: postsData?.length || 0,
        totalFollowers: followersData?.length || 0,
        totalFollowing: followingData?.length || 0,
      });

      // Check if current user is following this user
      if (user) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [username, user, navigate]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        if (error) throw error;

        setIsFollowing(false);
        setStats(prev => ({ ...prev, totalFollowers: prev.totalFollowers - 1 }));
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });

        if (error) throw error;

        setIsFollowing(true);
        setStats(prev => ({ ...prev, totalFollowers: prev.totalFollowers + 1 }));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      alert('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Users size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">User not found</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24 rounded-full border-4 border-terminal-green object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-800 border-4 border-terminal-green rounded-full flex items-center justify-center">
                <Users size={40} className="text-terminal-green" />
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">{profile.username}</h1>
              {profile.bio && (
                <p className="text-gray-400 max-w-2xl">{profile.bio}</p>
              )}
            </div>
          </div>

          {!isOwnProfile && user && (
            <ShadcnButton
              onClick={handleFollow}
              disabled={followLoading}
              variant={isFollowing ? 'outline' : 'default'}
            >
              {followLoading ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : isFollowing ? (
                <UserMinus className="mr-2" size={16} />
              ) : (
                <UserPlus className="mr-2" size={16} />
              )}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </ShadcnButton>
          )}

          {isOwnProfile && (
            <ShadcnButton
              variant="outline"
              onClick={() => navigate('/settings')}
            >
              Edit Profile
            </ShadcnButton>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-100">{stats.totalPosts}</p>
            <p className="text-sm text-gray-400 font-mono">Posts</p>
          </div>
          <div className="text-center cursor-pointer hover:text-terminal-green transition-colors" onClick={() => navigate(`/user/${username}/followers`)}>
            <p className="text-2xl font-bold text-gray-100">{stats.totalFollowers}</p>
            <p className="text-sm text-gray-400 font-mono">Followers</p>
          </div>
          <div className="text-center cursor-pointer hover:text-terminal-green transition-colors" onClick={() => navigate(`/user/${username}/following`)}>
            <p className="text-2xl font-bold text-gray-100">{stats.totalFollowing}</p>
            <p className="text-sm text-gray-400 font-mono">Following</p>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> posts
        </h2>

        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-terminal-green" size={48} />
          </div>
        }>
          {profile && (
            <div className="space-y-4">
              {/* Filter posts by this user's ID */}
              <PostList
                postType="news"
                onPostClick={handlePostClick}
                authorId={profile.id}
              />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
