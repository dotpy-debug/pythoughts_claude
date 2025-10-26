import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-black border-2 border-terminal-green/50 rounded-lg p-8 text-center">
        <FileQuestion className="w-16 h-16 text-terminal-green mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-terminal-green mb-2">404</h2>
        <h3 className="text-xl font-semibold text-terminal-green mb-4">
          Blog Post Not Found
        </h3>
        <p className="text-terminal-green/70 mb-6">
          The blog post you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/blogs"
          className="inline-block px-6 py-2 bg-terminal-green text-black font-bold rounded hover:bg-terminal-green/80 transition-colors"
        >
          Browse All Blogs
        </a>
      </div>
    </div>
  );
}
