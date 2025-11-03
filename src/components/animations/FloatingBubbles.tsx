import { useEffect, useState } from 'react';

type Bubble = {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
};

export function FloatingBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const newBubbles: Bubble[] = Array.from({ length: 20 }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full bg-gradient-to-br from-terminal-purple/10 via-terminal-blue/10 to-terminal-green/10 blur-xl animate-float"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
