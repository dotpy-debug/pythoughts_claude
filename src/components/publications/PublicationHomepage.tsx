import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Users, Mail, ExternalLink, Twitter, Linkedin, Github } from 'lucide-react';

type Publication = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  websiteUrl: string | null;
  twitterHandle: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  memberCount: number;
  postCount: number;
  subscriberCount: number;
  enableNewsletter: boolean;
};

type PublicationPost = {
  id: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  stats: {
    views: number;
    claps: number;
    comments: number;
  };
};

type PublicationMember = {
  id: string;
  role: string;
  user: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  postCount: number;
};

type PublicationHomepageProps = {
  slug: string;
};

export function PublicationHomepage({ slug }: PublicationHomepageProps) {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [posts, setPosts] = useState<PublicationPost[]>([]);
  const [members, setMembers] = useState<PublicationMember[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    loadPublication();
  }, [slug]);

  const loadPublication = async () => {
    setIsLoading(true);
    try {
      // Load publication
      const { data: pubData, error: pubError } = await supabase
        .from('publications')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pubError) {
        throw pubError;
      }

      setPublication(pubData);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('publication_posts')
        .select(`
          id,
          published_at,
          post:post_id (
            id,
            title,
            excerpt,
            author:author_id (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('publication_id', pubData.id)
        .order('published_at', { ascending: false })
        .limit(10);

      if (postsError) {
        logger.error('Failed to load posts', postsError);
      } else {
        // Transform posts data
        setPosts(
          (postsData || []).map((item: any) => ({
            id: item.post.id,
            title: item.post.title,
            excerpt: item.post.excerpt,
            publishedAt: item.published_at,
            author: {
              username: item.post.author.username,
              displayName: item.post.author.display_name,
              avatarUrl: item.post.author.avatar_url,
            },
            stats: {
              views: 0, // TODO: Get from analytics
              claps: 0,
              comments: 0,
            },
          }))
        );
      }

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('publication_members')
        .select(`
          id,
          role,
          post_count,
          user:user_id (
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('publication_id', pubData.id)
        .order('role', { ascending: true })
        .limit(12);

      if (membersError) {
        logger.error('Failed to load members', membersError);
      } else {
        setMembers(
          (membersData || []).map((item: any) => ({
            id: item.id,
            role: item.role,
            postCount: item.post_count,
            user: {
              username: item.user.username,
              displayName: item.user.display_name,
              avatarUrl: item.user.avatar_url,
              bio: item.user.bio,
            },
          }))
        );
      }

      // Check subscription status
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data: subData } = await supabase
          .from('publication_subscribers')
          .select('is_active')
          .eq('publication_id', pubData.id)
          .eq('user_id', user.id)
          .single();

        setIsSubscribed(subData?.is_active || false);
      }
    } catch (err) {
      logger.error('Failed to load publication', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !publication) return;

      if (isSubscribed) {
        // Unsubscribe
        await supabase
          .from('publication_subscribers')
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .eq('publication_id', publication.id)
          .eq('user_id', user.id);

        setIsSubscribed(false);
      } else {
        // Subscribe
        await supabase.from('publication_subscribers').upsert(
          {
            publication_id: publication.id,
            user_id: user.id,
            email: user.email!,
            is_active: true,
          },
          { onConflict: 'publication_id,email' }
        );

        setIsSubscribed(true);
      }
    } catch (err) {
      logger.error('Failed to update subscription', err as Error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading publication...</div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Publication Not Found</h1>
          <p className="text-muted-foreground">
            The publication you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Cover Image */}
      {publication.coverImageUrl && (
        <div
          className="h-80 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${publication.coverImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      {/* Publication Header */}
      <div className="container mx-auto px-4 -mt-20 relative">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Logo */}
          {publication.logoUrl && (
            <div className="w-32 h-32 rounded-lg overflow-hidden bg-card border-4 border-background shadow-lg">
              <img
                src={publication.logoUrl}
                alt={publication.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{publication.name}</h1>
            {publication.tagline && (
              <p className="text-xl text-muted-foreground mb-4">{publication.tagline}</p>
            )}

            <div className="flex flex-wrap gap-4 items-center mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{publication.memberCount} writers</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{publication.subscriberCount} subscribers</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-2 mb-4">
              {publication.websiteUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={publication.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {publication.twitterHandle && (
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`https://twitter.com/${publication.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {publication.linkedinUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={publication.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {publication.githubUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={publication.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            {publication.enableNewsletter && (
              <Button onClick={handleSubscribe} variant={isSubscribed ? 'outline' : 'default'}>
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {publication.description && (
          <div className="mt-8 max-w-3xl">
            <p className="text-muted-foreground">{publication.description}</p>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-4 mt-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="posts">Posts ({publication.postCount})</TabsTrigger>
            <TabsTrigger value="members">Writers ({publication.memberCount})</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No posts published yet
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h3>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{post.author.displayName || post.author.username}</span>
                        <span>•</span>
                        <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            {members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No members yet</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.displayName || member.user.username}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">
                              {member.user.displayName || member.user.username}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                          {member.user.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {member.user.bio}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {member.postCount} {member.postCount === 1 ? 'post' : 'posts'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">About {publication.name}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {publication.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
