import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Settings, BookOpen, Users, Plus, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Publication, PublicationMember, Post } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

const PostList = lazy(() => import('../components/posts/PostList').then(module_ => ({ default: module_.PostList })));

export function PublicationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [members, setMembers] = useState<PublicationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'writer' | null>(null);

  const loadPublication = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Load publication data
      const { data: pubData, error: pubError } = await supabase
        .from('publications')
        .select(`
          *,
          profiles:owner_id (username, avatar_url)
        `)
        .eq('slug', slug)
        .single();

      if (pubError) throw pubError;
      setPublication(pubData);

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('publication_members')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('publication_id', pubData.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Check if user is a member
      if (user) {
        const userMember = membersData?.find((m: PublicationMember) => m.user_id === user.id);
        setIsMember(!!userMember);
        setUserRole(userMember?.role || null);
      }
    } catch (error) {
      console.error('Error loading publication:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [slug, user, navigate]);

  useEffect(() => {
    loadPublication();
  }, [loadPublication]);

  const handleFollow = async () => {
    if (!user || !publication) return;
    // TODO: Implement follow functionality
    setIsFollowing(!isFollowing);
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

  if (!publication) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <BookOpen size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">Publication not found</p>
        </div>
      </div>
    );
  }

  const canManage = userRole === 'owner' || userRole === 'editor';

  return (
    <div className="space-y-8">
      {/* Cover Image */}
      {publication.cover_image_url ? (
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-64 lg:h-80 overflow-hidden">
          <img
            src={publication.cover_image_url}
            alt={publication.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        </div>
      ) : (
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-64 lg:h-80 bg-gradient-to-br from-terminal-green/20 to-terminal-purple/20 flex items-center justify-center">
          <BookOpen size={96} className="text-terminal-green/30" />
        </div>
      )}

      {/* Publication Header */}
      <div className="flex items-start justify-between -mt-32 relative z-10">
        <div className="flex items-center space-x-6">
          {publication.logo_url ? (
            <img
              src={publication.logo_url}
              alt={publication.name}
              className="w-32 h-32 rounded-lg border-4 border-gray-950 bg-gray-900 object-cover shadow-2xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg border-4 border-gray-950 bg-gray-900 flex items-center justify-center shadow-2xl">
              <BookOpen size={48} className="text-terminal-green" />
            </div>
          )}
          <div className="pt-16">
            <h1 className="text-4xl font-bold text-gray-100 mb-2">{publication.name}</h1>
            <p className="text-gray-400 font-mono text-sm">@{publication.slug}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-16">
          {canManage && (
            <ShadcnButton
              variant="outline"
              onClick={() => navigate(`/publication/${publication.slug}/settings`)}
            >
              <Settings className="mr-2" size={16} />
              Settings
            </ShadcnButton>
          )}
          {user && !isMember && (
            <ShadcnButton onClick={handleFollow}>
              {isFollowing ? (
                <>
                  <Check className="mr-2" size={16} />
                  Following
                </>
              ) : (
                <>
                  <Plus className="mr-2" size={16} />
                  Follow
                </>
              )}
            </ShadcnButton>
          )}
          {isMember && (
            <div className="px-4 py-2 bg-terminal-green/20 border border-terminal-green rounded text-terminal-green font-mono text-sm">
              {userRole}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="max-w-3xl">
        <p className="text-gray-300 text-lg">{publication.description}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-8 text-sm font-mono">
        <div>
          <span className="text-terminal-green font-bold">{members.length}</span>
          <span className="text-gray-400 ml-2">members</span>
        </div>
        <div>
          <span className="text-terminal-blue font-bold">0</span>
          <span className="text-gray-400 ml-2">posts</span>
        </div>
        <div>
          <span className="text-terminal-purple font-bold">0</span>
          <span className="text-gray-400 ml-2">followers</span>
        </div>
      </div>

      {/* Members Grid */}
      {members.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> members
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members.slice(0, 8).map((member) => (
              <div
                key={member.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-terminal-green transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {(member.profiles as { avatar_url?: string } | null)?.avatar_url ? (
                    <img
                      src={(member.profiles as { avatar_url?: string } | null)?.avatar_url || ''}
                      alt={(member.profiles as { username?: string } | null)?.username || 'User'}
                      className="w-10 h-10 rounded-full border border-terminal-green object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-800 border border-terminal-green rounded-full flex items-center justify-center">
                      <Users size={16} className="text-terminal-green" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">
                      {(member.profiles as { username?: string } | null)?.username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {members.length > 8 && (
            <button
              onClick={() => navigate(`/publication/${publication.slug}/members`)}
              className="text-sm text-terminal-blue hover:text-terminal-green transition-colors font-mono"
            >
              View all {members.length} members →
            </button>
          )}
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> latest_posts
        </h2>
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-terminal-green" size={48} />
          </div>
        }>
          <PostList postType="blog" onPostClick={handlePostClick} />
        </Suspense>
      </div>
    </div>
  );
}
