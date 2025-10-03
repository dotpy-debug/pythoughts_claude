import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      external: ['ioredis', 'redis'],
      output: {
        manualChunks: {
          // Core vendor chunk - React and essential libraries
          'vendor-react': ['react', 'react-dom', 'react-dom/client'],

          // Markdown libraries - lazy loaded, separate chunk
          'markdown': [
            'react-markdown',
            'remark-gfm',
            'rehype-raw',
            'rehype-sanitize',
            '@uiw/react-md-editor',
          ],

          // Supabase client
          'supabase': ['@supabase/supabase-js'],

          // DnD libraries for tasks
          'dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/modifiers',
            '@dnd-kit/utilities',
          ],

          // UI utilities
          'ui-utils': [
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
        },
      },
    },
    // Increase chunk size warning limit for main bundle
    chunkSizeWarningLimit: 500,
    // Enable minification with esbuild (default, faster than terser)
    minify: 'esbuild',
  },
  server: {
    headers: {
      // Security headers for development
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'X-XSS-Protection': '1; mode=block',
      'X-DNS-Prefetch-Control': 'off',
    },
  },
  preview: {
    headers: {
      // Production security headers
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'X-XSS-Protection': '1; mode=block',
      'X-DNS-Prefetch-Control': 'off',
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; '),
    },
  },
});
