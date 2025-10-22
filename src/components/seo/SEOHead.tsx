/**
 * SEOHead Component
 *
 * Declarative SEO meta tags component for React
 * Handles Open Graph, Twitter Cards, and canonical URLs
 */

import { useEffect } from 'react';
import { updateMetaTags } from '../../utils/seo';

interface SEOHeadProps {
  /**
   * Page title (appears in browser tab and search results)
   * Max recommended: 60 characters
   */
  title: string;

  /**
   * Meta description for search results
   * Max recommended: 160 characters
   */
  description: string;

  /**
   * Canonical URL (absolute URL to this page)
   * @example "https://pythoughts.com/post/my-awesome-post"
   */
  canonicalUrl?: string;

  /**
   * Open Graph type
   * @default "website"
   */
  type?: 'website' | 'article' | 'profile';

  /**
   * Featured image URL for social sharing
   * Recommended: 1200x630px
   */
  image?: string;

  /**
   * Keywords for search engines (comma-separated)
   */
  keywords?: string;

  /**
   * Author name
   */
  author?: string;

  /**
   * Publication date (ISO 8601 format)
   */
  publishedTime?: string;

  /**
   * Last modified date (ISO 8601 format)
   */
  modifiedTime?: string;

  /**
   * Article section/category
   */
  section?: string;

  /**
   * Article tags (array)
   */
  tags?: string[];

  /**
   * Robots directive
   * @default "index, follow"
   */
  robots?: string;

  /**
   * Additional JSON-LD structured data
   */
  structuredData?: object;
}

/**
 * SEOHead Component
 *
 * Updates page meta tags for SEO and social sharing
 *
 * @example
 * ```tsx
 * <SEOHead
 *   title="My Blog Post - Pythoughts"
 *   description="Learn about React and TypeScript in this comprehensive guide"
 *   canonicalUrl="https://pythoughts.com/post/react-typescript-guide"
 *   type="article"
 *   image="https://pythoughts.com/images/post-cover.jpg"
 *   author="John Doe"
 *   publishedTime="2025-01-15T10:00:00Z"
 * />
 * ```
 */
export function SEOHead({
  title,
  description,
  canonicalUrl,
  type = 'website',
  image,
  keywords,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  robots = 'index, follow',
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    updateMetaTags({
      title,
      description,
      url: canonicalUrl || window.location.href,
      type,
      image,
    });

    // Update keywords if provided
    if (keywords) {
      let keywordsTag = document.querySelector('meta[name="keywords"]');
      if (!keywordsTag) {
        keywordsTag = document.createElement('meta');
        keywordsTag.setAttribute('name', 'keywords');
        document.head.appendChild(keywordsTag);
      }
      keywordsTag.setAttribute('content', keywords);
    }

    // Update author if provided
    if (author) {
      let authorTag = document.querySelector('meta[name="author"]');
      if (!authorTag) {
        authorTag = document.createElement('meta');
        authorTag.setAttribute('name', 'author');
        document.head.appendChild(authorTag);
      }
      authorTag.setAttribute('content', author);
    }

    // Update robots directive
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute('content', robots);

    // Update article-specific meta tags
    if (type === 'article') {
      // Published time
      if (publishedTime) {
        let publishedTag = document.querySelector('meta[property="article:published_time"]');
        if (!publishedTag) {
          publishedTag = document.createElement('meta');
          publishedTag.setAttribute('property', 'article:published_time');
          document.head.appendChild(publishedTag);
        }
        publishedTag.setAttribute('content', publishedTime);
      }

      // Modified time
      if (modifiedTime) {
        let modifiedTag = document.querySelector('meta[property="article:modified_time"]');
        if (!modifiedTag) {
          modifiedTag = document.createElement('meta');
          modifiedTag.setAttribute('property', 'article:modified_time');
          document.head.appendChild(modifiedTag);
        }
        modifiedTag.setAttribute('content', modifiedTime);
      }

      // Section
      if (section) {
        let sectionTag = document.querySelector('meta[property="article:section"]');
        if (!sectionTag) {
          sectionTag = document.createElement('meta');
          sectionTag.setAttribute('property', 'article:section');
          document.head.appendChild(sectionTag);
        }
        sectionTag.setAttribute('content', section);
      }

      // Tags
      if (tags && tags.length > 0) {
        // Remove existing article:tag meta tags
        document.querySelectorAll('meta[property="article:tag"]').forEach(tag => tag.remove());

        // Add new tag meta tags
        tags.forEach(tag => {
          const tagMeta = document.createElement('meta');
          tagMeta.setAttribute('property', 'article:tag');
          tagMeta.setAttribute('content', tag);
          document.head.appendChild(tagMeta);
        });
      }

      // Author
      if (author) {
        let articleAuthorTag = document.querySelector('meta[property="article:author"]');
        if (!articleAuthorTag) {
          articleAuthorTag = document.createElement('meta');
          articleAuthorTag.setAttribute('property', 'article:author');
          document.head.appendChild(articleAuthorTag);
        }
        articleAuthorTag.setAttribute('content', author);
      }
    }

    // Update canonical URL
    if (canonicalUrl) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonicalUrl);
    }

    // Inject structured data if provided
    if (structuredData) {
      const scriptId = 'seo-structured-data';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Optional: Clean up meta tags on unmount if needed
    };
  }, [title, description, canonicalUrl, type, image, keywords, author, publishedTime, modifiedTime, section, tags, robots, structuredData]);

  // This component doesn't render anything
  return null;
}

/**
 * Validate SEO fields for optimal search engine performance
 */
export function validateSEO(fields: {
  title?: string;
  description?: string;
  image?: string;
}): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Title validation
  if (!fields.title) {
    errors.push('Title is required');
  } else if (fields.title.length > 60) {
    warnings.push(`Title is ${fields.title.length} characters (recommended: 50-60)`);
  } else if (fields.title.length < 30) {
    warnings.push(`Title is ${fields.title.length} characters (recommended: 30-60)`);
  }

  // Description validation
  if (!fields.description) {
    errors.push('Description is required');
  } else if (fields.description.length > 160) {
    warnings.push(`Description is ${fields.description.length} characters (recommended: 120-160)`);
  } else if (fields.description.length < 120) {
    warnings.push(`Description is ${fields.description.length} characters (recommended: 120-160)`);
  }

  // Image validation
  if (!fields.image) {
    warnings.push('No image provided (recommended for social sharing)');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
