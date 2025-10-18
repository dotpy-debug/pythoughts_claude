import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-terminal-green">404</h1>
          <h2 className="text-2xl font-semibold text-gray-200">Page Not Found</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-terminal-green/10 text-terminal-green border border-terminal-green/30 rounded-lg hover:bg-terminal-green/20 hover:border-terminal-green/50 transition-all duration-220"
          >
            <Home size={20} />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800/50 text-gray-300 border border-gray-700/50 rounded-lg hover:bg-gray-800/70 hover:border-gray-700/70 transition-all duration-220"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
