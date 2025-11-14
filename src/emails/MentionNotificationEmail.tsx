/**
 * Mention Notification Email Template
 *
 * Sent when a user is mentioned in a post or comment
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

export interface MentionNotificationEmailProperties {
  recipientName: string;
  mentionerName: string;
  contentType: 'post' | 'comment';
  contentTitle?: string;
  contentExcerpt: string;
  contentUrl: string;
  unsubscribeUrl: string;
}

export function MentionNotificationEmail({
  recipientName = 'User',
  mentionerName = 'Someone',
  contentType = 'post',
  contentTitle,
  contentExcerpt = 'Check out what they said...',
  contentUrl = 'https://pythoughts.com',
  unsubscribeUrl = 'https://pythoughts.com/settings/preferences',
}: MentionNotificationEmailProperties) {
  const getTitle = () => {
    if (contentType === 'post') {
      return `${mentionerName} mentioned you in a post`;
    }
    return `${mentionerName} mentioned you in a comment`;
  };

  return (
    <Html>
      <Head />
      <Preview>{getTitle()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PYTHOUGHTS</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>You've Been Mentioned!</Heading>

            <Text style={text}>
              Hey <strong>{recipientName}</strong>,
            </Text>

            <Text style={text}>
              <strong>{mentionerName}</strong> mentioned you in {contentType === 'post' ? 'a post' : 'a comment'}
              {contentTitle && ` on "${contentTitle}"`}:
            </Text>

            <Section style={mentionBox}>
              <div style={mentionIndicator}>@{recipientName}</div>
              <Text style={mentionText}>{contentExcerpt}</Text>
            </Section>

            <Section style={buttonContainer}>
              <Link href={contentUrl} style={button}>
                View {contentType === 'post' ? 'Post' : 'Comment'}
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

export default MentionNotificationEmail;

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
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '20px',
};

const text = {
  color: '#00ff00',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '15px',
};

const mentionBox = {
  backgroundColor: '#0a0a0a',
  border: '2px solid #00ff00',
  borderRadius: '4px',
  padding: '20px',
  margin: '20px 0',
  position: 'relative' as const,
};

const mentionIndicator = {
  color: '#00ff00',
  fontSize: '12px',
  fontWeight: 'bold',
  marginBottom: '10px',
  padding: '4px 8px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #00ff00',
  borderRadius: '4px',
  display: 'inline-block',
};

const mentionText = {
  color: '#00ff00',
  fontSize: '14px',
  lineHeight: '1.6',
  fontStyle: 'italic',
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
