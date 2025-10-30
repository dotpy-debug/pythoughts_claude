/**
 * Vote Notification Email Template
 *
 * Sent when a user's post reaches vote milestones
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

export interface VoteNotificationEmailProps {
  recipientName: string;
  postTitle: string;
  voteCount: number;
  milestone: number;
  postUrl: string;
  unsubscribeUrl: string;
}

export function VoteNotificationEmail({
  recipientName = 'User',
  postTitle = 'Your Post',
  voteCount = 10,
  milestone = 10,
  postUrl = 'https://pythoughts.com',
  unsubscribeUrl = 'https://pythoughts.com/settings/preferences',
}: VoteNotificationEmailProps) {
  const getMilestoneMessage = () => {
    if (milestone >= 100) return '🎉 Your post is going viral!';
    if (milestone >= 50) return '🚀 Your post is trending!';
    if (milestone >= 25) return '⭐ Your post is getting popular!';
    return '👍 Your post is getting noticed!';
  };

  return (
    <Html>
      <Head />
{/* @ts-expect-error - Email component type mismatch */}
      <Preview>Your post "{postTitle}" reached {milestone} votes!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PYTHOUGHTS</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>{getMilestoneMessage()}</Heading>

            <Text style={text}>
              Hey <strong>{recipientName}</strong>,
            </Text>

            <Text style={text}>
              Great news! Your post <strong>"{postTitle}"</strong> has reached <strong>{milestone} votes</strong>!
            </Text>

            <Section style={statsBox}>
              <Text style={statsNumber}>{voteCount}</Text>
              <Text style={statsLabel}>Total Votes</Text>
            </Section>

            <Text style={text}>
              Your content is resonating with the community. Keep sharing your Python thoughts!
            </Text>

            <Section style={buttonContainer}>
              <Link href={postUrl} style={button}>
                View Your Post
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

export default VoteNotificationEmail;

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

const content = {
  backgroundColor: '#111',
  border: '2px solid #00ff00',
  borderRadius: '8px',
  padding: '30px',
};

const h1 = {
  color: '#00ff00',
  fontSize: '28px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#00ff00',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '15px',
};

const statsBox = {
  backgroundColor: '#0a0a0a',
  border: '2px solid #00ff00',
  borderRadius: '8px',
  padding: '30px',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const statsNumber = {
  color: '#00ff00',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  lineHeight: '1',
};

const statsLabel = {
  color: '#666',
  fontSize: '14px',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
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
