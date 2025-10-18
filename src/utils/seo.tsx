/**
 * SEO Utilities for Pythoughts
 * Handles structured data, meta tags, and SEO optimization
 */

import { Post, Profile } from '../lib/supabase';

/**
 * Generate JSON-LD structured data for a blog post
 */
export function generateBlogPostSchema(post: Post, baseUrl: string = 'https://pythoughts.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.subtitle || post.content.substring(0, 160),
    image: post.image_url ? `${baseUrl}${post.image_url}` : `${baseUrl}/og-image.png`,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.profiles?.username || 'Anonymous',
      url: `${baseUrl}/user/${post.profiles?.username}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pythoughts',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon-512x512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/post/${post.id}`,
    },
    articleSection: post.category || 'Technology',
    keywords: post.category,
    wordCount: post.content.split(/\s+/).length,
    timeRequired: `PT${post.reading_time_minutes || 5}M`,
  };
}

/**
 * Generate JSON-LD structured data for a person/profile
 */
export function generatePersonSchema(profile: Profile, baseUrl: string = 'https://pythoughts.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.username,
    description: profile.bio || `${profile.username}'s profile on Pythoughts`,
    image: profile.avatar_url || `${baseUrl}/icon-512x512.png`,
    url: `${baseUrl}/user/${profile.username}`,
    sameAs: [
      // Add social media links if available
    ],
  };
}

/**
 * Generate JSON-LD structured data for the website
 */
export function generateWebsiteSchema(baseUrl: string = 'https://pythoughts.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pythoughts',
    description: 'A terminal-themed blogging platform for sharing thoughts, news, and technical content',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pythoughts',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon-512x512.png`,
      },
    },
  };
}

/**
 * Generate JSON-LD structured data for an organization
 */
export function generateOrganizationSchema(baseUrl: string = 'https://pythoughts.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pythoughts',
    description: 'A terminal-themed blogging platform for developers and tech enthusiasts',
    url: baseUrl,
    logo: `${baseUrl}/icon-512x512.png`,
    sameAs: [
      'https://twitter.com/pythoughts',
      'https://github.com/pythoughts',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@pythoughts.com',
    },
  };
}

/**
 * Generate JSON-LD structured data for breadcrumbs
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
  baseUrl: string = 'https://pythoughts.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Component to inject structured data into the page
 */
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Update page meta tags dynamically
 */
export function updateMetaTags(meta: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
  canonical?: string;
}) {
  const baseUrl = 'https://pythoughts.com';

  // Update title
  if (meta.title) {
    document.title = `${meta.title} | Pythoughts`;

    // Update Open Graph title
    updateMetaTag('og:title', meta.title);
    updateMetaTag('twitter:title', meta.title);
  }

  // Update description
  if (meta.description) {
    updateMetaTag('description', meta.description);
    updateMetaTag('og:description', meta.description);
    updateMetaTag('twitter:description', meta.description);
  }

  // Update image
  if (meta.image) {
    const imageUrl = meta.image.startsWith('http') ? meta.image : `${baseUrl}${meta.image}`;
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('twitter:image', imageUrl);
  }

  // Update URL
  if (meta.url) {
    const fullUrl = meta.url.startsWith('http') ? meta.url : `${baseUrl}${meta.url}`;
    updateMetaTag('og:url', fullUrl);
    updateMetaTag('twitter:url', fullUrl);
    updateLinkTag('canonical', fullUrl);
  }

  // Update type
  if (meta.type) {
    updateMetaTag('og:type', meta.type);
  }

  // Update keywords
  if (meta.keywords) {
    updateMetaTag('keywords', meta.keywords);
  }

  // Update canonical
  if (meta.canonical) {
    const canonicalUrl = meta.canonical.startsWith('http') ? meta.canonical : `${baseUrl}${meta.canonical}`;
    updateLinkTag('canonical', canonicalUrl);
  }
}

/**
 * Helper to update a meta tag
 */
function updateMetaTag(name: string, content: string) {
  // Try name attribute first
  let element = document.querySelector(`meta[name="${name}"]`);

  // If not found, try property attribute (for Open Graph)
  if (!element) {
    element = document.querySelector(`meta[property="${name}"]`);
  }

  // If still not found, create it
  if (!element) {
    element = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Helper to update a link tag
 */
function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

/**
 * Generate RSS feed for blog posts
 */
export function generateRSSFeed(posts: Post[], baseUrl: string = 'https://pythoughts.com'): string {
  const now = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const pubDate = new Date(post.published_at || post.created_at).toUTCString();
      const link = `${baseUrl}/post/${post.id}`;

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.subtitle || post.content.substring(0, 200)}]]></description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${post.profiles?.username || 'Anonymous'}</author>
      ${post.category ? `<category>${post.category}</category>` : ''}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pythoughts - Terminal Blog Platform</title>
    <link>${baseUrl}</link>
    <description>A terminal-themed blogging platform for sharing thoughts, news, and technical content</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

/**
 * Generate sitemap XML
 */
export function generateSitemap(
  posts: Post[],
  staticPages: Array<{ url: string; priority: number; changefreq: string }>,
  baseUrl: string = 'https://pythoughts.com'
): string {
  const now = new Date().toISOString().split('T')[0];

  const staticUrls = staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('\n');

  const postUrls = posts
    .map((post) => {
      const lastmod = post.updated_at.split('T')[0];
      return `
  <url>
    <loc>${baseUrl}/post/${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${postUrls}
</urlset>`;
}
