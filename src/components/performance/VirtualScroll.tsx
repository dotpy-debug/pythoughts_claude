/**
 * Virtual Scroll Component
 *
 * Efficiently renders large lists by only rendering visible items
 * Features:
 * - Window-based virtualization
 * - Dynamic item heights
 * - Scroll position restoration
 * - Overscan for smooth scrolling
 * - Performance optimized with memo
 */

import { useState, useEffect, useRef, useMemo, ReactNode, memo } from 'react';
import { cn } from '../../lib/utils';

export interface VirtualScrollProperties<T> {
  /**
   * Array of items to render
   */
  items: T[];

  /**
   * Estimated height of each item in pixels
   * Used for initial calculations and scrollbar sizing
   */
  itemHeight: number;

  /**
   * Height of the scroll container in pixels
   */
  containerHeight: number;

  /**
   * Render function for each item
   */
  renderItem: (item: T, index: number) => ReactNode;

  /**
   * Number of items to render above/below visible area
   * @default 3
   */
  overscan?: number;

  /**
   * Custom className for container
   */
  className?: string;

  /**
   * Key extractor function
   */
  getKey: (item: T, index: number) => string | number;

  /**
   * Callback when user scrolls to end
   */
  onEndReached?: () => void;

  /**
   * Threshold for end reached callback (0-1)
   * @default 0.8
   */
  endReachedThreshold?: number;
}

/**
 * VirtualScroll Component
 *
 * @example
 * ```tsx
 * <VirtualScroll
 *   items={posts}
 *   itemHeight={200}
 *   containerHeight={600}
 *   renderItem={(post) => <PostCard post={post} />}
 *   getKey={(post) => post.id}
 *   onEndReached={loadMore}
 * />
 * ```
 */
function VirtualScrollInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  getKey,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualScrollProperties<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerReference = useRef<HTMLDivElement>(null);
  const endReachedReference = useRef(false);

  // Calculate visible range
  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const scrollItemIndex = Math.floor(scrollTop / itemHeight);

    const start = Math.max(0, scrollItemIndex - overscan);
    const end = Math.min(
      items.length - 1,
      scrollItemIndex + visibleItemCount + overscan
    );

    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * itemHeight,
      totalHeight: items.length * itemHeight,
    };
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if reached end
    if (onEndReached && !endReachedReference.current) {
      const scrollPercentage =
        (target.scrollTop + target.clientHeight) / target.scrollHeight;

      if (scrollPercentage >= endReachedThreshold) {
        endReachedReference.current = true;
        onEndReached();

        // Reset after a delay to allow multiple loads
        setTimeout(() => {
          endReachedReference.current = false;
        }, 1000);
      }
    }
  };

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  return (
    <div
      ref={containerReference}
      className={cn('relative overflow-auto', className)}
      style={{ height: `${containerHeight}px` }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={getKey(item, index)}>{renderItem(item, index)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualScroll = memo(VirtualScrollInner) as typeof VirtualScrollInner;

/**
 * Dynamic Virtual Scroll Component
 *
 * Supports variable item heights by measuring each item
 */
export interface DynamicVirtualScrollProperties<T> {
  items: T[];
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  estimatedItemHeight?: number;
  overscan?: number;
  className?: string;
  getKey: (item: T, index: number) => string | number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function DynamicVirtualScroll<T>({
  items,
  containerHeight,
  renderItem,
  estimatedItemHeight = 100,
  overscan = 3,
  className,
  getKey,
  onEndReached,
  endReachedThreshold = 0.8,
}: DynamicVirtualScrollProperties<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(
    new Map()
  );
  const containerReference = useRef<HTMLDivElement>(null);
  const endReachedReference = useRef(false);
  const itemReferences = useRef<Map<number, HTMLDivElement>>(new Map());

  // Measure item heights
  useEffect(() => {
    const heights = new Map<number, number>();
    for (const [index, element] of itemReferences.current.entries()) {
      if (element) {
        heights.set(index, element.getBoundingClientRect().height);
      }
    }
    setItemHeights(heights);
  }, [items]);

  // Calculate positions and visible range
  const { positions, startIndex, endIndex, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    let currentTop = 0;

    for (let index = 0; index < items.length; index++) {
      positions.push(currentTop);
      const height = itemHeights.get(index) || estimatedItemHeight;
      currentTop += height;
    }

    // Find visible range
    let start = 0;
    let end = items.length - 1;

    for (const [index, position] of positions.entries()) {
      if (position >= scrollTop) {
        start = Math.max(0, index - overscan);
        break;
      }
    }

    for (let index = start; index < positions.length; index++) {
      const itemHeight = itemHeights.get(index) || estimatedItemHeight;
      if (positions[index] + itemHeight >= scrollTop + containerHeight) {
        end = Math.min(items.length - 1, index + overscan);
        break;
      }
    }

    return {
      positions,
      startIndex: start,
      endIndex: end,
      totalHeight: currentTop,
    };
  }, [
    items.length,
    scrollTop,
    containerHeight,
    itemHeights,
    estimatedItemHeight,
    overscan,
  ]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if reached end
    if (onEndReached && !endReachedReference.current) {
      const scrollPercentage =
        (target.scrollTop + target.clientHeight) / target.scrollHeight;

      if (scrollPercentage >= endReachedThreshold) {
        endReachedReference.current = true;
        onEndReached();

        setTimeout(() => {
          endReachedReference.current = false;
        }, 1000);
      }
    }
  };

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: positions[startIndex + index] || 0,
    }));
  }, [items, startIndex, endIndex, positions]);

  return (
    <div
      ref={containerReference}
      className={cn('relative overflow-auto', className)}
      style={{ height: `${containerHeight}px` }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={getKey(item, index)}
            ref={(element) => {
              if (element) {
                itemReferences.current.set(index, element);
              } else {
                itemReferences.current.delete(index);
              }
            }}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualScroll;
