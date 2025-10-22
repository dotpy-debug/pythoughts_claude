/**
 * Weekly Digest Email Template
 *
 * Sent weekly with a summary of activity and trending posts
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Hr,
} from '@react-email/components';

export interface TrendingPost {
  title: string;
  excerpt: string;
  author: string;
  votes: number;
  comments: number;
  url: string;
}

export interface UserStats {
  postsCreated: number;
  commentsReceived: number;
  votesReceived: number;
  newFollowers: number;
}

export interface WeeklyDigestEmailProps {
  recipientName: string;
  weekStart: string;
  weekEnd: string;
  userStats: UserStats;
  trendingPosts: TrendingPost[];
  unsubscribeUrl: string;
}

export function WeeklyDigestEmail({
  recipientName = 'User',
  weekStart = 'Jan 1',
  weekEnd = 'Jan 7',
  userStats = {
    postsCreated: 2,
    commentsReceived: 15,
    votesReceived: 42,
    newFollowers: 3,
  },
  trendingPosts = [],
  unsubscribeUrl = 'https://pythoughts.com/settings/preferences',
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your weekly Pythoughts digest for {weekStart} - {weekEnd}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PYTHOUGHTS</Text>
            <Text style={subtitle}>Weekly Digest</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Your Week on Pythoughts</Heading>

            <Text style={text}>
              Hey <strong>{recipientName}</strong>,
            </Text>

            <Text style={text}>
              Here's what happened from <strong>{weekStart}</strong> to <strong>{weekEnd}</strong>:
            </Text>

            {/* User Stats */}
            <Section style={statsContainer}>
              <div style={statsGrid}>
                <div style={statCard}>
                  <Text style={statNumber}>{userStats.postsCreated}</Text>
                  <Text style={statLabel}>Posts Created</Text>
                </div>
                <div style={statCard}>
                  <Text style={statNumber}>{userStats.votesReceived}</Text>
                  <Text style={statLabel}>Votes Received</Text>
                </div>
              </div>
              <div style={statsGrid}>
                <div style={statCard}>
                  <Text style={statNumber}>{userStats.commentsReceived}</Text>
                  <Text style={statLabel}>Comments</Text>
                </div>
                <div style={statCard}>
                  <Text style={statNumber}>{userStats.newFollowers}</Text>
                  <Text style={statLabel}>New Followers</Text>
                </div>
              </div>
            </Section>

            {/* Trending Posts */}
            {trendingPosts.length > 0 && (
              <>
                <Heading style={h2}>Trending This Week</Heading>
                <Text style={text}>
                  Don't miss these popular posts from the community:
                </Text>

                {trendingPosts.map((post, index) => (
                  <Section key={index} style={postCard}>
                    <Link href={post.url} style={postLink}>
                      <Text style={postTitle}>{post.title}</Text>
                    </Link>
                    <Text style={postExcerpt}>{post.excerpt}</Text>
                    <div style={postMeta}>
                      <Text style={postAuthor}>by {post.author}</Text>
                      <div style={postStats}>
                        <span style={postStat}>↑ {post.votes}</span>
                        <span style={postStat}>💬 {post.comments}</span>
                      </div>
                    </div>
                  </Section>
                ))}
              </>
            )}

            {/* CTA */}
            <Section style={ctaSection}>
              <Text style={ctaText}>
                Ready to share more Python thoughts?
              </Text>
              <Link href="https://pythoughts.com/create" style={button}>
                Create a Post
              </Link>
            </Section>

            <Text style={footer}>
              Don't want these emails? <Link href={unsubscribeUrl} style={link}>Manage your preferences</Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Pythoughts. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://pythoughts.com" style={link}>Visit our website</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyDigestEmail;

// Styles
const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: '"Courier New", monospace',
  color: '#00ff00',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '40px',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#00ff00',
  margin: '0',
};

const subtitle = {
  fontSize: '14px',
  color: '#666',
  margin: '5px 0 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
};

const content = {
  backgroundColor: '#111',
  border: '2px solid #00ff00',
  borderRadius: '8px',
  padding: '30px',
};

const h1 = {
  color: '#00ff00',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '20px',
};

const h2 = {
  color: '#00ff00',
  fontSize: '20px',
  fontWeight: 'bold',
  marginTop: '30px',
  marginBottom: '15px',
};

const text = {
  color: '#00ff00',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '15px',
};

const statsContainer = {
  margin: '30px 0',
};

const statsGrid = {
  display: 'flex',
  gap: '15px',
  marginBottom: '15px',
};

const statCard = {
  flex: '1',
  backgroundColor: '#0a0a0a',
  border: '1px solid #00ff00',
  borderRadius: '4px',
  padding: '20px',
  textAlign: 'center' as const,
};

const statNumber = {
  color: '#00ff00',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 5px 0',
  lineHeight: '1',
};

const statLabel = {
  color: '#666',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  margin: '0',
};

const postCard = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '20px',
  marginBottom: '15px',
};

const postLink = {
  textDecoration: 'none',
};

const postTitle = {
  color: '#00ff00',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  lineHeight: '1.4',
};

const postExcerpt = {
  color: '#999',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 15px 0',
};

const postMeta = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const postAuthor = {
  color: '#666',
  fontSize: '12px',
  margin: '0',
};

const postStats = {
  display: 'flex',
  gap: '15px',
};

const postStat = {
  color: '#666',
  fontSize: '12px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '40px 0 30px',
  padding: '30px',
  backgroundColor: '#0a0a0a',
  border: '2px dashed #00ff00',
  borderRadius: '8px',
};

const ctaText = {
  color: '#00ff00',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const button = {
  display: 'inline-block',
  padding: '15px 30px',
  backgroundColor: '#00ff00',
  color: '#0a0a0a',
  textDecoration: 'none',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '16px',
};

const footer = {
  color: '#999',
  fontSize: '14px',
  marginTop: '30px',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#333',
  margin: '40px 0',
};

const footerSection = {
  textAlign: 'center' as const,
};

const footerText = {
  color: '#666',
  fontSize: '12px',
  margin: '5px 0',
};

const link = {
  color: '#00ff00',
  textDecoration: 'none',
};
