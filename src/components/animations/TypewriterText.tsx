import { useState, useEffect } from 'react';

type TypewriterTextProps = {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
};

export function TypewriterText({ text, speed = 100, className = '', delay = 0 }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDelayComplete, setIsDelayComplete] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setIsDelayComplete(true);
      }, delay);
      return () => clearTimeout(delayTimer);
    }
  }, [delay]);

  useEffect(() => {
    if (!isDelayComplete) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed, isDelayComplete]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse text-terminal-green">|</span>
      )}
    </span>
  );
}
