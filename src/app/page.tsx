import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pythoughts',
  description: 'A modern platform for sharing thoughts, ideas, and stories',
};

/**
 * Root page - Simple landing page for Next.js mode
 * Note: The main application experience is in Vite mode (http://localhost:5173)
 * Next.js mode is optimized for SEO and blog rendering
 */
export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-terminal-green font-mono mb-6">
          Pythoughts
        </h1>
        <p className="text-gray-400 mb-8">Share your thoughts, ideas, and stories</p>
        <Link
          href="/blogs"
          className="inline-block bg-terminal-green text-gray-900 px-8 py-3 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors"
        >
          View Blogs
        </Link>
      </div>
    </div>
  );
}
