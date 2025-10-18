import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, UserProfileExtended, UserSkill, Post } from '../lib/supabase';

const UserProfileCard = lazy(() => import('../components/profile/UserProfileCard').then(mod => ({ default: mod.UserProfileCard })));
const PostList = lazy(() => import('../components/posts/PostList').then(mod => ({ default: mod.PostList })));

export function ProfilePage() {
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [extended, setExtended] = useState<UserProfileExtended | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);

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

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> my_posts
          </h2>
          {user && <PostList postType="news" onPostClick={handlePostClick} />}
        </div>
      </Suspense>
    </div>
  );
}
