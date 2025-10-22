import { Terminal } from 'lucide-react';

interface ShimmerLogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ShimmerLogo({ showText = true, size = 'md' }: ShimmerLogoProps) {
  const sizes = {
    sm: { icon: 16, text: 'text-lg', container: 'w-8 h-8' },
    md: { icon: 20, text: 'text-xl', container: 'w-10 h-10' },
    lg: { icon: 28, text: 'text-3xl', container: 'w-14 h-14' },
  };

  const currentSize = sizes[size];

  return (
    <div className="flex items-center space-x-3">
      <div
        className={`${currentSize.container} bg-gradient-to-br from-terminal-green via-terminal-blue to-terminal-purple rounded-lg flex items-center justify-center shadow-lg shimmer-container relative overflow-hidden`}
      >
        <div className="shimmer-overlay absolute inset-0" />
        <Terminal size={currentSize.icon} className="text-gray-900 relative z-10" />
      </div>
      {showText && (
        <div className="font-mono">
          <span className="text-terminal-green">$ </span>
          <span className={`${currentSize.text} font-bold text-gray-100 shimmer-text relative`}>
            pythoughts.com
          </span>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(200%) rotate(45deg);
          }
        }

        @keyframes shimmer-text {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .shimmer-container {
          position: relative;
        }

        .shimmer-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          width: 100%;
          height: 200%;
          animation: shimmer 3s infinite;
          transform: translateX(-100%) rotate(45deg);
        }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            #00ff00 0%,
            #00ffff 25%,
            #ffffff 50%,
            #00ffff 75%,
            #00ff00 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-text 4s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer-overlay,
          .shimmer-text {
            animation: none;
          }
          .shimmer-text {
            background: #00ff00;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
