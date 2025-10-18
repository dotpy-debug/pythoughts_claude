type ShimmerTextProps = {
  text: string;
  className?: string;
};

export function ShimmerText({ text, className = '' }: ShimmerTextProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10 bg-gradient-to-r from-terminal-green via-terminal-blue to-terminal-purple bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
        {text}
      </span>
      <span
        className="absolute inset-0 bg-gradient-to-r from-terminal-green/20 via-terminal-blue/20 to-terminal-purple/20 blur-sm animate-shimmer bg-[length:200%_100%]"
        aria-hidden="true"
      >
        {text}
      </span>
    </span>
  );
}
