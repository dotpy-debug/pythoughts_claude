/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Empty turbopack config to silence warning
  turbopack: {},

  // Configure image optimization (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    // Enable Server Actions for form handling
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  },

  // Redirects for old Vite routes to new Next.js routes
  async redirects() {
    return [];
  },

  // Headers for cache optimization and performance
  async headers() {
    return [
      // Cache headers for ISR pages (blog posts)
      {
        source: '/blog/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=3600, stale-while-revalidate=86400',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'max-age=3600',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'max-age=3600',
          },
        ],
      },
      // Cache headers for blog listing (shorter revalidation)
      {
        source: '/blogs',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=300, stale-while-revalidate=3600',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'max-age=300',
          },
        ],
      },
      // Cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache headers for images
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // General headers for all pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  // Optimize build output
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Configure output for static export if needed
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,

  // TypeScript configuration
  typescript: {
    // Allow production builds to successfully complete even with type errors
    // We'll rely on pre-commit type checking instead
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
