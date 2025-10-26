/**
 * Blog Post Pre-rendering Script
 *
 * Generates static HTML for blog posts to enable SSG (Static Site Generation)
 * Improves TTFB and SEO by serving pre-rendered HTML instead of client-side fetching
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content_html: string;
  toc_data: any;
  created_at: string;
  updated_at: string;
  published_at: string;
  reading_time: number;
  view_count: number;
  author_id: string;
  cover_image: string | null;
  tags: string[];
}

/**
 * Fetch all published blog posts from Supabase
 */
async function fetchBlogPosts(): Promise<BlogPost[]> {
  console.log('📡 Fetching published blog posts from Supabase...');

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('post_type', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching blog posts:', error);
    throw error;
  }

  console.log(`✅ Fetched ${data?.length || 0} blog posts`);
  return (data || []) as BlogPost[];
}

/**
 * Generate static HTML for a blog post
 */
function generateBlogHTML(post: BlogPost): string {
  const escapeHtml = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO Meta Tags -->
  <title>${escapeHtml(post.title)} | Pythoughts</title>
  <meta name="description" content="${escapeHtml(post.subtitle || post.title)}">
  <meta name="author" content="Pythoughts">
  <meta name="keywords" content="${(post.tags || []).map(escapeHtml).join(', ')}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.subtitle || post.title)}">
  ${post.cover_image ? `<meta property="og:image" content="${escapeHtml(post.cover_image)}">` : ''}
  <meta property="og:url" content="https://pythoughts.com/blog/${escapeHtml(post.slug)}">
  <meta property="article:published_time" content="${post.published_at}">
  <meta property="article:modified_time" content="${post.updated_at}">
  <meta property="article:author" content="Pythoughts">
  ${(post.tags || []).map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join('\n  ')}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.subtitle || post.title)}">
  ${post.cover_image ? `<meta name="twitter:image" content="${escapeHtml(post.cover_image)}">` : ''}

  <!-- Canonical URL -->
  <link rel="canonical" href="https://pythoughts.com/blog/${escapeHtml(post.slug)}">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeHtml(post.title)}",
    "description": "${escapeHtml(post.subtitle || post.title)}",
    ${post.cover_image ? `"image": "${escapeHtml(post.cover_image)}",` : ''}
    "datePublished": "${post.published_at}",
    "dateModified": "${post.updated_at}",
    "author": {
      "@type": "Person",
      "name": "Pythoughts"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Pythoughts",
      "logo": {
        "@type": "ImageObject",
        "url": "https://pythoughts.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://pythoughts.com/blog/${escapeHtml(post.slug)}"
    },
    "wordCount": ${Math.ceil(post.content_html.split(' ').length)},
    "timeRequired": "PT${post.reading_time}M",
    "keywords": "${(post.tags || []).map(escapeHtml).join(', ')}"
  }
  </script>

  <!-- Preload critical resources -->
  <link rel="preload" href="/assets/index.css" as="style">
  <link rel="preload" href="/assets/index.js" as="script">

  <!-- Stylesheet -->
  <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
  <div id="root"></div>

  <!-- Hydration Data -->
  <script type="application/json" id="blog-data">
  ${JSON.stringify({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      content_html: post.content_html,
      toc_data: post.toc_data,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
      reading_time: post.reading_time,
      view_count: post.view_count,
      cover_image: post.cover_image,
      tags: post.tags,
    }
  })}
  </script>

  <!-- Application Bundle -->
  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;
}

/**
 * Generate sitemap.xml for all blog posts
 */
function generateSitemap(posts: BlogPost[]): string {
  const urls = posts.map(post => `
  <url>
    <loc>https://pythoughts.com/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pythoughts.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pythoughts.com/blogs</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>${urls}
</urlset>`;
}

/**
 * Main pre-rendering function
 */
async function prerenderBlogs() {
  console.log('🚀 Starting blog pre-rendering...\n');

  try {
    // Fetch all published blogs
    const posts = await fetchBlogPosts();

    if (posts.length === 0) {
      console.log('⚠️  No published blog posts found. Skipping pre-rendering.');
      return;
    }

    // Ensure dist directory exists
    const distDir = path.resolve(__dirname, '../dist');
    const blogDir = path.join(distDir, 'blog');

    try {
      await fs.mkdir(blogDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, continue
    }

    // Generate HTML for each blog post
    console.log(`\n📝 Generating static HTML for ${posts.length} blog posts...\n`);

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        const html = generateBlogHTML(post);
        const postDir = path.join(blogDir, post.slug);
        const htmlPath = path.join(postDir, 'index.html');

        // Create post directory
        await fs.mkdir(postDir, { recursive: true });

        // Write HTML file
        await fs.writeFile(htmlPath, html, 'utf-8');

        console.log(`  ✓ ${post.slug}`);
        successCount++;
      } catch (err) {
        console.error(`  ✗ ${post.slug}: ${err instanceof Error ? err.message : String(err)}`);
        errorCount++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Generate sitemap
    console.log('\n📍 Generating sitemap.xml...');
    const sitemap = generateSitemap(posts);
    await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
    console.log('  ✓ sitemap.xml');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ Pre-rendering Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total Posts: ${posts.length}`);
    console.log(`✅ Success: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📁 Output: ${blogDir}`);
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('\n❌ Pre-rendering failed:', err);
    process.exit(1);
  }
}

// Run the pre-rendering
prerenderBlogs();
