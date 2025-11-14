/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Configure image optimization (Supabase Storage + external sources)
  // NOTE: For bolt.new deployments, if sharp fails to install, set NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION=true
  images: process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === 'true'
    ? {
        unoptimized: true,
      }
    : {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: '*.supabase.co',
            port: '',
            pathname: '/storage/v1/object/public/**',
          },
          {
            protocol: 'https',
            hostname: 'images.unsplash.com',
          },
          {
            protocol: 'https',
            hostname: 'images.pexels.com',
          },
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
          },
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      },

  // Server Actions configuration (stable in Next.js 15)
  serverActions: {
    bodySizeLimit: '2mb',
    allowedOrigins: ['localhost:3000', 'localhost:5173'],
  },

  // Experimental features for Next.js 15
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-tooltip',
      'recharts',
      'react-chartjs-2',
    ],
    // Enable Turbopack for faster builds (Next.js 15 feature)
    turbo: {
      resolveAlias: {
        '@': './src',
      },
    },
    // Strict Next.js caching semantics
    staleTimes: {
      dynamic: 30,
      static: 180,
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
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Configure output for static export if needed
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,

  // TypeScript configuration
  typescript: {
    // Enforce type checking during build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Enforce linting during build
    ignoreDuringBuilds: false,
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Power optimization
  poweredByHeader: false,

  // Compression
  compress: true,

  // Generate ETags for pages
  generateEtags: true,

  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Webpack configuration (for advanced use cases)
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here if needed
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
