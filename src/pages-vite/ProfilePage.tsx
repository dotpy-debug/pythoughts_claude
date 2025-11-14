import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, Eye, Heart, MessageSquare, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, UserProfileExtended, UserSkill, Post } from '../lib/supabase';
import { ShadcnCard, ShadcnCardContent } from '../components/ui/ShadcnCard';

const UserProfileCard = lazy(() => import('../components/profile/UserProfileCard').then(module_ => ({ default: module_.UserProfileCard })));
const PostList = lazy(() => import('../components/posts/PostList').then(module_ => ({ default: module_.PostList })));

type UserStats = {
  totalViews: number;
  totalReads: number;
  totalClaps: number;
  totalComments: number;
  totalPosts: number;
  totalFollowers: number;
  totalFollowing: number;
};

export function ProfilePage() {
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [extended, setExtended] = useState<UserProfileExtended | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalViews: 0,
    totalReads: 0,
    totalClaps: 0,
    totalComments: 0,
    totalPosts: 0,
    totalFollowers: 0,
    totalFollowing: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load profile data
      if (authProfile) {
        setProfile(authProfile);
      }

      // Load extended profile data
      const { data: extendedData, error: extendedError } = await supabase
        .from('user_profiles_extended')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (extendedError && extendedError.code !== 'PGRST116') {
        console.error('Error loading extended profile:', extendedError);
      } else if (extendedData) {
        setExtended(extendedData);
      }

      // Load skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', user.id)
        .order('years_experience', { ascending: false });

      if (skillsError) {
        console.error('Error loading skills:', skillsError);
      } else {
        setSkills(skillsData || []);
      }

      // Load user statistics
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', user.id);

      const totalPosts = postsData?.length || 0;

      // Get aggregate stats from post_stats for user's posts
      const { data: statsData } = await supabase
        .from('post_stats')
        .select('view_count, read_count, clap_count')
        .in('post_id', postsData?.map(p => p.id) || []);

      const totalViews = statsData?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
      const totalReads = statsData?.reduce((sum, s) => sum + (s.read_count || 0), 0) || 0;
      const totalClaps = statsData?.reduce((sum, s) => sum + (s.clap_count || 0), 0) || 0;

      // Get total comments on user's posts
      const { data: commentsData } = await supabase
        .from('comments')
        .select('id')
        .in('post_id', postsData?.map(p => p.id) || []);

      const totalComments = commentsData?.length || 0;

      // Get followers and following counts
      const { data: followersData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('following_id', user.id);

      const { data: followingData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id);

      setStats({
        totalViews,
        totalReads,
        totalClaps,
        totalComments,
        totalPosts,
        totalFollowers: followersData?.length || 0,
        totalFollowing: followingData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, authProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  const handleEdit = () => {
    navigate('/settings');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      }>
        {profile && (
          <UserProfileCard
            profile={profile}
            extended={extended || undefined}
            skills={skills}
            isOwnProfile={true}
            onEdit={handleEdit}
          />
        )}

        {/* Statistics Dashboard */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ShadcnCard>
              <ShadcnCardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-terminal-green/20 rounded-lg">
                    <Eye className="text-terminal-green" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{stats.totalViews.toLocaleString()}</p>
                    <p className="text-sm text-gray-400 font-mono">Views</p>
                  </div>
                </div>
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard>
              <ShadcnCardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-terminal-blue/20 rounded-lg">
                    <TrendingUp className="text-terminal-blue" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{stats.totalReads.toLocaleString()}</p>
                    <p className="text-sm text-gray-400 font-mono">Reads</p>
                  </div>
                </div>
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard>
              <ShadcnCardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-terminal-purple/20 rounded-lg">
                    <Heart className="text-terminal-purple" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{stats.totalClaps.toLocaleString()}</p>
                    <p className="text-sm text-gray-400 font-mono">Claps</p>
                  </div>
                </div>
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard>
              <ShadcnCardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-terminal-pink/20 rounded-lg">
                    <MessageSquare className="text-terminal-pink" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{stats.totalComments.toLocaleString()}</p>
                    <p className="text-sm text-gray-400 font-mono">Comments</p>
                  </div>
                </div>
              </ShadcnCardContent>
            </ShadcnCard>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex space-x-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-mono transition-colors ${
                activeTab === 'posts'
                  ? 'text-terminal-green border-b-2 border-terminal-green'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="inline mr-2" size={16} />
              Posts ({stats.totalPosts})
            </button>
            <button
              onClick={() => {
                setActiveTab('followers');
                navigate('/profile/followers');
              }}
              className={`px-4 py-2 font-mono transition-colors ${
                activeTab === 'followers'
                  ? 'text-terminal-green border-b-2 border-terminal-green'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              Followers ({stats.totalFollowers})
            </button>
            <button
              onClick={() => {
                setActiveTab('following');
                navigate('/profile/following');
              }}
              className={`px-4 py-2 font-mono transition-colors ${
                activeTab === 'following'
                  ? 'text-terminal-green border-b-2 border-terminal-green'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <UserCheck className="inline mr-2" size={16} />
              Following ({stats.totalFollowing})
            </button>
          </div>

          {activeTab === 'posts' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-100 font-mono">
                <span className="text-terminal-green">$</span> my_posts
              </h2>
              {user && <PostList postType="news" onPostClick={handlePostClick} />}
            </div>
          )}
        </div>
      </Suspense>
    </div>
  );
}
