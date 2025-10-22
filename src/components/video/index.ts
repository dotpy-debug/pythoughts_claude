/**
 * Video Components and Utilities
 *
 * Centralized exports for all video-related components
 */

// Components
export { LazyVideoEmbed, VideoAspectRatio } from './LazyVideoEmbed';
export { VideoEmbedModal } from './VideoEmbedModal';
export type { VideoPlayerOptions } from './VideoEmbedModal';

// TipTap Extensions
export { Vimeo } from '../editor/extensions/VimeoExtension';

// Video Utilities
export {
  detectVideoPlatform,
  parseYouTubeUrl,
  parseVimeoUrl,
  parseVideoUrl,
  parseTimeString,
  formatTimestamp,
  getYouTubeThumbnail,
  isValidVideoUrl,
  extractVideoIds,
  buildYouTubeEmbedUrl,
  buildVimeoEmbedUrl,
  isVideoEmbed,
  getVideoAspectRatio,
} from '../../lib/video-utils';

export type {
  VideoPlatform,
  YouTubeVideoData,
  VimeoVideoData,
  VideoData,
} from '../../lib/video-utils';
