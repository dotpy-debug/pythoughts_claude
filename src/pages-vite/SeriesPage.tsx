import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, List, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Series } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

const CreateSeriesModal = lazy(() => import('../components/series/CreateSeriesModal').then(module_ => ({ default: module_.CreateSeriesModal })));

export function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [mySeries, setMySeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const loadSeries = useCallback(async () => {
    try {
      setLoading(true);

      // Load all published series
      const { data: allData, error: allError } = await supabase
        .from('series')
        .select(`
          *,
          profiles:author_id (username, avatar_url),
          series_posts (count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllSeries(allData || []);

      // Load user's series if logged in
      if (user) {
        const { data: myData, error: myError } = await supabase
          .from('series')
          .select(`
            *,
            profiles:author_id (username, avatar_url),
            series_posts (count)
          `)
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (myError) throw myError;
        setMySeries(myData || []);
      }
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const handleSeriesClick = (series: Series) => {
    navigate(`/series/${series.slug}`);
  };

  const handleCreateSuccess = () => {
    loadSeries();
    setActiveTab('my');
  };

  const displayedSeries = activeTab === 'all' ? allSeries : mySeries;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> series
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-2">
            Discover and create post series
          </p>
        </div>
        {user && (
          <ShadcnButton onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2" size={16} />
            Create Series
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
          <List className="inline mr-2" size={16} />
          All Series ({allSeries.length})
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
            <User className="inline mr-2" size={16} />
            My Series ({mySeries.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      ) : (displayedSeries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <List size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">
              {activeTab === 'my' ? 'You haven\'t created any series yet' : 'No series available'}
            </p>
            {user && activeTab === 'my' && (
              <ShadcnButton onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2" size={16} />
                Create Your First Series
              </ShadcnButton>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedSeries.map((series) => (
            <div
              key={series.id}
              onClick={() => handleSeriesClick(series)}
              className="group bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-terminal-green cursor-pointer transition-all duration-220"
            >
              {series.cover_image_url ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={series.cover_image_url}
                    alt={series.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-220"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
                  <List size={48} className="text-terminal-purple/50" />
                </div>
              )}

              <div className="p-6 space-y-3">
                <h3 className="text-xl font-bold text-gray-100 group-hover:text-terminal-green transition-colors line-clamp-2">
                  {series.name}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {series.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 font-mono pt-2 border-t border-gray-800">
                  <span>{(series as { series_posts?: unknown[] }).series_posts?.length || 0} posts</span>
                  <span>by {(series.profiles as { username?: string } | null)?.username || 'Unknown'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Suspense fallback={null}>
        <CreateSeriesModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </Suspense>
    </div>
  );
}
