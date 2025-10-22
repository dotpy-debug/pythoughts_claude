/**
 * ImageGallery Component
 *
 * Full-screen image gallery modal with zoom, pan, and navigation
 * Features:
 * - Pinch-to-zoom and mouse wheel zoom
 * - Pan with mouse drag or touch
 * - Keyboard navigation (arrow keys, escape)
 * - Multiple image support with gallery navigation
 * - Download and fullscreen options
 * - Terminal-themed design
 */

import { useState, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface GalleryImage {
  /**
   * Image URL
   */
  url: string;

  /**
   * Alt text for accessibility
   */
  alt?: string;

  /**
   * Image caption
   */
  caption?: string;

  /**
   * Image title
   */
  title?: string;

  /**
   * Original filename for download
   */
  filename?: string;
}

interface ImageGalleryProps {
  /**
   * Array of images to display
   */
  images: GalleryImage[];

  /**
   * Index of the initially displayed image
   * @default 0
   */
  initialIndex?: number;

  /**
   * Whether the gallery is open
   */
  isOpen: boolean;

  /**
   * Callback when gallery is closed
   */
  onClose: () => void;

  /**
   * Whether to show download button
   * @default true
   */
  showDownload?: boolean;

  /**
   * Whether to show navigation arrows (when multiple images)
   * @default true
   */
  showNavigation?: boolean;

  /**
   * Custom className for the modal
   */
  className?: string;
}

/**
 * ImageGallery Component
 *
 * Full-screen modal for viewing images with zoom, pan, and navigation
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const images = [
 *   { url: '/image1.jpg', alt: 'First image', caption: 'Beautiful sunset' },
 *   { url: '/image2.jpg', alt: 'Second image' }
 * ];
 *
 * <ImageGallery
 *   images={images}
 *   initialIndex={0}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function ImageGallery({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  showDownload = true,
  showNavigation = true,
  className,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Reset rotation when image changes
  useEffect(() => {
    setRotation(0);
  }, [currentIndex]);

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  }, [hasMultipleImages, images.length]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  }, [hasMultipleImages, images.length]);

  // Rotate image 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Download current image
  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentImage.filename || `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Request fullscreen
  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
    >
      {/* Backdrop - Click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close gallery"
      />

      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header - Controls */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="text-sm font-mono text-gray-300">
              <span className="text-terminal-green">{currentIndex + 1}</span>
              <span className="text-gray-500"> / </span>
              <span>{images.length}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <TransformWrapper>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <button
                    onClick={() => zoomIn()}
                    className="p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <ZoomIn size={20} className="text-gray-300" />
                  </button>

                  <button
                    onClick={() => zoomOut()}
                    className="p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut size={20} className="text-gray-300" />
                  </button>

                  <button
                    onClick={() => {
                      resetTransform();
                      setRotation(0);
                    }}
                    className="hidden sm:block p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
                    aria-label="Reset view"
                    title="Reset view"
                  >
                    <RotateCw size={20} className="text-gray-300" />
                  </button>
                </>
              )}
            </TransformWrapper>

            <button
              onClick={handleRotate}
              className="hidden sm:block p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
              aria-label="Rotate image"
              title="Rotate 90°"
            >
              <RotateCw size={20} className="text-gray-300" />
            </button>

            {showDownload && (
              <button
                onClick={handleDownload}
                className="hidden sm:block p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
                aria-label="Download image"
                title="Download"
              >
                <Download size={20} className="text-gray-300" />
              </button>
            )}

            <button
              onClick={handleFullscreen}
              className="hidden sm:block p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-colors"
              aria-label="Fullscreen"
              title="Fullscreen"
            >
              <Maximize size={20} className="text-gray-300" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-900/80 border border-gray-700 hover:border-red-500 hover:bg-gray-800 transition-colors"
              aria-label="Close gallery"
              title="Close (Esc)"
            >
              <X size={20} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Image Container with Zoom/Pan */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit
            wheel={{ step: 0.1 }}
            doubleClick={{ mode: 'zoomIn' }}
            pinch={{ step: 5 }}
          >
            <TransformComponent
              wrapperClass="w-full h-full flex items-center justify-center"
              contentClass="max-w-full max-h-full"
            >
              <img
                src={currentImage.url}
                alt={currentImage.alt || currentImage.title || 'Gallery image'}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease-out',
                }}
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* Navigation Arrows */}
        {showNavigation && hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-all duration-200 hover:scale-110"
              aria-label="Previous image"
              title="Previous (←)"
            >
              <ChevronLeft size={24} className="text-gray-300" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-gray-900/80 border border-gray-700 hover:border-terminal-green hover:bg-gray-800 transition-all duration-200 hover:scale-110"
              aria-label="Next image"
              title="Next (→)"
            >
              <ChevronRight size={24} className="text-gray-300" />
            </button>
          </>
        )}

        {/* Footer - Caption */}
        {(currentImage.caption || currentImage.title) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto text-center">
              {currentImage.title && (
                <h3 className="text-lg font-bold text-gray-100 mb-1 font-mono">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.caption && (
                <p className="text-sm text-gray-300">{currentImage.caption}</p>
              )}
            </div>
          </div>
        )}

        {/* Thumbnail Strip (for multiple images) */}
        {hasMultipleImages && images.length <= 10 && (
          <div className="absolute bottom-20 left-0 right-0 z-20 flex items-center justify-center gap-2 px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110',
                  index === currentIndex
                    ? 'border-terminal-green shadow-lg shadow-terminal-green/50'
                    : 'border-gray-700 opacity-70 hover:opacity-100'
                )}
                aria-label={`View image ${index + 1}`}
                title={image.title || `Image ${index + 1}`}
              >
                <img
                  src={image.url}
                  alt={image.alt || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
