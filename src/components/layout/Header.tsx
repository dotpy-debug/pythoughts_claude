import { useState } from 'react';
import { Menu, X, User, LogOut, SquarePen as PenSquare, Terminal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { NotificationBell } from '../notifications/NotificationBell';
import { TypewriterText } from '../animations/TypewriterText';

type HeaderProps = {
  currentTab: 'newsfeed' | 'blogs' | 'tasks';
  onTabChange: (tab: 'newsfeed' | 'blogs' | 'tasks') => void;
  onCreatePost: () => void;
};

export function Header({ currentTab, onTabChange, onCreatePost }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-terminal-green via-terminal-blue to-terminal-purple rounded-lg flex items-center justify-center shadow-lg">
                  <Terminal size={20} className="text-gray-900" />
                </div>
                <div className="font-mono">
                  <span className="text-terminal-green">$ </span>
                  <TypewriterText text="pythoughts" className="text-xl font-bold text-gray-100" speed={150} />
                </div>
              </div>

              <nav className="hidden md:flex space-x-1">
                <button
                  onClick={() => onTabChange('newsfeed')}
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'newsfeed'
                      ? 'bg-terminal-green text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-green hover:bg-gray-800'
                  }`}
                >
                  newsfeed
                </button>
                <button
                  onClick={() => onTabChange('blogs')}
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'blogs'
                      ? 'bg-terminal-blue text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-blue hover:bg-gray-800'
                  }`}
                >
                  blogs
                </button>
                <button
                  onClick={() => onTabChange('tasks')}
                  className={`px-4 py-2 rounded font-mono transition-colors ${
                    currentTab === 'tasks'
                      ? 'bg-terminal-purple text-gray-900 font-semibold'
                      : 'text-gray-400 hover:text-terminal-purple hover:bg-gray-800'
                  }`}
                >
                  tasks
                </button>
              </nav>
            </div>

            <div className="hidden md:flex items-center space-x-4">
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

                  <div className="relative">
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
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-pink flex items-center space-x-2 font-mono text-sm transition-colors"
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
          <div className="md:hidden border-t border-gray-700 bg-gray-900">
            <nav className="px-4 py-4 space-y-2">
              <button
                onClick={() => {
                  onTabChange('newsfeed');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded font-mono ${
                  currentTab === 'newsfeed'
                    ? 'bg-terminal-green text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                newsfeed
              </button>
              <button
                onClick={() => {
                  onTabChange('blogs');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded font-mono ${
                  currentTab === 'blogs'
                    ? 'bg-terminal-blue text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                blogs
              </button>
              <button
                onClick={() => {
                  onTabChange('tasks');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded font-mono ${
                  currentTab === 'tasks'
                    ? 'bg-terminal-purple text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                tasks
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => {
                      onCreatePost();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-terminal-green text-gray-900 px-4 py-2 rounded font-mono font-semibold hover:bg-terminal-blue"
                  >
                    new_post
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 font-mono"
                  >
                    sign_out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      openAuthModal('signin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-800 font-mono"
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
            </nav>
          </div>
        )}
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />
    </>
  );
}
