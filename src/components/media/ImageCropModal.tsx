/**
 * ImageCropModal Component
 *
 * Modal for cropping images with preset aspect ratios
 * Features:
 * - Interactive crop area with drag and zoom
 * - Preset aspect ratios (free, 16:9, 4:3, 1:1, 2:3, 9:16)
 * - Zoom slider control
 * - Returns cropped image as Blob
 * - Terminal-themed design
 */

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Crop, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type CroppedAreaPixels = CroppedArea;

interface ImageCropModalProperties {
  /**
   * Image URL or data URL to crop
   */
  imageSrc: string;

  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when cropping is complete
   * Returns the cropped image as a Blob
   */
  onCropComplete: (croppedImage: Blob, croppedAreaPixels: CroppedAreaPixels) => void;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Initial aspect ratio
   * @default 'free'
   */
  initialAspect?: AspectRatioPreset;

  /**
   * Quality of the output image (0-1)
   * @default 0.92
   */
  outputQuality?: number;

  /**
   * Custom className
   */
  className?: string;
}

type AspectRatioPreset = 'free' | '16:9' | '4:3' | '1:1' | '2:3' | '9:16';

interface AspectRatio {
  label: string;
  value: number | undefined;
}

const ASPECT_RATIOS: Record<AspectRatioPreset, AspectRatio> = {
  'free': { label: 'Free', value: undefined },
  '16:9': { label: '16:9 (Landscape)', value: 16 / 9 },
  '4:3': { label: '4:3 (Standard)', value: 4 / 3 },
  '1:1': { label: '1:1 (Square)', value: 1 },
  '2:3': { label: '2:3 (Portrait)', value: 2 / 3 },
  '9:16': { label: '9:16 (Mobile)', value: 9 / 16 },
};

/**
 * Helper function to create cropped image from canvas
 */
async function createCroppedImage(
  imageSource: string,
  croppedAreaPixels: CroppedAreaPixels,
  outputQuality: number = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSource);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas dimensions to cropped area
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  // Draw cropped image
  context.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      outputQuality
    );
  });
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.onerror = reject;
    image.src = url;
  });
}

/**
 * ImageCropModal Component
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [imageSrc, setImageSrc] = useState('');
 *
 * const handleCropComplete = async (croppedBlob: Blob) => {
 *   // Upload cropped image
 *   await uploadImage(croppedBlob);
 *   setIsOpen(false);
 * };
 *
 * <ImageCropModal
 *   imageSrc={imageSrc}
 *   isOpen={isOpen}
 *   onCropComplete={handleCropComplete}
 *   onClose={() => setIsOpen(false)}
 *   initialAspect="16:9"
 * />
 * ```
 */
export function ImageCropModal({
  imageSrc,
  isOpen,
  onCropComplete,
  onClose,
  initialAspect = 'free',
  outputQuality = 0.92,
  className,
}: ImageCropModalProperties) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropAreaChange = useCallback(
    (_croppedArea: CroppedArea, croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedBlob = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        outputQuality
      );
      onCropComplete(croppedBlob, croppedAreaPixels);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
    >
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <Crop size={20} className="text-terminal-green" />
            <h2 className="text-lg font-bold text-gray-100 font-mono">
              Crop Image
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close"
            disabled={isProcessing}
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT_RATIOS[aspectRatio].value}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            style={{
              containerStyle: {
                backgroundColor: '#000',
              },
              cropAreaStyle: {
                border: '2px solid #00ff9f',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <ZoomOut size={20} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Zoom"
              />
            </div>
            <ZoomIn size={20} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-mono text-gray-400 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Aspect Ratio Presets */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(ASPECT_RATIOS).map(([key, ratio]) => (
              <button
                key={key}
                onClick={() => setAspectRatio(key as AspectRatioPreset)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-200',
                  aspectRatio === key
                    ? 'bg-terminal-green text-gray-900 font-bold'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                )}
                aria-label={`Set aspect ratio to ${ratio.label}`}
              >
                {ratio.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleCropConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className="px-4 py-2 rounded-lg bg-terminal-blue text-gray-900 hover:bg-terminal-green font-bold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Apply Crop</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #00ff9f;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 255, 159, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #00ff9f;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 255, 159, 0.5);
        }

        .slider::-webkit-slider-thumb:hover {
          background: #00ffff;
          box-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
        }

        .slider::-moz-range-thumb:hover {
          background: #00ffff;
          box-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
