import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search, FileText, Users, BookOpen, List, Filter, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ShadcnCard, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';

type SearchResult = {
  id: string;
  type: 'post' | 'user' | 'publication' | 'series';
  title: string;
  description: string;
  author?: string;
  avatar_url?: string;
  created_at?: string;
  slug?: string;
  vote_count?: number;
  view_count?: number;
};

type FilterOptions = {
  contentType: 'all' | 'posts' | 'users' | 'publications' | 'series';
  dateRange: 'all' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'date' | 'popularity';
};

export function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    contentType: 'all',
    dateRange: 'all',
    sortBy: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Calculate date filter
      let dateFilter: Date | null = null;
      const now = new Date();
      if (filters.dateRange === 'week') {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRange === 'month') {
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRange === 'year') {
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      // Search Posts
      if (filters.contentType === 'all' || filters.contentType === 'posts') {
        let postsQuery = supabase
          .from('posts')
          .select(`
            id,
            title,
            content,
            created_at,
            vote_count,
            profiles:author_id (username, avatar_url)
          `)
          .or(`title.ilike.%${query}%, content.ilike.%${query}%`)
          .limit(20);

        if (dateFilter) {
          postsQuery = postsQuery.gte('created_at', dateFilter.toISOString());
        }

        if (filters.sortBy === 'date') {
          postsQuery = postsQuery.order('created_at', { ascending: false });
        } else if (filters.sortBy === 'popularity') {
          postsQuery = postsQuery.order('vote_count', { ascending: false });
        }

        const { data: postsData } = await postsQuery;

        if (postsData) {
          searchResults.push(
            ...postsData.map((post) => ({
              id: String(post.id),
              type: 'post' as const,
              title: String(post.title),
              description: typeof post.content === 'string' ? post.content.substring(0, 200) : '',
              author: post.profiles && typeof post.profiles === 'object' && 'username' in post.profiles
                ? String(post.profiles.username)
                : undefined,
              avatar_url: post.profiles && typeof post.profiles === 'object' && 'avatar_url' in post.profiles
                ? String(post.profiles.avatar_url)
                : undefined,
              created_at: typeof post.created_at === 'string' ? post.created_at : undefined,
              vote_count: typeof post.vote_count === 'number' ? post.vote_count : undefined,
            }))
          );
        }
      }

      // Search Users
      if (filters.contentType === 'all' || filters.contentType === 'users') {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url')
          .or(`username.ilike.%${query}%, bio.ilike.%${query}%`)
          .limit(10);

        if (usersData) {
          searchResults.push(
            ...usersData.map((user) => ({
              id: user.id,
              type: 'user' as const,
              title: user.username,
              description: user.bio || 'No bio available',
              avatar_url: user.avatar_url,
            }))
          );
        }
      }

      // Search Publications
      if (filters.contentType === 'all' || filters.contentType === 'publications') {
        let pubQuery = supabase
          .from('publications')
          .select(`
            id,
            name,
            description,
            slug,
            created_at,
            profiles:owner_id (username)
          `)
          .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
          .limit(10);

        if (dateFilter) {
          pubQuery = pubQuery.gte('created_at', dateFilter.toISOString());
        }

        const { data: pubsData } = await pubQuery;

        if (pubsData) {
          searchResults.push(
            ...pubsData.map((pub) => ({
              id: String(pub.id),
              type: 'publication' as const,
              title: String(pub.name),
              description: typeof pub.description === 'string' ? pub.description : '',
              slug: typeof pub.slug === 'string' ? pub.slug : undefined,
              author: pub.profiles && typeof pub.profiles === 'object' && 'username' in pub.profiles
                ? String(pub.profiles.username)
                : undefined,
              created_at: typeof pub.created_at === 'string' ? pub.created_at : undefined,
            }))
          );
        }
      }

      // Search Series
      if (filters.contentType === 'all' || filters.contentType === 'series') {
        let seriesQuery = supabase
          .from('series')
          .select(`
            id,
            name,
            description,
            slug,
            created_at,
            profiles:author_id (username)
          `)
          .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
          .limit(10);

        if (dateFilter) {
          seriesQuery = seriesQuery.gte('created_at', dateFilter.toISOString());
        }

        const { data: seriesData } = await seriesQuery;

        if (seriesData) {
          searchResults.push(
            ...seriesData.map((series) => ({
              id: String(series.id),
              type: 'series' as const,
              title: String(series.name),
              description: typeof series.description === 'string' ? series.description : '',
              slug: typeof series.slug === 'string' ? series.slug : undefined,
              author: series.profiles && typeof series.profiles === 'object' && 'username' in series.profiles
                ? String(series.profiles.username)
                : undefined,
              created_at: typeof series.created_at === 'string' ? series.created_at : undefined,
            }))
          );
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'post') {
      navigate(`/post/${result.id}`);
    } else if (result.type === 'user') {
      navigate(`/user/${result.title}`);
    } else if (result.type === 'publication') {
      navigate(`/publication/${result.slug}`);
    } else if (result.type === 'series') {
      navigate(`/series/${result.slug}`);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText size={20} className="text-terminal-green" />;
      case 'user':
        return <Users size={20} className="text-terminal-blue" />;
      case 'publication':
        return <BookOpen size={20} className="text-terminal-purple" />;
      case 'series':
        return <List size={20} className="text-terminal-pink" />;
      default:
        return <Search size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> search_results
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          {query ? `Results for "${query}"` : 'Enter a search query'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <ShadcnButton
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2" size={16} />
          Filters {showFilters ? '▲' : '▼'}
        </ShadcnButton>

        <p className="text-sm text-gray-500 font-mono">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>
      </div>

      {showFilters && (
        <ShadcnCard>
          <ShadcnCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Content Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  Content Type
                </label>
                <select
                  value={filters.contentType}
                  onChange={(e) =>
                    setFilters({ ...filters, contentType: e.target.value as FilterOptions['contentType'] })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                >
                  <option value="all">All</option>
                  <option value="posts">Posts</option>
                  <option value="users">Users</option>
                  <option value="publications">Publications</option>
                  <option value="series">Series</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <Calendar className="inline mr-1" size={14} />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                >
                  <option value="all">All Time</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                </select>
              </div>

              {/* Sort By Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <TrendingUp className="inline mr-1" size={14} />
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Most Recent</option>
                  <option value="popularity">Most Popular</option>
                </select>
              </div>
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      ) : results.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Search size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">
              {query ? 'No results found' : 'Start searching for posts, users, publications, or series'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="flex items-start space-x-4 bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green cursor-pointer transition-all duration-220 group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                {getResultIcon(result.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-mono text-gray-500 uppercase">{result.type}</span>
                  {result.created_at && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs font-mono text-gray-500">
                        {new Date(result.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-100 group-hover:text-terminal-green transition-colors mb-2">
                  {result.title}
                </h3>

                <p className="text-sm text-gray-400 line-clamp-2 mb-2">{result.description}</p>

                <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
                  {result.author && (
                    <>
                      <span>by {result.author}</span>
                      <span>•</span>
                    </>
                  )}
                  {result.vote_count !== undefined && <span>{result.vote_count} votes</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
