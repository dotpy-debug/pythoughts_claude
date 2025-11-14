'use client';

interface PyThoughtsLogoProperties {
  compact?: boolean;
  className?: string;
}

export default function PyThoughtsLogo({ compact = false, className = '' }: PyThoughtsLogoProperties) {
  const size = compact ? 32 : 48;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Neural Network Icon with Lightning */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          style={{
            filter: 'drop-shadow(0 0 12px rgba(149, 128, 234, 0.6)) drop-shadow(0 0 6px rgba(88, 166, 255, 0.4))'
          }}
        >
          <defs>
            {/* Filters for lightning glow effect */}
            <filter id="lightning-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="lightning-glow-intense">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feGaussianBlur stdDeviation="6" result="coloredBlur2"/>
              <feMerge>
                <feMergeNode in="coloredBlur2"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Lightning bolt gradient */}
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="50%" stopColor="#58a6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9580ea" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9580ea">
                <animate attributeName="stop-color" 
                  values="#9580ea; #5a94e0; #4ba3a8; #d4b86a; #9580ea" 
                  dur="4s" 
                  repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#d4b86a">
                <animate attributeName="stop-color" 
                  values="#d4b86a; #9580ea; #5a94e0; #4ba3a8; #d4b86a" 
                  dur="4s" 
                  repeatCount="indefinite" />
              </stop>
            </linearGradient>
            
            <radialGradient id="nodeGradient">
              <stop offset="0%" stopColor="#c4b086" />
              <stop offset="100%" stopColor="#9580ea" />
            </radialGradient>
            
            <radialGradient id="centerGradient">
              <stop offset="0%" stopColor="#d4c49a" />
              <stop offset="50%" stopColor="#c4b086" />
              <stop offset="100%" stopColor="#9580ea" />
            </radialGradient>

            {/* Animated data flow gradient */}
            <linearGradient id="dataFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#5a94e0">
                <animate attributeName="stop-color" 
                  values="rgba(90, 148, 224, 0); rgba(90, 148, 224, 1); rgba(90, 148, 224, 0)" 
                  dur="2s" 
                  repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="transparent" />
              <animate attributeName="x1" values="-100%; 200%" dur="2s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0%; 300%" dur="2s" repeatCount="indefinite" />
            </linearGradient>
          </defs>

          {/* Lightning bolts between nodes - animated electric arcs */}
          <g filter="url(#lightning-glow-intense)">
            {/* Lightning from center to outer nodes */}
            {[
              { path: 'M40,40 L42,32 L38,28 L40,15', delay: '0s' },
              { path: 'M40,40 L48,36 L54,30 L62,27', delay: '0.3s' },
              { path: 'M40,40 L48,44 L58,50 L62,53', delay: '0.6s' },
              { path: 'M40,40 L38,48 L42,56 L40,65', delay: '0.9s' },
              { path: 'M40,40 L32,44 L24,50 L18,53', delay: '1.2s' },
              { path: 'M40,40 L32,36 L26,30 L18,27', delay: '1.5s' }
            ].map((lightning, index) => (
              <path
                key={`lightning-${index}`}
                d={lightning.path}
                stroke="url(#lightningGradient)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0"
              >
                <animate 
                  attributeName="opacity" 
                  values="0;0;0.9;0.7;0;0.8;0;0" 
                  dur="2s" 
                  repeatCount="indefinite"
                  begin={lightning.delay}
                />
                <animate 
                  attributeName="stroke-width" 
                  values="1.5;2;1.5;2.5;1.5" 
                  dur="2s" 
                  repeatCount="indefinite"
                  begin={lightning.delay}
                />
              </path>
            ))}
          </g>

          {/* Connection Lines with animated flow */}
          {[
            [40, 40, 40, 15], [40, 40, 62, 27], [40, 40, 62, 53],
            [40, 40, 40, 65], [40, 40, 18, 53], [40, 40, 18, 27],
            [40, 15, 62, 27], [62, 27, 62, 53], [62, 53, 40, 65],
            [40, 65, 18, 53], [18, 53, 18, 27], [18, 27, 40, 15]
          ].map((coords, index) => (
            <g key={index}>
              {/* Base line */}
              <line
                x1={coords[0]} y1={coords[1]} x2={coords[2]} y2={coords[3]}
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
              >
                <animate attributeName="opacity" 
                  values="0.5; 0.8; 0.5" 
                  dur={`${2 + index * 0.15}s`}
                  repeatCount="indefinite" />
              </line>
              {/* Animated data flow */}
              <line
                x1={coords[0]} y1={coords[1]} x2={coords[2]} y2={coords[3]}
                stroke="url(#dataFlow)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              >
                <animate attributeName="stroke-dasharray" 
                  values="0 100; 50 50; 100 0" 
                  dur={`${2 + index * 0.1}s`}
                  repeatCount="indefinite" />
                <animate attributeName="stroke-dashoffset" 
                  values="0; -100" 
                  dur={`${2 + index * 0.1}s`}
                  repeatCount="indefinite" />
              </line>
            </g>
          ))}

          {/* Outer Nodes with pulse animation */}
          {[[40, 15], [62, 27], [62, 53], [40, 65], [18, 53], [18, 27]].map((pos, index) => (
            <g key={index}>
              {/* Pulse ring */}
              <circle
                cx={pos[0]} cy={pos[1]} r="4"
                fill="none"
                stroke="#5a94e0"
                strokeWidth="1.5"
                opacity="0"
              >
                <animate attributeName="r" 
                  values="4; 9; 4" 
                  dur={`${2.5 + index * 0.3}s`}
                  repeatCount="indefinite" />
                <animate attributeName="opacity" 
                  values="0.8; 0; 0.8" 
                  dur={`${2.5 + index * 0.3}s`}
                  repeatCount="indefinite" />
              </circle>
              {/* Node */}
              <circle
                cx={pos[0]} cy={pos[1]} r="4"
                fill="url(#nodeGradient)"
              >
                <animate attributeName="r" 
                  values="4; 5.2; 4" 
                  dur={`${2.5 + index * 0.3}s`}
                  repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Center Node with enhanced pulse */}
          <g>
            {/* Outer pulse */}
            <circle cx="40" cy="40" r="6" fill="none" stroke="#d4b86a" strokeWidth="2" opacity="0">
              <animate attributeName="r" values="6; 13; 6" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9; 0; 0.9" dur="2.5s" repeatCount="indefinite" />
            </circle>
            {/* Middle pulse */}
            <circle cx="40" cy="40" r="6" fill="none" stroke="#5a94e0" strokeWidth="1.5" opacity="0">
              <animate attributeName="r" values="6; 10; 6" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
              <animate attributeName="opacity" values="0.7; 0; 0.7" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            {/* Center node */}
            <circle cx="40" cy="40" r="6.5" fill="url(#centerGradient)">
              <animate attributeName="r" values="6.5; 8; 6.5" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>

      {/* Logo Text */}
      {!compact && (
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          letterSpacing: '-0.025em',
          display: 'flex',
          alignItems: 'baseline'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #9580ea 0%, #7a68c8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Py
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #d8d8dc 0%, #b8b8c0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Thoughts
          </span>
          <span style={{
            color: '#6b7280',
            fontSize: '14px',
            fontWeight: '400',
            marginLeft: '3px',
            opacity: 0.5
          }}>
            .com
          </span>
        </div>
      )}
    </div>
  );
}
