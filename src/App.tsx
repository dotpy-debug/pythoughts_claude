import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TooltipProvider } from './components/ui/Tooltip';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Loader2 } from 'lucide-react';
import { useKeyboardShortcuts, SkipNavLink } from './hooks/useKeyboardNavigation';
import { initFocusVisible } from './utils/accessibility';
import { useScheduledPostsPublisher } from './hooks/useScheduledPostsPublisher';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load page components (from pages-vite - original Vite routes)
const LandingPage = lazy(() => import('./pages-vite/LandingPage').then(module_ => ({ default: module_.LandingPage })));
const HomePage = lazy(() => import('./pages-vite/HomePage').then(module_ => ({ default: module_.HomePage })));
const BlogsPage = lazy(() => import('./pages-vite/BlogsPage').then(module_ => ({ default: module_.BlogsPage })));
const TasksPage = lazy(() => import('./pages-vite/TasksPage').then(module_ => ({ default: module_.TasksPage })));
const PostDetailPage = lazy(() => import('./pages-vite/PostDetailPage').then(module_ => ({ default: module_.PostDetailPage })));
const ProfilePage = lazy(() => import('./pages-vite/ProfilePage').then(module_ => ({ default: module_.ProfilePage })));
const UserProfilePage = lazy(() => import('./pages-vite/UserProfilePage').then(module_ => ({ default: module_.UserProfilePage })));
const FollowersPage = lazy(() => import('./pages-vite/FollowersPage').then(module_ => ({ default: module_.FollowersPage })));
const FollowingPage = lazy(() => import('./pages-vite/FollowingPage').then(module_ => ({ default: module_.FollowingPage })));
const SettingsPage = lazy(() => import('./pages-vite/SettingsPage').then(module_ => ({ default: module_.SettingsPage })));
const DraftsPage = lazy(() => import('./pages-vite/DraftsPage').then(module_ => ({ default: module_.DraftsPage })));
const BookmarksPage = lazy(() => import('./pages-vite/BookmarksPage').then(module_ => ({ default: module_.BookmarksPage })));
const ReadingListsPage = lazy(() => import('./pages-vite/ReadingListsPage').then(module_ => ({ default: module_.ReadingListsPage })));
const ExplorePage = lazy(() => import('./pages-vite/ExplorePage').then(module_ => ({ default: module_.ExplorePage })));
const ActivityFeedPage = lazy(() => import('./pages-vite/ActivityFeedPage').then(module_ => ({ default: module_.ActivityFeedPage })));
const AnalyticsPage = lazy(() => import('./pages-vite/AnalyticsPage').then(module_ => ({ default: module_.AnalyticsPage })));
const TrendingPage = lazy(() => import('./pages-vite/TrendingPage').then(module_ => ({ default: module_.TrendingPage })));
const SearchResultsPage = lazy(() => import('./pages-vite/SearchResultsPage').then(module_ => ({ default: module_.SearchResultsPage })));
const PublicationsPage = lazy(() => import('./pages-vite/PublicationsPage').then(module_ => ({ default: module_.PublicationsPage })));
const PublicationDetailPage = lazy(() => import('./pages-vite/PublicationDetailPage').then(module_ => ({ default: module_.PublicationDetailPage })));
const PublicationSettingsPage = lazy(() => import('./pages-vite/PublicationSettingsPage').then(module_ => ({ default: module_.PublicationSettingsPage })));
const PublicationInvite = lazy(() => import('./pages-vite/PublicationInvite').then(module_ => ({ default: module_.PublicationInvite })));
const SeriesPage = lazy(() => import('./pages-vite/SeriesPage').then(module_ => ({ default: module_.SeriesPage })));
const SeriesDetailPage = lazy(() => import('./pages-vite/SeriesDetailPage').then(module_ => ({ default: module_.SeriesDetailPage })));
const SeriesEditPage = lazy(() => import('./pages-vite/SeriesEditPage').then(module_ => ({ default: module_.SeriesEditPage })));
const ModerationPage = lazy(() => import('./pages-vite/ModerationPage').then(module_ => ({ default: module_.ModerationPage })));
const NotFoundPage = lazy(() => import('./pages-vite/NotFoundPage').then(module_ => ({ default: module_.NotFoundPage })));
const BlogPostPage = lazy(() => import('./pages-vite/BlogPostPage').then(module_ => ({ default: module_.BlogPostPage })));
const BlogEditorPage = lazy(() => import('./pages-vite/BlogEditorPage').then(module_ => ({ default: module_.BlogEditorPage })));

const CreatePostModal = lazy(() => import('./components/posts/CreatePostModal').then(module_ => ({ default: module_.CreatePostModal })));
const CreateTaskModal = lazy(() => import('./components/tasks/CreateTaskModal').then(module_ => ({ default: module_.CreateTaskModal })));

// Lazy load animation components (non-critical decorative elements)
const FloatingBubbles = lazy(() => import('./components/animations/FloatingBubbles').then(module_ => ({ default: module_.FloatingBubbles })));

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  const currentTab = location.pathname === '/blogs' ? 'blogs' : (location.pathname === '/tasks' ? 'tasks' : 'newsfeed');
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
        globalThis.location.href = '/';
      },
      description: 'Go to home',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => {
        if (user) globalThis.location.href = '/bookmarks';
      },
      description: 'Go to bookmarks',
    },
    {
      key: 'p',
      ctrl: true,
      action: () => {
        if (user) globalThis.location.href = '/profile';
      },
      description: 'Go to profile',
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {!isLandingPage && (
        <>
          <SkipNavLink />
          <Suspense fallback={null}>
            <FloatingBubbles />
          </Suspense>
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
            <Route path="/blog/new" element={<BlogEditorPage />} />
            <Route path="/blog/edit/:postId" element={<BlogEditorPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
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
