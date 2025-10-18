import { useRef, useEffect, TouchEvent } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type SwipeGestureOptions = {
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
};

/**
 * Custom hook for detecting swipe gestures on touch devices
 *
 * @example
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   minSwipeDistance: 50
 * });
 *
 * return <div {...swipeHandlers}>Swipe me!</div>;
 */
export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
  } = options;

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) {
      touchStart.current = null;
      return;
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine primary swipe direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX >= minSwipeDistance) {
        const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';

        onSwipe?.(direction);

        if (direction === 'left') {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY >= minSwipeDistance) {
        const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';

        onSwipe?.(direction);

        if (direction === 'up') {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    }

    touchStart.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Custom hook for detecting pull-to-refresh gesture
 *
 * @example
 * const pullToRefreshHandlers = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchNewData();
 *   },
 *   threshold: 80
 * });
 */
export function usePullToRefresh(options: {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  containerRef?: React.RefObject<HTMLElement>;
}) {
  const { onRefresh, threshold = 80, containerRef } = options;
  const touchStart = useRef<number | null>(null);
  const isPulling = useRef(false);

  useEffect(() => {
    const container = containerRef?.current || window;

    const handleTouchStart = (e: Event) => {
      const touch = (e as unknown as TouchEvent).touches[0];
      const scrollTop = containerRef?.current?.scrollTop || window.scrollY;

      if (scrollTop === 0) {
        touchStart.current = touch.clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: Event) => {
      if (!isPulling.current || touchStart.current === null) return;

      const touch = (e as unknown as TouchEvent).touches[0];
      const diff = touch.clientY - touchStart.current;

      if (diff > threshold) {
        isPulling.current = false;
        touchStart.current = null;
        onRefresh();
      }
    };

    const handleTouchEnd = () => {
      touchStart.current = null;
      isPulling.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, containerRef]);
}

/**
 * Hook to improve touch target sizes for better mobile UX
 * Ensures touch targets meet minimum size recommendations (44x44px)
 */
export function useTouchTarget(minSize: number = 44) {
  return {
    style: {
      minWidth: `${minSize}px`,
      minHeight: `${minSize}px`,
    },
  };
}

/**
 * Hook to add haptic feedback on touch devices
 */
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const lightTap = () => vibrate(10);
  const mediumTap = () => vibrate(20);
  const heavyTap = () => vibrate(30);
  const success = () => vibrate([10, 50, 10]);
  const error = () => vibrate([50, 100, 50]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
  };
}
