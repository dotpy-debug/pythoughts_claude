'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page - redirects to /blogs for Next.js mode
 * Note: The main application experience is in Vite mode (http://localhost:5173)
 * Next.js mode is optimized for SEO and blog rendering
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/blogs');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
      <div className="text-terminal-green font-mono">Redirecting to blogs...</div>
    </div>
  );
}
