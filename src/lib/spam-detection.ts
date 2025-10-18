import { logger } from './logger';

export type SpamCheckResult = {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  score: number;
};

/**
 * Comprehensive spam detection system
 * Combines multiple heuristics to detect spam content
 */
export class SpamDetector {
  // Spam keywords and patterns
  private static readonly SPAM_KEYWORDS = [
    'viagra', 'cialis', 'pharmacy', 'casino', 'lottery', 'winner',
    'click here', 'buy now', 'limited time', 'act now', 'free money',
    'make money fast', 'work from home', 'nigerian prince', 'inheritance',
    'cryptocurrency investment', 'bitcoin giveaway', 'forex trading',
    'mlm', 'multi-level marketing', 'pyramid scheme',
  ];

  private static readonly SUSPICIOUS_PATTERNS = [
    /\b(http|https):\/\/[^\s]+\.(xyz|tk|ml|ga|cf|gq)\b/gi, // Suspicious TLDs
    /\b\d{10,}\b/g, // Long numbers (phone numbers)
    /\b[A-Z]{10,}\b/g, // Long sequences of capitals
    /(.)\1{5,}/g, // Repeated characters (aaaaa)
    /\$\d+/g, // Money amounts
    /!\s*!\s*!/g, // Multiple exclamation marks
  ];

  /**
   * Check if content is spam
   * @param content - The text content to check
   * @param authorId - ID of the content author
   * @param metadata - Additional metadata (e.g., account age, previous posts)
   * @returns Spam check result with confidence score
   */
  static async checkSpam(
    content: string,
    authorId: string,
    metadata?: {
      accountAge?: number; // in days
      previousPosts?: number;
      previousReports?: number;
      verified?: boolean;
    }
  ): Promise<SpamCheckResult> {
    const reasons: string[] = [];
    let score = 0;

    const normalizedContent = content.toLowerCase();

    // 1. Check for spam keywords (20 points each)
    const foundKeywords = this.SPAM_KEYWORDS.filter(keyword =>
      normalizedContent.includes(keyword)
    );
    if (foundKeywords.length > 0) {
      score += foundKeywords.length * 20;
      reasons.push(`Contains spam keywords: ${foundKeywords.join(', ')}`);
    }

    // 2. Check for suspicious patterns (15 points each)
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        score += matches.length * 15;
        reasons.push(`Suspicious pattern detected: ${pattern.toString()}`);
      }
    }

    // 3. Check URL count (10 points per URL after the first)
    const urlCount = (content.match(/https?:\/\//gi) || []).length;
    if (urlCount > 1) {
      score += (urlCount - 1) * 10;
      reasons.push(`Contains ${urlCount} URLs`);
    }

    // 4. Check for excessive capitalization (30 points)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      score += 30;
      reasons.push('Excessive capitalization');
    }

    // 5. Check content length - very short or very long (20 points)
    if (content.length < 10) {
      score += 20;
      reasons.push('Content too short');
    } else if (content.length > 5000) {
      score += 10;
      reasons.push('Content unusually long');
    }

    // 6. Check for repetitive content (25 points)
    if (this.hasRepetitiveContent(content)) {
      score += 25;
      reasons.push('Repetitive content detected');
    }

    // 7. Account-based heuristics
    if (metadata) {
      // New account (< 1 day old) - 15 points
      if (metadata.accountAge !== undefined && metadata.accountAge < 1) {
        score += 15;
        reasons.push('Very new account');
      }

      // No previous posts - 10 points
      if (metadata.previousPosts === 0) {
        score += 10;
        reasons.push('No posting history');
      }

      // Previous reports - 30 points per report
      if (metadata.previousReports && metadata.previousReports > 0) {
        score += metadata.previousReports * 30;
        reasons.push(`${metadata.previousReports} previous reports`);
      }

      // Verified account reduces score by 20
      if (metadata.verified) {
        score = Math.max(0, score - 20);
      }
    }

    // 8. Check for common spam phrases
    const spamPhrases = [
      'click here to',
      'limited time offer',
      'act now',
      'congratulations you',
      'you have won',
      'claim your prize',
      'no credit card',
      '100% free',
      'risk free',
      'money back guarantee',
    ];

    for (const phrase of spamPhrases) {
      if (normalizedContent.includes(phrase)) {
        score += 25;
        reasons.push(`Contains spam phrase: "${phrase}"`);
      }
    }

    // Calculate confidence based on score
    const confidence = Math.min(100, score) / 100;

    // Determine if content is spam (threshold: 60 points)
    const isSpam = score >= 60;

    const result: SpamCheckResult = {
      isSpam,
      confidence,
      reasons,
      score,
    };

    if (isSpam) {
      logger.warn('Spam detected', {
        authorId,
        score,
        confidence,
        reasons: reasons.slice(0, 3), // Log first 3 reasons
      });
    }

    return result;
  }

  /**
   * Check if content has repetitive patterns
   */
  private static hasRepetitiveContent(content: string): boolean {
    // Split into words
    const words = content.toLowerCase().split(/\s+/);

    if (words.length < 5) return false;

    // Check for repeated words
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // If any word appears more than 30% of the time, it's repetitive
    for (const count of wordCounts.values()) {
      if (count / words.length > 0.3) {
        return true;
      }
    }

    // Check for repeated phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      const phraseCount = content.toLowerCase().split(phrase).length - 1;
      if (phraseCount > 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a URL is from a suspicious domain
   */
  static isSuspiciousDomain(url: string): boolean {
    const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq'];
    const urlLower = url.toLowerCase();
    return suspiciousTLDs.some(tld => urlLower.includes(tld));
  }

  /**
   * Calculate a trust score for a user
   * Higher score = more trustworthy
   */
  static calculateTrustScore(user: {
    accountAge: number; // in days
    postCount: number;
    commentCount: number;
    reputationPoints: number;
    reportCount: number;
    verified: boolean;
  }): number {
    let trustScore = 0;

    // Account age (max 30 points)
    trustScore += Math.min(30, user.accountAge);

    // Content contributions (max 40 points)
    trustScore += Math.min(20, user.postCount * 2);
    trustScore += Math.min(20, user.commentCount);

    // Reputation (max 30 points)
    trustScore += Math.min(30, user.reputationPoints / 10);

    // Verified status (20 points)
    if (user.verified) {
      trustScore += 20;
    }

    // Penalize for reports (-10 points per report)
    trustScore -= user.reportCount * 10;

    return Math.max(0, Math.min(100, trustScore));
  }
}

/**
 * Helper function for easy spam checking in server actions
 */
export async function checkContentForSpam(
  content: string,
  authorId: string,
  metadata?: Parameters<typeof SpamDetector.checkSpam>[2]
): Promise<SpamCheckResult> {
  return SpamDetector.checkSpam(content, authorId, metadata);
}
