import { useState, useEffect } from 'react';
import { Search, X, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { pexels, PexelsPhoto } from '../../lib/pexels';
import { ShadcnButton } from '../ui/ShadcnButton';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface PexelsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string, photographer: string, photographerUrl: string) => void;
}

export function PexelsSearchModal({ isOpen, onClose, onImageSelect }: PexelsSearchModalProps) {
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PexelsPhoto | null>(null);

  useEffect(() => {
    if (isOpen && !pexels.isConfigured()) {
      setError('Pexels API key not configured. Please add VITE_PEXELS_API_KEY to your .env file.');
    }
  }, [isOpen]);

  const searchPhotos = async (searchQuery: string = query, pageNum: number = 1) => {
    if (!searchQuery.trim()) {
      loadCuratedPhotos(pageNum);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await pexels.searchPhotos(searchQuery, pageNum, 20);
      if (result) {
        setPhotos(result.photos);
        setTotalResults(result.total_results);
        setPage(pageNum);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search photos';
      setError(errorMessage);
      logger.error('Pexels search failed', { error: errorMessage, query: searchQuery });
    } finally {
      setLoading(false);
    }
  };

  const loadCuratedPhotos = async (pageNum: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const result = await pexels.getCuratedPhotos(pageNum, 20);
      if (result) {
        setPhotos(result.photos);
        setTotalResults(1000);
        setPage(pageNum);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load curated photos';
      setError(errorMessage);
      logger.error('Pexels curated load failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const cachePhotoToDatabase = async (photo: PexelsPhoto) => {
    try {
      const { data: existing } = await supabase
        .from('pexels_images')
        .select('id')
        .eq('pexels_id', photo.id)
        .single();

      if (!existing) {
        await supabase.from('pexels_images').insert({
          pexels_id: photo.id,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          photo_url: photo.url,
          medium_url: photo.src.medium,
          large_url: photo.src.large,
          original_url: photo.src.original,
          width: photo.width,
          height: photo.height,
          alt: photo.alt,
          color: photo.avg_color,
          search_query: query || 'curated',
        });
      }
    } catch (err) {
      logger.warn('Failed to cache Pexels image', {
        error: err instanceof Error ? err.message : String(err),
        photoId: photo.id,
      });
    }
  };

  const handleImageSelect = async (photo: PexelsPhoto) => {
    await cachePhotoToDatabase(photo);
    onImageSelect(photo.src.large, photo.photographer, photo.photographer_url);
    onClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPhotos(query, 1);
  };

  const handleNextPage = () => {
    const nextPage = page + 1;
    searchPhotos(query, nextPage);
  };

  const handlePrevPage = () => {
    const prevPage = Math.max(1, page - 1);
    searchPhotos(query, prevPage);
  };

  useEffect(() => {
    if (isOpen && photos.length === 0 && pexels.isConfigured()) {
      loadCuratedPhotos();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-100">Search Pexels Stock Photos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-700">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for high-quality stock photos..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <ShadcnButton type="submit" disabled={loading} variant="default">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
            </ShadcnButton>
          </form>

          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && photos.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No photos found. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-800 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.src.medium}
                    alt={photo.alt || 'Pexels photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-white text-sm font-medium mb-2">
                      by {photo.photographer}
                    </p>
                    <ShadcnButton
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageSelect(photo);
                      }}
                    >
                      Select
                    </ShadcnButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalResults > 20 && (
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {page} of {Math.ceil(totalResults / 20)}
            </div>
            <div className="flex gap-2">
              <ShadcnButton
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
              >
                <ChevronLeft size={16} />
                Previous
              </ShadcnButton>
              <ShadcnButton
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= Math.ceil(totalResults / 20) || loading}
              >
                Next
                <ChevronRight size={16} />
              </ShadcnButton>
            </div>
          </div>
        )}

        {selectedPhoto && (
          <div
            className="absolute inset-0 bg-black/90 flex items-center justify-center p-8"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="max-w-4xl w-full bg-gray-900 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.src.large}
                alt={selectedPhoto.alt || 'Pexels photo'}
                className="w-full h-auto"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-100 mb-2">
                  Photo by {selectedPhoto.photographer}
                </h3>
                <div className="flex gap-3 mb-4">
                  <a
                    href={selectedPhoto.photographer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View photographer
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href={selectedPhoto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View on Pexels
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  {selectedPhoto.width} × {selectedPhoto.height}
                </div>
                <div className="flex gap-2">
                  <ShadcnButton
                    variant="default"
                    onClick={() => handleImageSelect(selectedPhoto)}
                  >
                    Insert Image
                  </ShadcnButton>
                  <ShadcnButton variant="ghost" onClick={() => setSelectedPhoto(null)}>
                    Cancel
                  </ShadcnButton>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-center">
          Photos provided by{' '}
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-400 hover:text-blue-300"
          >
            Pexels
          </a>
        </div>
      </div>
    </div>
  );
}
