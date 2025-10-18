import { supabase } from './supabase';
import { logger } from './logger';

export type AnalyticsEvent = {
  name: string;
  category?: string;
  properties?: Record<string, unknown>;
  value?: number;
};

export type PostViewParams = {
  postId: string;
  userId?: string;
  sessionId: string;
  referrer?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
};

export type ConversionEventParams = {
  type: string;
  userId?: string;
  sessionId: string;
  sourcePostId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Analytics tracking system
 * Provides client-side analytics tracking for user behavior and post metrics
 */
export class Analytics {
  private static sessionId: string | null = null;
  private static userId: string | null = null;

  /**
   * Initialize analytics session
   */
  static init(userId?: string) {
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }
    this.userId = userId || null;
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  static getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }
    return this.sessionId;
  }

  /**
   * Track a post view
   */
  static async trackPostView(params: PostViewParams): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('track_post_view', {
        p_post_id: params.postId,
        p_user_id: params.userId || null,
        p_session_id: params.sessionId || this.getSessionId(),
        p_referrer: params.referrer || document.referrer || null,
        p_user_agent: params.userAgent || navigator.userAgent,
        p_device_type: params.deviceType || this.detectDeviceType(),
      });

      if (error) {
        logger.error('Failed to track post view', error);
      }

      logger.debug('Post view tracked', { postId: params.postId });
    } catch (error) {
      logger.error('Post view tracking error', error as Error);
    }
  }

  /**
   * Track a custom event
   */
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('track_event', {
        p_event_name: event.name,
        p_event_category: event.category || null,
        p_user_id: this.userId,
        p_session_id: this.getSessionId(),
        p_properties: event.properties || {},
        p_value: event.value || null,
      });

      if (error) {
        logger.error('Failed to track event', error);
      }

      logger.debug('Event tracked', { name: event.name, category: event.category });
    } catch (error) {
      logger.error('Event tracking error', error as Error);
    }
  }

  /**
   * Track a conversion event
   */
  static async trackConversion(params: ConversionEventParams): Promise<void> {
    try {
      const { error } = await supabase.from('conversion_events').insert({
        conversion_type: params.type,
        user_id: params.userId || this.userId,
        session_id: params.sessionId || this.getSessionId(),
        source_post_id: params.sourcePostId || null,
        conversion_value: params.value || null,
        metadata: params.metadata || {},
      });

      if (error) {
        logger.error('Failed to track conversion', error);
      }

      logger.debug('Conversion tracked', { type: params.type });
    } catch (error) {
      logger.error('Conversion tracking error', error as Error);
    }
  }

  /**
   * Track reading progress
   */
  static async trackReadingProgress(
    postId: string,
    scrollPercentage: number,
    readTimeSeconds: number
  ): Promise<void> {
    try {
      // Update the view event with reading progress
      const { error } = await supabase
        .from('post_view_events')
        .update({
          scroll_percentage: scrollPercentage,
          read_time_seconds: readTimeSeconds,
        })
        .eq('post_id', postId)
        .eq('session_id', this.getSessionId())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Failed to track reading progress', error);
      }

      // If scroll > 50%, mark as a "read"
      if (scrollPercentage > 50) {
        const { error: analyticsError } = await supabase
          .from('post_analytics')
          .update({
            reads: supabase.raw('reads + 1'),
            avg_read_time_seconds: supabase.raw(
              `(avg_read_time_seconds * reads + ${readTimeSeconds}) / (reads + 1)`
            ),
          })
          .eq('post_id', postId)
          .eq('date', new Date().toISOString().split('T')[0]);

        if (analyticsError) {
          logger.error('Failed to update read analytics', analyticsError);
        }
      }
    } catch (error) {
      logger.error('Reading progress tracking error', error as Error);
    }
  }

  /**
   * Track referral source
   */
  static async trackReferral(postId: string, utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  }): Promise<void> {
    try {
      const referrer = document.referrer;
      const referrerUrl = new URL(referrer || window.location.href);
      const referrerDomain = referrerUrl.hostname;

      // Determine referrer type
      let referrerType: 'direct' | 'search' | 'social' | 'external' | 'internal' = 'direct';

      if (referrer) {
        if (referrerDomain === window.location.hostname) {
          referrerType = 'internal';
        } else if (this.isSearchEngine(referrerDomain)) {
          referrerType = 'search';
        } else if (this.isSocialMedia(referrerDomain)) {
          referrerType = 'social';
        } else {
          referrerType = 'external';
        }
      }

      const { error } = await supabase.from('referral_tracking').insert({
        post_id: postId,
        referrer_url: referrer || null,
        referrer_domain: referrerDomain,
        referrer_type: referrerType,
        utm_source: utmParams?.source || null,
        utm_medium: utmParams?.medium || null,
        utm_campaign: utmParams?.campaign || null,
        utm_content: utmParams?.content || null,
        utm_term: utmParams?.term || null,
        date: new Date().toISOString().split('T')[0],
      });

      if (error) {
        logger.error('Failed to track referral', error);
      }
    } catch (error) {
      logger.error('Referral tracking error', error as Error);
    }
  }

  /**
   * Detect device type
   */
  private static detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Check if domain is a search engine
   */
  private static isSearchEngine(domain: string): boolean {
    const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex'];
    return searchEngines.some(engine => domain.includes(engine));
  }

  /**
   * Check if domain is social media
   */
  private static isSocialMedia(domain: string): boolean {
    const socialMedia = ['facebook', 'twitter', 'linkedin', 'reddit', 'instagram', 'tiktok', 'pinterest'];
    return socialMedia.some(social => domain.includes(social));
  }

  /**
   * Parse UTM parameters from URL
   */
  static parseUTMParams(): {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  } {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      content: params.get('utm_content') || undefined,
      term: params.get('utm_term') || undefined,
    };
  }

  /**
   * Track page view (general)
   */
  static trackPageView(page: string): void {
    this.trackEvent({
      name: 'page_view',
      category: 'navigation',
      properties: {
        page,
        referrer: document.referrer,
        url: window.location.href,
      },
    });
  }

  /**
   * Track CTA click
   */
  static trackCTAClick(ctaId: string, ctaText: string, postId?: string): void {
    this.trackEvent({
      name: 'cta_click',
      category: 'engagement',
      properties: {
        cta_id: ctaId,
        cta_text: ctaText,
        post_id: postId,
      },
      value: 1,
    });

    // Also track as conversion
    this.trackConversion({
      type: 'cta_click',
      sourcePostId: postId,
      metadata: { cta_id: ctaId, cta_text: ctaText },
    });
  }
}

/**
 * Hook for easy analytics in components
 */
export function useAnalytics() {
  return {
    trackEvent: Analytics.trackEvent.bind(Analytics),
    trackPostView: Analytics.trackPostView.bind(Analytics),
    trackConversion: Analytics.trackConversion.bind(Analytics),
    trackCTAClick: Analytics.trackCTAClick.bind(Analytics),
    trackPageView: Analytics.trackPageView.bind(Analytics),
  };
}

/**
 * Initialize analytics on app load
 */
if (typeof window !== 'undefined') {
  Analytics.init();
}

export default Analytics;
