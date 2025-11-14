import { redirect } from 'next/navigation';

/**
 * Home Page (Next.js Mode)
 *
 * In dual-mode architecture, the home page is primarily handled by Vite.
 * This page exists for Next.js-only deployments and redirects to /blogs.
 */
export default function HomePage() {
  redirect('/blogs');
}
