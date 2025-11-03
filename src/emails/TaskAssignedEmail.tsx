/**
 * Task Assigned Email Template
 *
 * Sent when a user is assigned a task
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

export interface TaskAssignedEmailProperties {
  recipientName: string;
  assignerName: string;
  taskTitle: string;
  taskDescription: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  taskUrl: string;
  unsubscribeUrl: string;
}

export function TaskAssignedEmail({
  recipientName = 'User',
  assignerName = 'Team Member',
  taskTitle = 'New Task',
  taskDescription = 'Task description',
  dueDate,
  priority = 'medium',
  taskUrl = 'https://pythoughts.com',
  unsubscribeUrl = 'https://pythoughts.com/settings/preferences',
}: TaskAssignedEmailProperties) {
  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent': {
        return '#ff0000';
      }
      case 'high': {
        return '#ff6600';
      }
      case 'medium': {
        return '#ffaa00';
      }
      case 'low': {
        return '#00ff00';
      }
      default: {
        return '#00ff00';
      }
    }
  };

  const getPriorityLabel = () => {
    return priority.toUpperCase();
  };

  return (
    <Html>
      <Head />
      <Preview>New task assigned: {taskTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PYTHOUGHTS</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>New Task Assigned</Heading>

            <Text style={text}>
              Hey <strong>{recipientName}</strong>,
            </Text>

            <Text style={text}>
              <strong>{assignerName}</strong> assigned you a new task:
            </Text>

            <Section style={taskBox}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <Text style={_taskTitle}>{taskTitle}</Text>
                <span style={{ ...priorityBadge, backgroundColor: getPriorityColor() }}>
                  {getPriorityLabel()}
                </span>
              </div>

              <Text style={_taskDescription}>{taskDescription}</Text>

              {dueDate && (
                <div style={dueDateContainer}>
                  <Text style={dueDateLabel}>Due:</Text>
                  <Text style={dueDateValue}>{dueDate}</Text>
                </div>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Link href={taskUrl} style={button}>
                View Task Details
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

export default TaskAssignedEmail;

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

const taskBox = {
  backgroundColor: '#0a0a0a',
  border: '2px solid #00ff00',
  borderRadius: '4px',
  padding: '20px',
  margin: '20px 0',
};

const _taskTitle = {
  color: '#00ff00',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const _taskDescription = {
  color: '#00ff00',
  fontSize: '14px',
  lineHeight: '1.6',
  marginTop: '0',
  marginBottom: '15px',
};

const priorityBadge = {
  display: 'inline-block',
  padding: '4px 12px',
  color: '#0a0a0a',
  fontSize: '10px',
  fontWeight: 'bold',
  borderRadius: '4px',
  letterSpacing: '1px',
};

const dueDateContainer = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginTop: '15px',
  paddingTop: '15px',
  borderTop: '1px dashed #333',
};

const dueDateLabel = {
  color: '#666',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  margin: '0',
};

const dueDateValue = {
  color: '#00ff00',
  fontSize: '14px',
  fontWeight: 'bold',
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
