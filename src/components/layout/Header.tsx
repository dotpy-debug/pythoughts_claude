import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, SquarePen as PenSquare, Search, Users, TrendingUp, Shield, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { NotificationBell } from '../notifications/NotificationBell';
import { Logo } from '../branding/Logo';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

type SearchSuggestion = {
  id: string;
  type: 'post' | 'user';
  title: string;
  subtitle?: string;
};

type HeaderProperties = {
  onCreatePost: () => void;
};

export function Header({ onCreatePost }: HeaderProperties) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname === '/blogs' ? 'blogs' : (location.pathname === '/tasks' ? 'tasks' : 'newsfeed');
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchReference = useRef<HTMLDivElement>(null);
  const userMenuReference = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchReference.current && !searchReference.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuReference.current && !userMenuReference.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Close user menu when location changes
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const suggestions: SearchSuggestion[] = [];

        // Get post suggestions
        const { data: posts } = await supabase
          .from('posts')
          .select('id, title, content')
          .or(`title.ilike.%${searchQuery}%, content.ilike.%${searchQuery}%`)
          .limit(3);

        if (posts) {
          suggestions.push(
            ...posts.map((post) => ({
              id: post.id,
              type: 'post' as const,
              title: post.title,
              subtitle: post.content?.slice(0, 60) + '...',
            }))
          );
        }

        // Get user suggestions
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, bio')
          .ilike('username', `%${searchQuery}%`)
          .limit(3);

        if (users) {
          suggestions.push(
            ...users.map((user) => ({
              id: user.id,
              type: 'user' as const,
              title: user.username,
              subtitle: user.bio || undefined,
            }))
          );
        }

        setSuggestions(suggestions.slice(0, 5));
      } catch (error) {
        logger.error('Error fetching search suggestions', { searchQuery, errorMessage: error instanceof Error ? error.message : String(error) });
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setSearchQuery('');
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'post') {
      navigate(`/post/${suggestion.id}`);
    } else if (suggestion.type === 'user') {
      navigate(`/user/${suggestion.title}`);
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center">
                <Logo showText={true} size="md" />
              </Link>

              <nav className="hidden md:flex space-x-1">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'newsfeed'
                      ? 'bg-terminal-green text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-green hover:bg-gray-800'
                  }`}
                >
                  newsfeed
                </Link>
                <Link
                  to="/blogs"
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'blogs'
                      ? 'bg-terminal-blue text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-blue hover:bg-gray-800'
                  }`}
                >
                  blogs
                </Link>
                <Link
                  to="/tasks"
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'tasks'
                      ? 'bg-terminal-purple text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-purple hover:bg-gray-800'
                  }`}
                >
                  tasks
                </Link>
                <Link
                  to="/trending"
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    location.pathname === '/trending'
                      ? 'bg-orange-500 text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-orange-500 hover:bg-gray-800'
                  }`}
                >
                  trending
                </Link>
              </nav>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative" ref={searchReference}>
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search..."
                      className="w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green transition-colors"
                    />
                  </div>
                </form>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-gray-500 uppercase w-12">
                            {suggestion.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-gray-100 truncate">{suggestion.title}</p>
                            {suggestion.subtitle && (
                              <p className="text-xs text-gray-500 truncate">{suggestion.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {user ? (
                <>
                  {user && <NotificationBell />}
                  <button
                    onClick={onCreatePost}
                    className="flex items-center space-x-2 bg-terminal-green text-gray-900 px-4 py-2 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors"
                  >
                    <PenSquare size={18} />
                    <span>{currentTab === 'tasks' ? 'new_task' : 'new_post'}</span>
                  </button>

                  <div className="relative" ref={userMenuReference}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 text-gray-300 hover:text-terminal-green transition-colors"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-8 h-8 rounded-full object-cover border border-terminal-purple"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                          <User size={16} className="text-terminal-purple" />
                        </div>
                      )}
                      <span className="font-mono text-sm">{profile?.username}</span>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 z-50">
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-green flex items-center space-x-2 font-mono text-sm transition-colors"
                        >
                          <User size={16} />
                          <span>profile</span>
                        </Link>
                        <Link
                          to="/activity"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
                        >
                          <Users size={16} />
                          <span>activity_feed</span>
                        </Link>
                        <Link
                          to="/analytics"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-purple flex items-center space-x-2 font-mono text-sm transition-colors"
                        >
                          <TrendingUp size={16} />
                          <span>analytics</span>
                        </Link>
                        <Link
                          to="/moderation"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-orange-500 flex items-center space-x-2 font-mono text-sm transition-colors border-t border-gray-800"
                        >
                          <Shield size={16} />
                          <span>moderation</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-purple flex items-center space-x-2 font-mono text-sm transition-colors"
                        >
                          <Settings size={16} />
                          <span>settings</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-pink flex items-center space-x-2 font-mono text-sm transition-colors border-t border-gray-800"
                        >
                          <LogOut size={16} />
                          <span>sign_out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="text-gray-300 hover:text-terminal-green font-mono transition-colors"
                  >
                    sign_in
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-terminal-green text-gray-900 px-4 py-2 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors"
                  >
                    get_started
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700 bg-gray-900 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-4 space-y-2">
              {/* Mobile Search */}
              <div className="pb-4 mb-2 border-b border-gray-800">
                <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green transition-colors"
                    />
                  </div>
                </form>
              </div>

              {/* Main Navigation */}
              <nav className="space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'newsfeed'
                      ? 'bg-terminal-green text-gray-900 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-terminal-green'
                  }`}
                >
                  newsfeed
                </Link>
                <Link
                  to="/blogs"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'blogs'
                      ? 'bg-terminal-blue text-gray-900 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-terminal-blue'
                  }`}
                >
                  blogs
                </Link>
                <Link
                  to="/tasks"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'tasks'
                      ? 'bg-terminal-purple text-gray-900 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-terminal-purple'
                  }`}
                >
                  tasks
                </Link>
                <Link
                  to="/trending"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded font-mono transition-colors ${
                    location.pathname === '/trending'
                      ? 'bg-orange-500 text-gray-900 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-orange-500'
                  }`}
                >
                  trending
                </Link>
                <Link
                  to="/explore"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-2 rounded font-mono transition-colors ${
                    location.pathname === '/explore'
                      ? 'bg-terminal-purple text-gray-900 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-terminal-purple'
                  }`}
                >
                  explore
                </Link>
              </nav>

              {user ? (
                <>
                  {/* Create Post Button */}
                  <button
                    onClick={() => {
                      onCreatePost();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-terminal-green text-gray-900 px-4 py-2 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors flex items-center justify-center space-x-2 mt-4"
                  >
                    <PenSquare size={18} />
                    <span>{currentTab === 'tasks' ? 'new_task' : 'new_post'}</span>
                  </button>

                  {/* User Menu Items */}
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                    <div className="flex items-center space-x-2 px-4 py-2 text-gray-300 font-mono text-sm">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-8 h-8 rounded-full object-cover border border-terminal-purple"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                          <User size={16} className="text-terminal-purple" />
                        </div>
                      )}
                      <span>{profile?.username}</span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-green flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <User size={16} />
                      <span>profile</span>
                    </Link>
                    <Link
                      to="/activity"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <Users size={16} />
                      <span>activity_feed</span>
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-purple flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <TrendingUp size={16} />
                      <span>analytics</span>
                    </Link>
                    <Link
                      to="/bookmarks"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span>bookmarks</span>
                    </Link>
                    <Link
                      to="/drafts"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-purple flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <PenSquare size={16} />
                      <span>drafts</span>
                    </Link>
                    <Link
                      to="/moderation"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-orange-500 flex items-center space-x-2 font-mono text-sm transition-colors border-t border-gray-800"
                    >
                      <Shield size={16} />
                      <span>moderation</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-purple flex items-center space-x-2 font-mono text-sm transition-colors"
                    >
                      <Settings size={16} />
                      <span>settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-terminal-pink flex items-center space-x-2 font-mono text-sm transition-colors border-t border-gray-800"
                    >
                      <LogOut size={16} />
                      <span>sign_out</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      openAuthModal('signin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 font-mono mt-4"
                  >
                    sign_in
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-terminal-green text-gray-900 px-4 py-2 rounded font-mono font-semibold hover:bg-terminal-blue"
                  >
                    get_started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />
    </>
  );
}
