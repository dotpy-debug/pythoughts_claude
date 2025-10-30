import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Code, Users, Zap, TrendingUp, BookOpen, CheckCircle, Terminal, ArrowRight, Star } from 'lucide-react';
import PyThoughtsLogo from '../components/ui/pythoughts-logo';
import { AuthModal } from '../components/auth/AuthModal';
import { DynamicStatsBar } from '../components/landing/DynamicStatsBar';
import { FeaturedBlogSection } from '../components/blogs/FeaturedBlogSection';
import { BlogOfTheDaySection } from '../components/blogs/BlogOfTheDaySection';
import { LatestBlogsSection } from '../components/blogs/LatestBlogsSection';

export function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: 'Share Code & Thoughts',
      description: 'Post Python code snippets, tutorials, and insights with the community.',
      color: 'terminal-green',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Connect with Developers',
      description: 'Follow developers, engage with posts, and build your network.',
      color: 'terminal-blue',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Task Management',
      description: 'Organize your coding projects with our built-in task system.',
      color: 'terminal-purple',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Discover Trending',
      description: 'Stay up-to-date with trending Python topics and discussions.',
      color: 'orange-500',
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Write Blog Posts',
      description: 'Create long-form technical content and build your developer brand.',
      color: 'terminal-blue',
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Earn Reputation',
      description: 'Gain recognition through claps, follows, and community engagement.',
      color: 'terminal-green',
    },
  ];

  const benefits = [
    'Share and discover Python code snippets',
    'Engage with a passionate Python community',
    'Publish technical blog posts',
    'Follow your favorite Python developers',
    'Track and manage coding tasks',
    'Bookmark and highlight content',
    'Build your developer portfolio',
    'Stay updated with trending topics',
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <PyThoughtsLogo compact={false} className="scale-90" />
          <div className="flex items-center space-x-4">
            <button
              onClick={() => openAuthModal('signin')}
              className="text-gray-300 hover:text-terminal-green font-mono transition-colors text-sm"
            >
              sign_in
            </button>
            <button
              onClick={() => openAuthModal('signup')}
              className="bg-terminal-green text-gray-900 px-6 py-2 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors text-sm"
            >
              get_started
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-20 sm:py-28 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-center mb-8">
              <PyThoughtsLogo compact={true} className="scale-125" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 font-mono leading-tight">
              <span className="text-terminal-green">$ </span>
              Where Python Thoughts
              <br />
              <span className="text-terminal-blue">Connect</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 font-mono max-w-2xl mx-auto">
              A community platform for Python developers to share code, write blogs, collaborate on projects, and grow together.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-8">
              <button
                onClick={() => openAuthModal('signup')}
                className="w-full sm:w-auto bg-terminal-green text-gray-900 px-8 py-4 rounded-lg font-mono font-semibold hover:bg-terminal-blue transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Terminal size={20} />
                <span>Start Sharing</span>
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => openAuthModal('signin')}
                className="w-full sm:w-auto bg-gray-800 text-gray-100 px-8 py-4 rounded-lg font-mono font-semibold hover:bg-gray-700 transition-all border border-gray-700"
              >
                Sign In
              </button>
            </div>

            {/* Dynamic Stats Bar */}
            <div className="pt-12">
              <DynamicStatsBar />
            </div>
          </div>
        </section>

        {/* Featured Blogs Section */}
        <FeaturedBlogSection maxBlogs={3} showEngagement={true} autoRefresh={true} />

        <section className="py-20 border-t border-gray-800">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 font-mono mb-4">
              <span className="text-terminal-green">$ </span>platform_features
            </h2>
            <p className="text-gray-400 font-mono">Everything you need to share and grow as a Python developer</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-terminal-green transition-all duration-300 group"
              >
                <div className={`text-${feature.color} mb-4 transform group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-100 font-mono mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 font-mono text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Blog of the Day Section */}
        <BlogOfTheDaySection showAuthorBio={true} showSocialShare={false} />

        {/* Latest Blogs Section */}
        <LatestBlogsSection maxBlogs={6} />

        <section className="py-20 border-t border-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-terminal-green/10 via-terminal-blue/10 to-terminal-purple/10 border border-terminal-green/30 rounded-lg p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 font-mono mb-8 text-center">
                <span className="text-terminal-green">$ </span>why_pythoughts?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 text-gray-300 font-mono text-sm"
                  >
                    <CheckCircle size={20} className="text-terminal-green flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-terminal-green text-gray-900 px-8 py-4 rounded-lg font-mono font-semibold hover:bg-terminal-blue transition-all transform hover:scale-105 inline-flex items-center space-x-2"
                >
                  <span>Join the Community</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-gray-800 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
              <Terminal size={48} className="text-terminal-green mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-100 font-mono mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-400 font-mono mb-8">
                Join thousands of Python developers sharing their knowledge and building amazing projects.
              </p>
              <button
                onClick={() => openAuthModal('signup')}
                className="bg-terminal-green text-gray-900 px-8 py-4 rounded-lg font-mono font-semibold hover:bg-terminal-blue transition-all transform hover:scale-105 inline-flex items-center space-x-2"
              >
                <span>Create Free Account</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <PyThoughtsLogo compact={true} className="scale-75" />
              <span className="text-gray-400 font-mono text-sm">
                © 2025 PyThoughts.com - Where Python Thoughts Connect
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm font-mono">
              <Link to="/about" className="text-gray-400 hover:text-terminal-green transition-colors">
                About
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-terminal-green transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-gray-400 hover:text-terminal-green transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
