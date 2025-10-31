import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ReadingProgressBarProps = {
  postId: string;
  contentRef: React.RefObject<HTMLDivElement>;
};

export function ReadingProgressBar({ postId, contentRef }: ReadingProgressBarProps) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(Date.now());

  const saveProgress = useCallback(async (
    percentage: number,
    position: number,
    timeSpent: number
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('reading_progress')
        .upsert(
          {
            user_id: user.id,
            post_id: postId,
            progress_percentage: Math.round(percentage),
            last_position: position,
            completed: percentage >= 90,
            reading_time_seconds: timeSpent,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,post_id',
          }
        );
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  }, [user, postId]);

  const updateProgress = useCallback(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = element.offsetHeight + element.offsetTop;

    const totalDocScrollLength = docHeight - windowHeight;
    const scrollPosition = scrollTop - element.offsetTop;

    let percentage = 0;
    if (scrollPosition > 0 && totalDocScrollLength > 0) {
      percentage = Math.min(
        100,
        Math.max(0, (scrollPosition / totalDocScrollLength) * 100)
      );
    }

    setProgress(percentage);

    const currentTime = Date.now();
    const timeSpent = Math.floor((currentTime - startTimeRef.current) / 1000);
    setReadingTime(timeSpent);

    if (
      user &&
      currentTime - lastSaveRef.current > 5000 &&
      percentage > 0
    ) {
      lastSaveRef.current = currentTime;
      saveProgress(percentage, scrollPosition, timeSpent);
    }
  }, [contentRef, user, saveProgress]);


  const loadSavedProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (data && data.last_position > 0 && !data.completed) {
        const shouldResume = window.confirm(
          `Would you like to resume reading from where you left off (${data.progress_percentage}%)?`
        );
        if (shouldResume) {
          window.scrollTo({
            top: data.last_position,
            behavior: 'smooth',
          });
        }
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  }, [user, postId]);

  useEffect(() => {
    loadSavedProgress();
  }, [loadSavedProgress]);

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', handleScroll);
    updateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (user && progress > 0) {
        saveProgress(progress, window.scrollY, readingTime);
      }
    };
  }, [updateProgress, user, progress, readingTime, saveProgress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div
        className="h-1 bg-terminal-green transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
      {progress > 0 && (
        <div className="absolute top-2 right-4 bg-gray-900 border border-terminal-green rounded px-3 py-1 text-xs font-mono text-terminal-green shadow-lg">
          {Math.round(progress)}% read
        </div>
      )}
    </div>
  );
}