import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingBubbles } from './components/animations/FloatingBubbles';
import { LogoLoopHorizontal } from './components/animations/LogoLoopHorizontal';
import { LogoLoopVertical } from './components/animations/LogoLoopVertical';
import { Loader2 } from 'lucide-react';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage').then(mod => ({ default: mod.HomePage })));
const BlogsPage = lazy(() => import('./pages/BlogsPage').then(mod => ({ default: mod.BlogsPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(mod => ({ default: mod.TasksPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(mod => ({ default: mod.PostDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(mod => ({ default: mod.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(mod => ({ default: mod.SettingsPage })));
const DraftsPage = lazy(() => import('./pages/DraftsPage').then(mod => ({ default: mod.DraftsPage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then(mod => ({ default: mod.BookmarksPage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then(mod => ({ default: mod.ExplorePage })));
const PublicationsPage = lazy(() => import('./pages/PublicationsPage').then(mod => ({ default: mod.PublicationsPage })));
const PublicationDetailPage = lazy(() => import('./pages/PublicationDetailPage').then(mod => ({ default: mod.PublicationDetailPage })));
const PublicationSettingsPage = lazy(() => import('./pages/PublicationSettingsPage').then(mod => ({ default: mod.PublicationSettingsPage })));
const SeriesPage = lazy(() => import('./pages/SeriesPage').then(mod => ({ default: mod.SeriesPage })));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage').then(mod => ({ default: mod.SeriesDetailPage })));
const SeriesEditPage = lazy(() => import('./pages/SeriesEditPage').then(mod => ({ default: mod.SeriesEditPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(mod => ({ default: mod.NotFoundPage })));

const CreatePostModal = lazy(() => import('./components/posts/CreatePostModal').then(mod => ({ default: mod.CreatePostModal })));
const CreateTaskModal = lazy(() => import('./components/tasks/CreateTaskModal').then(mod => ({ default: mod.CreateTaskModal })));

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  const currentTab = location.pathname === '/blogs' ? 'blogs' : location.pathname === '/tasks' ? 'tasks' : 'newsfeed';

  const handleCreatePost = () => {
    if (!user) return;
    if (currentTab === 'tasks') {
      setCreateTaskModalOpen(true);
    } else {
      setCreatePostModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      <FloatingBubbles />
      <LogoLoopHorizontal />
      <LogoLoopVertical />

      <Header onCreatePost={handleCreatePost} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 pr-20 relative z-10">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-terminal-green" size={48} />
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/post/:postId" element={<PostDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/publications" element={<PublicationsPage />} />
            <Route path="/publication/:slug" element={<PublicationDetailPage />} />
            <Route path="/publication/:slug/settings" element={<PublicationSettingsPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/series/:slug" element={<SeriesDetailPage />} />
            <Route path="/series/:slug/edit" element={<SeriesEditPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />

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
    <BrowserRouter>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
