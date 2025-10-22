/**
 * Media Components
 *
 * Centralized exports for all media-related components
 */

// Image Gallery
export { ImageGallery } from './ImageGallery';
export type { GalleryImage } from './ImageGallery';

// Image Cropping
export { ImageCropModal } from './ImageCropModal';

// Bulk Upload
export { BulkImageUpload } from './BulkImageUpload';

// Progressive Loading
export { ProgressiveImage, ProgressiveImageGrid } from './ProgressiveImage';

// Existing Components
export { MediaLibrary } from './MediaLibrary';

// Image Optimization Utilities
export {
  loadImage,
  getImageMetadata,
  calculateDimensions,
  optimizeImage,
  generateImageSizes,
  generateBlurPlaceholder,
  resizeImage,
  convertToWebP,
  supportsWebP,
  getOptimalFormat,
  calculateSavings,
  formatBytes,
  compressToSize,
  IMAGE_SIZES,
} from '../../lib/image-optimization';

export type {
  ImageSize,
  ImageFormat,
  ImageOptimizationOptions,
  ImageMetadata,
  OptimizedImage,
} from '../../lib/image-optimization';
