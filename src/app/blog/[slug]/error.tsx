'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Blog post error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-black border-2 border-red-500/50 rounded-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-terminal-green mb-2">
          Something went wrong!
        </h2>
        <p className="text-terminal-green/70 mb-6">
          {error.message || 'An error occurred while loading this blog post.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-terminal-green text-black font-bold rounded hover:bg-terminal-green/80 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/blogs"
            className="px-6 py-2 bg-transparent border-2 border-terminal-green text-terminal-green font-bold rounded hover:bg-terminal-green/10 transition-colors inline-block"
          >
            Back to Blogs
          </a>
        </div>
      </div>
    </div>
  );
}
