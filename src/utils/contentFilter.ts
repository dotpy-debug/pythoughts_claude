/**
 * Automated Content Filtering for Pythoughts Platform
 *
 * This module provides automated content moderation including:
 * - Profanity detection and filtering
 * - Spam pattern detection
 * - Suspicious content identification
 * - URL validation and safety checks
 */

// Profanity Filter
// ----------------

// Basic profanity wordlist - in production, use a comprehensive library like 'bad-words'
const profanityList = [
  'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
  'cock', 'dick', 'pussy', 'whore', 'slut', 'fag', 'nigger', 'retard',
  // Add more words as needed
];

/**
 * Check if content contains profanity
 */
export function containsProfanity(content: string): boolean {
  const normalizedContent = content.toLowerCase();

  return profanityList.some(word => {
    // Check for exact word matches (with word boundaries)
    const wordRegex = new RegExp(String.raw`\b${word}\b`, 'i');
    return wordRegex.test(normalizedContent);
  });
}

/**
 * Filter profanity from content (replace with asterisks)
 */
export function filterProfanity(content: string): string {
  let filtered = content;

  for (const word of profanityList) {
    const wordRegex = new RegExp(String.raw`\b${word}\b`, 'gi');
    filtered = filtered.replace(wordRegex, (match) => '*'.repeat(match.length));
  }

  return filtered;
}

/**
 * Get profanity severity score (0-10, higher is worse)
 */
export function getProfanitySeverity(content: string): number {
  const normalizedContent = content.toLowerCase();
  let severity = 0;

  for (const word of profanityList) {
    const wordRegex = new RegExp(String.raw`\b${word}\b`, 'gi');
    const matches = normalizedContent.match(wordRegex);
    if (matches) {
      severity += matches.length;
    }
  }

  return Math.min(severity, 10);
}

// Spam Detection
// --------------

/**
 * Detect if content is likely spam based on patterns
 */
export function isLikelySpam(content: string): { isSpam: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check for excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 20) {
    reasons.push('Excessive capitalization');
  }

  // Check for excessive exclamation marks
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    reasons.push('Excessive exclamation marks');
  }

  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\//gi) || []).length;
  if (urlCount > 3) {
    reasons.push('Excessive URLs');
  }

  // Check for common spam phrases
  const spamPhrases = [
    'click here',
    'buy now',
    'limited time',
    'act now',
    'free money',
    'get rich',
    'work from home',
    'make money fast',
    'viagra',
    'casino',
    'weight loss',
    'click this link',
  ];

  const lowerContent = content.toLowerCase();
  const foundSpamPhrases = spamPhrases.filter(phrase => lowerContent.includes(phrase));
  if (foundSpamPhrases.length > 0) {
    reasons.push(`Contains spam phrases: ${foundSpamPhrases.join(', ')}`);
  }

  // Check for repeated characters (e.g., "Heeeeeey")
  if (/(.)\1{4,}/.test(content)) {
    reasons.push('Excessive repeated characters');
  }

  // Check for excessive emojis
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 10) {
    reasons.push('Excessive emojis');
  }

  return {
    isSpam: reasons.length >= 2, // Flag as spam if 2 or more indicators
    reasons
  };
}

/**
 * Calculate spam score (0-100, higher is more likely spam)
 */
export function getSpamScore(content: string): number {
  const { reasons } = isLikelySpam(content);
  return Math.min(reasons.length * 20, 100);
}

// Suspicious Pattern Detection
// ----------------------------

/**
 * Detect suspicious patterns that might indicate malicious content
 */
export function hasSuspiciousPatterns(content: string): { suspicious: boolean; patterns: string[] } {
  const patterns: string[] = [];

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
  ];

  if (sqlPatterns.some(pattern => pattern.test(content))) {
    patterns.push('Potential SQL injection attempt');
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
  ];

  if (xssPatterns.some(pattern => pattern.test(content))) {
    patterns.push('Potential XSS attempt');
  }

  // Check for suspicious URLs
  const suspiciousUrlPatterns = [
    /bit\.ly|tinyurl\.com|goo\.gl/i, // URL shorteners
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i, // Raw IP addresses
  ];

  if (suspiciousUrlPatterns.some(pattern => pattern.test(content))) {
    patterns.push('Contains suspicious URLs');
  }

  // Check for encoded content
  if (content.includes('%3C') || content.includes('%3E') || content.includes('&#')) {
    patterns.push('Contains encoded characters');
  }

  // Check for base64 encoded content
  if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(content.replaceAll(/\s/g, ''))) {
    patterns.push('Possible base64 encoded content');
  }

  return {
    suspicious: patterns.length > 0,
    patterns
  };
}

// Content Safety Check
// --------------------

export interface ContentSafetyResult {
  isSafe: boolean;
  severity: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  filtered?: string;
}

/**
 * Comprehensive content safety check
 * Returns detailed analysis of content safety
 */
export function checkContentSafety(content: string, options?: {
  filterProfanity?: boolean;
  checkSpam?: boolean;
  checkSuspicious?: boolean;
}): ContentSafetyResult {
  const {
    filterProfanity: shouldFilterProfanity = true,
    checkSpam = true,
    checkSuspicious = true
  } = options || {};

  const issues: string[] = [];
  let severity: ContentSafetyResult['severity'] = 'safe';

  // Check profanity
  const profanitySeverity = getProfanitySeverity(content);
  if (profanitySeverity > 0) {
    issues.push(`Contains profanity (severity: ${profanitySeverity})`);
    if (profanitySeverity >= 5) {
      severity = 'high';
    } else if (profanitySeverity >= 3) {
      severity = 'medium';
    } else {
      severity = 'low';
    }
  }

  // Check spam
  if (checkSpam) {
    const spamCheck = isLikelySpam(content);
    if (spamCheck.isSpam) {
      issues.push(...spamCheck.reasons);
      if (severity === 'safe') severity = 'medium';
    }
  }

  // Check suspicious patterns
  if (checkSuspicious) {
    const suspiciousCheck = hasSuspiciousPatterns(content);
    if (suspiciousCheck.suspicious) {
      issues.push(...suspiciousCheck.patterns);
      severity = 'critical'; // Any suspicious pattern is critical
    }
  }

  // Filter profanity if requested
  let filtered: string | undefined;
  if (shouldFilterProfanity && containsProfanity(content)) {
    filtered = filterProfanity(content);
  }

  return {
    isSafe: severity === 'safe',
    severity,
    issues,
    filtered
  };
}

/**
 * Quick check if content should be auto-flagged for review
 */
export function shouldAutoFlag(content: string): boolean {
  const safetyCheck = checkContentSafety(content);
  return safetyCheck.severity === 'high' || safetyCheck.severity === 'critical';
}

/**
 * Quick check if content should be auto-blocked
 */
export function shouldAutoBlock(content: string): boolean {
  const safetyCheck = checkContentSafety(content);
  return safetyCheck.severity === 'critical';
}

// Export all utilities
export const ContentFilter = {
  // Profanity
  containsProfanity,
  filterProfanity,
  getProfanitySeverity,

  // Spam
  isLikelySpam,
  getSpamScore,

  // Suspicious Patterns
  hasSuspiciousPatterns,

  // Comprehensive Check
  checkContentSafety,
  shouldAutoFlag,
  shouldAutoBlock,
};

export default ContentFilter;
