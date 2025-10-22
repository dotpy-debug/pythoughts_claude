/**
 * Video Utilities
 *
 * Video URL parsing, validation, and platform detection
 * Features:
 * - YouTube URL parsing with timestamp and playlist support
 * - Vimeo URL parsing
 * - Video ID extraction
 * - Thumbnail URL generation
 * - URL validation
 * - Platform detection
 */

/**
 * Supported video platforms
 */
export type VideoPlatform = 'youtube' | 'vimeo' | 'unknown';

/**
 * YouTube video metadata
 */
export interface YouTubeVideoData {
  platform: 'youtube';
  videoId: string;
  startTime?: number; // Start time in seconds
  endTime?: number; // End time in seconds
  playlistId?: string;
  timestamp?: string; // Original timestamp string (e.g., "1m30s")
  embedUrl: string;
  thumbnailUrl: string;
  watchUrl: string;
}

/**
 * Vimeo video metadata
 */
export interface VimeoVideoData {
  platform: 'vimeo';
  videoId: string;
  embedUrl: string;
  thumbnailUrl?: string; // Requires API call
  watchUrl: string;
}

/**
 * Video data union type
 */
export type VideoData = YouTubeVideoData | VimeoVideoData;

/**
 * Detect video platform from URL
 */
export function detectVideoPlatform(url: string): VideoPlatform {
  if (!url) return 'unknown';

  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('youtube-nocookie.com')
  ) {
    return 'youtube';
  }

  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo';
  }

  return 'unknown';
}

/**
 * Parse YouTube URL and extract metadata
 */
export function parseYouTubeUrl(url: string): YouTubeVideoData | null {
  try {
    const urlObj = new URL(url);

    let videoId: string | null = null;
    let playlistId: string | null = null;
    let startTime: number | undefined;
    let endTime: number | undefined;
    let timestamp: string | undefined;

    // Extract video ID from different YouTube URL formats
    if (urlObj.hostname.includes('youtu.be')) {
      // Short URL: https://youtu.be/VIDEO_ID
      videoId = urlObj.pathname.slice(1).split('?')[0];
    } else if (urlObj.hostname.includes('youtube.com')) {
      // Standard URL: https://www.youtube.com/watch?v=VIDEO_ID
      videoId = urlObj.searchParams.get('v');

      // Embed URL: https://www.youtube.com/embed/VIDEO_ID
      if (!videoId && urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1].split('/')[0];
      }
    }

    if (!videoId) {
      return null;
    }

    // Extract playlist ID
    playlistId = urlObj.searchParams.get('list');

    // Extract start time (multiple formats supported)
    const tParam = urlObj.searchParams.get('t');
    const startParam = urlObj.searchParams.get('start');

    if (tParam) {
      timestamp = tParam;
      startTime = parseTimeString(tParam);
    } else if (startParam) {
      startTime = parseInt(startParam, 10);
    }

    // Extract end time
    const endParam = urlObj.searchParams.get('end');
    if (endParam) {
      endTime = parseInt(endParam, 10);
    }

    // Build embed URL with parameters
    const embedParams = new URLSearchParams();
    if (startTime) embedParams.set('start', startTime.toString());
    if (endTime) embedParams.set('end', endTime.toString());
    if (playlistId) embedParams.set('list', playlistId);

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}${
      embedParams.toString() ? `?${embedParams.toString()}` : ''
    }`;

    return {
      platform: 'youtube',
      videoId,
      startTime,
      endTime,
      playlistId: playlistId || undefined,
      timestamp,
      embedUrl,
      thumbnailUrl: getYouTubeThumbnail(videoId),
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    console.error('Error parsing YouTube URL:', error);
    return null;
  }
}

/**
 * Parse time string to seconds
 * Supports formats: "1m30s", "90s", "1h2m3s", "90"
 */
export function parseTimeString(timeStr: string): number {
  // If it's just a number, return it as seconds
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr, 10);
  }

  let totalSeconds = 0;

  // Parse hours
  const hourMatch = timeStr.match(/(\d+)h/i);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }

  // Parse minutes
  const minuteMatch = timeStr.match(/(\d+)m/i);
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
  }

  // Parse seconds
  const secondMatch = timeStr.match(/(\d+)s/i);
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
  }

  return totalSeconds;
}

/**
 * Format seconds to timestamp string (e.g., "1:30", "1:02:30")
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get YouTube video thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'maxres'
): string {
  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    standard: 'sddefault.jpg',
    maxres: 'maxresdefault.jpg',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
}

/**
 * Parse Vimeo URL and extract metadata
 */
export function parseVimeoUrl(url: string): VimeoVideoData | null {
  try {
    const urlObj = new URL(url);

    let videoId: string | null = null;

    // Standard URL: https://vimeo.com/VIDEO_ID
    if (urlObj.hostname.includes('vimeo.com')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Handle different Vimeo URL formats
      if (pathParts.length > 0) {
        // https://vimeo.com/123456789
        videoId = pathParts[0];

        // Handle showcase/groups URLs: https://vimeo.com/showcase/xxx/video/123456789
        if (pathParts.includes('video') && pathParts.length > pathParts.indexOf('video')) {
          videoId = pathParts[pathParts.indexOf('video') + 1];
        }
      }

      // Embed URL: https://player.vimeo.com/video/VIDEO_ID
      if (urlObj.pathname.includes('/video/')) {
        videoId = urlObj.pathname.split('/video/')[1].split('/')[0];
      }
    }

    if (!videoId || !/^\d+$/.test(videoId)) {
      return null;
    }

    const embedUrl = `https://player.vimeo.com/video/${videoId}`;

    return {
      platform: 'vimeo',
      videoId,
      embedUrl,
      watchUrl: `https://vimeo.com/${videoId}`,
    };
  } catch (error) {
    console.error('Error parsing Vimeo URL:', error);
    return null;
  }
}

/**
 * Parse any supported video URL
 */
export function parseVideoUrl(url: string): VideoData | null {
  const platform = detectVideoPlatform(url);

  switch (platform) {
    case 'youtube':
      return parseYouTubeUrl(url);
    case 'vimeo':
      return parseVimeoUrl(url);
    default:
      return null;
  }
}

/**
 * Validate video URL
 */
export function isValidVideoUrl(url: string): boolean {
  const videoData = parseVideoUrl(url);
  return videoData !== null;
}

/**
 * Extract video IDs from HTML content
 */
export function extractVideoIds(html: string): {
  youtube: string[];
  vimeo: string[];
} {
  const result = {
    youtube: [] as string[],
    vimeo: [] as string[],
  };

  // Extract YouTube video IDs from various formats
  const youtubeRegex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  let match;

  while ((match = youtubeRegex.exec(html)) !== null) {
    if (!result.youtube.includes(match[1])) {
      result.youtube.push(match[1]);
    }
  }

  // Extract Vimeo video IDs
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/g;

  while ((match = vimeoRegex.exec(html)) !== null) {
    if (!result.vimeo.includes(match[1])) {
      result.vimeo.push(match[1]);
    }
  }

  return result;
}

/**
 * Build YouTube embed URL with custom options
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    mute?: boolean;
    startTime?: number;
    endTime?: number;
    playlistId?: string;
    modestBranding?: boolean;
    relatedVideos?: boolean;
    cc?: boolean;
    ccLanguage?: string;
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.autoplay) params.set('autoplay', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Loop requires playlist parameter
  }
  if (options.mute) params.set('mute', '1');
  if (options.startTime) params.set('start', options.startTime.toString());
  if (options.endTime) params.set('end', options.endTime.toString());
  if (options.playlistId) params.set('list', options.playlistId);
  if (options.modestBranding) params.set('modestbranding', '1');
  if (options.relatedVideos === false) params.set('rel', '0');
  if (options.cc) params.set('cc_load_policy', '1');
  if (options.ccLanguage) params.set('cc_lang_pref', options.ccLanguage);

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Build Vimeo embed URL with custom options
 */
export function buildVimeoEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    title?: boolean;
    byline?: boolean;
    portrait?: boolean;
    color?: string; // Hex color without #
    dnt?: boolean; // Do Not Track
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.autoplay) params.set('autoplay', '1');
  if (options.loop) params.set('loop', '1');
  if (options.muted) params.set('muted', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.title === false) params.set('title', '0');
  if (options.byline === false) params.set('byline', '0');
  if (options.portrait === false) params.set('portrait', '0');
  if (options.color) params.set('color', options.color.replace('#', ''));
  if (options.dnt) params.set('dnt', '1');

  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
}

/**
 * Check if URL is a video embed
 */
export function isVideoEmbed(url: string): boolean {
  return (
    url.includes('youtube.com/embed') ||
    url.includes('youtube-nocookie.com/embed') ||
    url.includes('player.vimeo.com/video')
  );
}

/**
 * Get video aspect ratio by platform
 */
export function getVideoAspectRatio(platform: VideoPlatform): number {
  switch (platform) {
    case 'youtube':
      return 16 / 9; // YouTube default
    case 'vimeo':
      return 16 / 9; // Vimeo default
    default:
      return 16 / 9;
  }
}
