/**
 * Post Reply Email Template
 *
 * Sent when someone replies to a user's post
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

export interface PostReplyEmailProps {
  /**
   * Recipient's username
   */
  recipientName: string;

  /**
   * Name of the person who replied
   */
  replierName: string;

  /**
   * Post title
   */
  postTitle: string;

  /**
   * Reply content (truncated)
   */
  replyContent: string;

  /**
   * URL to the post
   */
  postUrl: string;

  /**
   * URL to unsubscribe
   */
  unsubscribeUrl: string;
}

export function PostReplyEmail({
  recipientName = 'User',
  replierName = 'Someone',
  postTitle = 'Your Post',
  replyContent = 'Great post!',
  postUrl = 'https://pythoughts.com',
  unsubscribeUrl = 'https://pythoughts.com/settings/preferences',
}: PostReplyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{replierName} replied to your post: {postTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PYTHOUGHTS</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>New Reply to Your Post</Heading>

            <Text style={text}>
              Hey <strong>{recipientName}</strong>,
            </Text>

            <Text style={text}>
              <strong>{replierName}</strong> replied to your post <strong>"{postTitle}"</strong>:
            </Text>

            <Section style={replyBox}>
              <Text style={replyText}>{replyContent}</Text>
            </Section>

            <Section style={buttonContainer}>
              <Link href={postUrl} style={button}>
                View Reply
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

export default PostReplyEmail;

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

const replyBox = {
  backgroundColor: '#0a0a0a',
  border: '1px dashed #00ff00',
  borderRadius: '4px',
  padding: '20px',
  margin: '20px 0',
};

const replyText = {
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
