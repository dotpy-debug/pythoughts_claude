import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TooltipProvider } from './components/ui/Tooltip';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingBubbles } from './components/animations/FloatingBubbles';
import { LogoLoopHorizontal } from './components/animations/LogoLoopHorizontal';
import { LogoLoopVertical } from './components/animations/LogoLoopVertical';
import { Loader2 } from 'lucide-react';
import { useKeyboardShortcuts, SkipNavLink } from './hooks/useKeyboardNavigation';
import { initFocusVisible } from './utils/accessibility';
import { useScheduledPostsPublisher } from './hooks/useScheduledPostsPublisher';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load page components
const LandingPage = lazy(() => import('./pages/LandingPage').then(mod => ({ default: mod.LandingPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(mod => ({ default: mod.HomePage })));
const BlogsPage = lazy(() => import('./pages/BlogsPage').then(mod => ({ default: mod.BlogsPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(mod => ({ default: mod.TasksPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(mod => ({ default: mod.PostDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(mod => ({ default: mod.ProfilePage })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then(mod => ({ default: mod.UserProfilePage })));
const FollowersPage = lazy(() => import('./pages/FollowersPage').then(mod => ({ default: mod.FollowersPage })));
const FollowingPage = lazy(() => import('./pages/FollowingPage').then(mod => ({ default: mod.FollowingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(mod => ({ default: mod.SettingsPage })));
const DraftsPage = lazy(() => import('./pages/DraftsPage').then(mod => ({ default: mod.DraftsPage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then(mod => ({ default: mod.BookmarksPage })));
const ReadingListsPage = lazy(() => import('./pages/ReadingListsPage').then(mod => ({ default: mod.ReadingListsPage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then(mod => ({ default: mod.ExplorePage })));
const ActivityFeedPage = lazy(() => import('./pages/ActivityFeedPage').then(mod => ({ default: mod.ActivityFeedPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(mod => ({ default: mod.AnalyticsPage })));
const TrendingPage = lazy(() => import('./pages/TrendingPage').then(mod => ({ default: mod.TrendingPage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then(mod => ({ default: mod.SearchResultsPage })));
const PublicationsPage = lazy(() => import('./pages/PublicationsPage').then(mod => ({ default: mod.PublicationsPage })));
const PublicationDetailPage = lazy(() => import('./pages/PublicationDetailPage').then(mod => ({ default: mod.PublicationDetailPage })));
const PublicationSettingsPage = lazy(() => import('./pages/PublicationSettingsPage').then(mod => ({ default: mod.PublicationSettingsPage })));
const PublicationInvite = lazy(() => import('./pages/PublicationInvite').then(mod => ({ default: mod.PublicationInvite })));
const SeriesPage = lazy(() => import('./pages/SeriesPage').then(mod => ({ default: mod.SeriesPage })));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage').then(mod => ({ default: mod.SeriesDetailPage })));
const SeriesEditPage = lazy(() => import('./pages/SeriesEditPage').then(mod => ({ default: mod.SeriesEditPage })));
const ModerationPage = lazy(() => import('./pages/ModerationPage').then(mod => ({ default: mod.ModerationPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(mod => ({ default: mod.NotFoundPage })));

const CreatePostModal = lazy(() => import('./components/posts/CreatePostModal').then(mod => ({ default: mod.CreatePostModal })));
const CreateTaskModal = lazy(() => import('./components/tasks/CreateTaskModal').then(mod => ({ default: mod.CreateTaskModal })));

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  const currentTab = location.pathname === '/blogs' ? 'blogs' : location.pathname === '/tasks' ? 'tasks' : 'newsfeed';
  const isLandingPage = !user && location.pathname === '/';

  const handleCreatePost = () => {
    if (!user) return;
    if (currentTab === 'tasks') {
      setCreateTaskModalOpen(true);
    } else {
      setCreatePostModalOpen(true);
    }
  };

  // Initialize focus-visible detection for keyboard navigation
  useEffect(() => {
    const cleanup = initFocusVisible();
    return cleanup;
  }, []);

  // Enable scheduled posts publisher (runs every 1 minute)
  useScheduledPostsPublisher(1, true);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"]');
        searchInput?.focus();
      },
      description: 'Focus search',
      preventDefault: true,
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (user) handleCreatePost();
      },
      description: 'New post',
    },
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"]');
        searchInput?.focus();
      },
      description: 'Open search',
    },
    {
      key: 'h',
      ctrl: true,
      action: () => {
        window.location.href = '/';
      },
      description: 'Go to home',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => {
        if (user) window.location.href = '/bookmarks';
      },
      description: 'Go to bookmarks',
    },
    {
      key: 'p',
      ctrl: true,
      action: () => {
        if (user) window.location.href = '/profile';
      },
      description: 'Go to profile',
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {!isLandingPage && (
        <>
          <SkipNavLink />
          <FloatingBubbles />
          <LogoLoopHorizontal />
          <LogoLoopVertical />
          <Header onCreatePost={handleCreatePost} />
        </>
      )}

      <main id="main-content" tabIndex={-1} className={isLandingPage ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 lg:pr-20 relative z-10 outline-none"}>
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-terminal-green" size={48} />
          </div>
        }>
          <Routes>
            <Route path="/" element={user ? <HomePage /> : <LandingPage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/post/:postId" element={<PostDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/followers" element={<FollowersPage />} />
            <Route path="/profile/following" element={<FollowingPage />} />
            <Route path="/user/:username" element={<UserProfilePage />} />
            <Route path="/user/:username/followers" element={<FollowersPage />} />
            <Route path="/user/:username/following" element={<FollowingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/reading-lists" element={<ReadingListsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/activity" element={<ActivityFeedPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/publications" element={<PublicationsPage />} />
            <Route path="/publications/invite/:token" element={<PublicationInvite />} />
            <Route path="/publication/:slug" element={<PublicationDetailPage />} />
            <Route path="/publication/:slug/settings" element={<PublicationSettingsPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/series/:slug" element={<SeriesDetailPage />} />
            <Route path="/series/:slug/edit" element={<SeriesEditPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {!isLandingPage && <Footer />}

      <Suspense fallback={null}>
        <CreatePostModal
          isOpen={createPostModalOpen}
          onClose={() => setCreatePostModalOpen(false)}
          postType={currentTab === 'blogs' ? 'blog' : 'news'}
        />

        <CreateTaskModal
          isOpen={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          onTaskCreated={() => {}}
        />
      </Suspense>
    </div>
  );
}

function App() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <NotificationProvider>
            <TooltipProvider delayDuration={500} skipDelayDuration={300}>
              <AppContent />
            </TooltipProvider>
          </NotificationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
