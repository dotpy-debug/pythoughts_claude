import { redirect } from 'next/navigation';

/**
 * Root page - redirects to /blogs for Next.js mode
 * Note: The main application experience is in Vite mode (http://localhost:5173)
 * Next.js mode is optimized for SEO and blog rendering
 */
export default function HomePage() {
  redirect('/blogs');
}
