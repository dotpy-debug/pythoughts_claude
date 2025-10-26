import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-Demand Revalidation API Route
 *
 * Usage:
 * POST /api/revalidate
 * Body: { secret: string, path?: string, tag?: string, slug?: string }
 *
 * Examples:
 * - Revalidate specific blog post: { secret, slug: "my-post" }
 * - Revalidate all blogs: { secret, path: "/blogs" }
 * - Revalidate by tag: { secret, tag: "blog-posts" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, path, tag, slug } = body;

    // Validate secret token
    const revalidateSecret = process.env.REVALIDATE_SECRET || 'development-secret';

    if (secret !== revalidateSecret) {
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate by slug (specific blog post)
    if (slug) {
      revalidatePath(`/blog/${slug}`);
      return NextResponse.json({
        revalidated: true,
        type: 'slug',
        slug,
        now: Date.now(),
      });
    }

    // Revalidate by path
    if (path) {
      revalidatePath(path);
      return NextResponse.json({
        revalidated: true,
        type: 'path',
        path,
        now: Date.now(),
      });
    }

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({
        revalidated: true,
        type: 'tag',
        tag,
        now: Date.now(),
      });
    }

    return NextResponse.json(
      { message: 'Missing revalidation target (slug, path, or tag)' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { message: 'Error revalidating', error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET handler to show API usage
 */
export async function GET() {
  return NextResponse.json({
    message: 'Revalidation API',
    usage: {
      method: 'POST',
      endpoint: '/api/revalidate',
      body: {
        secret: 'string (required)',
        slug: 'string (optional) - Revalidate specific blog post',
        path: 'string (optional) - Revalidate specific path',
        tag: 'string (optional) - Revalidate by cache tag',
      },
      examples: [
        {
          description: 'Revalidate specific blog post',
          body: { secret: 'your-secret', slug: 'my-blog-post' },
        },
        {
          description: 'Revalidate all blogs',
          body: { secret: 'your-secret', path: '/blogs' },
        },
        {
          description: 'Revalidate by tag',
          body: { secret: 'your-secret', tag: 'blog-posts' },
        },
      ],
    },
  });
}
