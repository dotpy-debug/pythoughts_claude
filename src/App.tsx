import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { supabase, Post, Vote } from './lib/supabase';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingBubbles } from './components/animations/FloatingBubbles';
import { LogoLoopHorizontal } from './components/animations/LogoLoopHorizontal';
import { LogoLoopVertical } from './components/animations/LogoLoopVertical';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components for code splitting
const PostList = lazy(() => import('./components/posts/PostList').then(mod => ({ default: mod.PostList })));
const PostDetail = lazy(() => import('./components/posts/PostDetail').then(mod => ({ default: mod.PostDetail })));
const BlogGrid = lazy(() => import('./components/blogs/BlogGrid').then(mod => ({ default: mod.BlogGrid })));
const CreatePostModal = lazy(() => import('./components/posts/CreatePostModal').then(mod => ({ default: mod.CreatePostModal })));
const TaskList = lazy(() => import('./components/tasks/TaskList').then(mod => ({ default: mod.TaskList })));
const CreateTaskModal = lazy(() => import('./components/tasks/CreateTaskModal').then(mod => ({ default: mod.CreateTaskModal })));

type View = 'newsfeed' | 'blogs' | 'tasks' | 'post-detail';

function App() {
  const { loading: authLoading, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'newsfeed' | 'blogs' | 'tasks'>('newsfeed');
  const [currentView, setCurrentView] = useState<View>('newsfeed');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});

  const loadUserVotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('post_id, vote_type')
        .eq('user_id', user.id)
        .not('post_id', 'is', null);

      if (error) throw error;

      const votesMap: Record<string, 1 | -1> = {};
      data?.forEach((vote: Pick<Vote, 'post_id' | 'vote_type'>) => {
        if (vote.post_id) {
          votesMap[vote.post_id] = vote.vote_type;
        }
      });
      setUserVotes(votesMap);
    } catch (error) {
      console.error('Error loading user votes:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserVotes();
    }
  }, [user, loadUserVotes]);

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) return;

    try {
      const existingVote = userVotes[postId];

      if (existingVote === voteType) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        const newVotes = { ...userVotes };
        delete newVotes[postId];
        setUserVotes(newVotes);

        if (selectedPost?.id === postId) {
          setSelectedPost({
            ...selectedPost,
            vote_count: selectedPost.vote_count - voteType,
          });
        }
      } else if (existingVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('post_id', postId);

        setUserVotes({ ...userVotes, [postId]: voteType });

        if (selectedPost?.id === postId) {
          setSelectedPost({
            ...selectedPost,
            vote_count: selectedPost.vote_count - existingVote + voteType,
          });
        }
      } else {
        await supabase.from('votes').insert({
          user_id: user.id,
          post_id: postId,
          vote_type: voteType,
        });

        setUserVotes({ ...userVotes, [postId]: voteType });

        if (selectedPost?.id === postId) {
          setSelectedPost({
            ...selectedPost,
            vote_count: selectedPost.vote_count + voteType,
          });
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleTabChange = (tab: 'newsfeed' | 'blogs' | 'tasks') => {
    setCurrentTab(tab);
    setCurrentView(tab);
    setSelectedPost(null);
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setCurrentView('post-detail');
  };

  const handleBackToList = () => {
    setSelectedPost(null);
    setCurrentView(currentTab);
  };

  const handleCreatePost = () => {
    if (!user) return;
    if (currentTab === 'tasks') {
      setCreateTaskModalOpen(true);
    } else {
      setCreatePostModalOpen(true);
    }
  };

  const handleTaskCreated = () => {
    setTaskRefreshKey(prev => prev + 1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        <FloatingBubbles />
        <LogoLoopHorizontal />
        <LogoLoopVertical />

        <Header
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onCreatePost={handleCreatePost}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 pr-20 relative z-10">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-terminal-green" size={48} />
            </div>
          }>
            {currentView === 'post-detail' && selectedPost ? (
              <PostDetail
                post={selectedPost}
                userVote={userVotes[selectedPost.id] || null}
                onVote={handleVote}
                onBack={handleBackToList}
              />
            ) : currentTab === 'newsfeed' ? (
              <PostList postType="news" onPostClick={handlePostClick} />
            ) : currentTab === 'blogs' ? (
              <BlogGrid onBlogClick={handlePostClick} />
            ) : (
              <div key={taskRefreshKey}>
                <TaskList />
              </div>
            )}
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
            onTaskCreated={handleTaskCreated}
          />
        </Suspense>
      </div>
    </NotificationProvider>
  );
}

export default App;
