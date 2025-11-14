/**
 * Build-time script to generate sitemap.xml and rss.xml
 * Run with: node --loader ts-node/esm scripts/generate-seo-files.ts
 * Or add to build process: "build": "node scripts/generate-seo-files.js && vite build"
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const baseUrl = process.env.VITE_BASE_URL || 'https://pythoughts.com';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate sitemap.xml
 */
async function generateSitemap() {
  console.log('Generating sitemap.xml...');

  try {
    // Fetch all published posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const now = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { url: '/', priority: 1, changefreq: 'daily' },
      { url: '/blogs', priority: 0.9, changefreq: 'daily' },
      { url: '/tasks', priority: 0.8, changefreq: 'daily' },
      { url: '/trending', priority: 0.9, changefreq: 'hourly' },
      { url: '/explore', priority: 0.8, changefreq: 'daily' },
      { url: '/publications', priority: 0.7, changefreq: 'weekly' },
    ];

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

    // Post URLs
    const postUrls = (posts || [])
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

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${postUrls}
</urlset>`;

    // Write to public directory
    const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml');
    writeFileSync(sitemapPath, sitemap);
    console.log(`✅ Sitemap generated: ${sitemapPath} (${posts?.length || 0} posts)`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
  }
}

/**
 * Generate rss.xml
 */
async function generateRSS() {
  console.log('Generating rss.xml...');

  try {
    // Fetch recent published posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        published_at,
        category,
        profiles:author_id (
          username
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const now = new Date().toUTCString();

    const items = (posts || [])
      .map((post: Record<string, unknown>) => {
        const pubDate = new Date(post.published_at || post.created_at).toUTCString();
        const link = `${baseUrl}/post/${post.id}`;
        const author = post.profiles?.username || 'Anonymous';
        const description = post.content.slice(0, 200).replaceAll(/<[^>]+>/g, '');

        return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${author}</author>
      ${post.category ? `<category>${post.category}</category>` : ''}
    </item>`;
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
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

    // Write to public directory
    const rssPath = join(process.cwd(), 'public', 'rss.xml');
    writeFileSync(rssPath, rss);
    console.log(`✅ RSS feed generated: ${rssPath} (${posts?.length || 0} posts)`);
  } catch (error) {
    console.error('❌ Error generating RSS:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Generating SEO files...\n');

  await Promise.all([
    generateSitemap(),
    generateRSS(),
  ]);

  console.log('\n✨ SEO files generation complete!');
}

main();
