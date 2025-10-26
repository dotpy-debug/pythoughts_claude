import { env } from './env';
import { logger } from './logger';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface PexelsCuratedResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

const PEXELS_API_URL = 'https://api.pexels.com/v1';
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 80;

export class PexelsService {
  private apiKey: string | undefined;
  private rateLimitRemaining = 200;
  private rateLimitReset = Date.now();

  constructor() {
    this.apiKey = env.VITE_PEXELS_API_KEY;
  }

  private checkApiKey(): boolean {
    if (!this.apiKey) {
      logger.warn('Pexels API key not configured');
      return false;
    }
    return true;
  }

  private checkRateLimit(): boolean {
    if (this.rateLimitRemaining <= 0 && Date.now() < this.rateLimitReset) {
      logger.warn('Pexels API rate limit exceeded', {
        resetTime: new Date(this.rateLimitReset).toISOString(),
      });
      return false;
    }
    return true;
  }

  private updateRateLimitInfo(headers: Headers) {
    const remaining = headers.get('X-Ratelimit-Remaining');
    const reset = headers.get('X-Ratelimit-Reset');

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (reset) {
      this.rateLimitReset = parseInt(reset, 10) * 1000;
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T | null> {
    if (!this.checkApiKey()) {
      return null;
    }

    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const response = await fetch(`${PEXELS_API_URL}${endpoint}`, {
        headers: {
          Authorization: this.apiKey!,
        },
      });

      this.updateRateLimitInfo(response.headers);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Pexels API request failed', {
        endpoint,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async searchPhotos(
    query: string,
    page: number = 1,
    perPage: number = DEFAULT_PER_PAGE
  ): Promise<PexelsSearchResponse | null> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const safePerPage = Math.min(Math.max(1, perPage), MAX_PER_PAGE);
    const encodedQuery = encodeURIComponent(query.trim());

    return this.makeRequest<PexelsSearchResponse>(
      `/search?query=${encodedQuery}&page=${page}&per_page=${safePerPage}`
    );
  }

  async getCuratedPhotos(
    page: number = 1,
    perPage: number = DEFAULT_PER_PAGE
  ): Promise<PexelsCuratedResponse | null> {
    const safePerPage = Math.min(Math.max(1, perPage), MAX_PER_PAGE);

    return this.makeRequest<PexelsCuratedResponse>(
      `/curated?page=${page}&per_page=${safePerPage}`
    );
  }

  async getPhoto(id: number): Promise<PexelsPhoto | null> {
    if (!id || id <= 0) {
      throw new Error('Invalid photo ID');
    }

    return this.makeRequest<PexelsPhoto>(`/photos/${id}`);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getRateLimitStatus(): {
    remaining: number;
    resetTime: Date;
    isLimited: boolean;
  } {
    return {
      remaining: this.rateLimitRemaining,
      resetTime: new Date(this.rateLimitReset),
      isLimited: this.rateLimitRemaining <= 0 && Date.now() < this.rateLimitReset,
    };
  }
}

export const pexels = new PexelsService();
