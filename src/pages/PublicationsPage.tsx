import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, BookOpen, Users, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Publication } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

const CreatePublicationModal = lazy(() => import('../components/publications/CreatePublicationModal').then(mod => ({ default: mod.CreatePublicationModal })));

export function PublicationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [myPublications, setMyPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const loadPublications = useCallback(async () => {
    try {
      setLoading(true);

      // Load all public publications
      const { data: allPubs, error: allError } = await supabase
        .from('publications')
        .select(`
          *,
          profiles:owner_id (username, avatar_url),
          publication_members (count)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setPublications(allPubs || []);

      // Load user's publications if logged in
      if (user) {
        const { data: myPubs, error: myError } = await supabase
          .from('publication_members')
          .select(`
            publications (
              *,
              profiles:owner_id (username, avatar_url),
              publication_members (count)
            )
          `)
          .eq('user_id', user.id);

        if (myError) throw myError;

        const userPubs = myPubs
          ?.map((member: any) => member.publications)
          .filter((pub): pub is Publication => pub !== null) || [];

        setMyPublications(userPubs);
      }
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const handlePublicationClick = (publication: Publication) => {
    navigate(`/publication/${publication.slug}`);
  };

  const handleCreateSuccess = () => {
    loadPublications();
    setActiveTab('my');
  };

  const displayedPublications = activeTab === 'all' ? publications : myPublications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> publications
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-2">
            Discover and create collaborative publications
          </p>
        </div>
        {user && (
          <ShadcnButton onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2" size={16} />
            Create Publication
          </ShadcnButton>
        )}
      </div>

      <div className="flex space-x-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'all'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <BookOpen className="inline mr-2" size={16} />
          All Publications ({publications.length})
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 font-mono transition-colors ${
              activeTab === 'my'
                ? 'text-terminal-green border-b-2 border-terminal-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users className="inline mr-2" size={16} />
            My Publications ({myPublications.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      ) : displayedPublications.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <BookOpen size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">
              {activeTab === 'my' ? 'You are not part of any publications yet' : 'No publications available'}
            </p>
            {user && activeTab === 'my' && (
              <ShadcnButton onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2" size={16} />
                Create Your First Publication
              </ShadcnButton>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPublications.map((publication) => (
            <div
              key={publication.id}
              onClick={() => handlePublicationClick(publication)}
              className="group bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-terminal-green cursor-pointer transition-all duration-220 hover:shadow-lg hover:shadow-terminal-green/20"
            >
              {publication.cover_image_url ? (
                <div className="h-40 bg-gradient-to-br from-terminal-green/20 to-terminal-purple/20 overflow-hidden">
                  <img
                    src={publication.cover_image_url}
                    alt={publication.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-220"
                  />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-terminal-green/20 to-terminal-purple/20 flex items-center justify-center">
                  <BookOpen size={48} className="text-terminal-green/50" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  {publication.logo_url ? (
                    <img
                      src={publication.logo_url}
                      alt={publication.name}
                      className="w-12 h-12 rounded border-2 border-terminal-green object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 border-2 border-terminal-green rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen size={20} className="text-terminal-green" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-100 group-hover:text-terminal-green transition-colors truncate">
                      {publication.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">@{publication.slug}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2">
                  {publication.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 font-mono pt-2 border-t border-gray-800">
                  <div className="flex items-center space-x-1">
                    <Users size={12} />
                    <span>{(publication as any).publication_members?.length || 0} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText size={12} />
                    <span>Posts</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <CreatePublicationModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </Suspense>
    </div>
  );
}
