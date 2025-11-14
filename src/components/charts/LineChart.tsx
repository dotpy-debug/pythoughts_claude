interface LineChartProperties {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showGrid?: boolean;
}

export function LineChart({ data, height = 200, color = '#00ff9f', showGrid = true }: LineChartProperties) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 100; // percentage
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };

  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left / 5 - padding.right / 5; // adjust for percentage

  // Calculate points for the line
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * chartWidth + (padding.left / 5);
    const y = chartHeight - (d.value / maxValue) * chartHeight + padding.top;
    return { x, y, value: d.value, label: d.label };
  });

  // Create path string
  const pathD = points.map((p, index) =>
    `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  // Create area path (filled under line)
  const areaD = `M ${points[0].x} ${chartHeight + padding.top} L ${points[0].x} ${points[0].y} ${pathD.slice(2)} L ${points.at(-1).x} ${chartHeight + padding.top} Z`;

  // Grid lines
  const gridLines = showGrid ? [0, 0.25, 0.5, 0.75, 1].map(fraction => {
    const y = chartHeight - (fraction * chartHeight) + padding.top;
    return { y, label: Math.round(maxValue * fraction) };
  }) : [];

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid lines */}
        {showGrid && gridLines.map((line, index) => (
          <g key={index}>
            <line
              x1={padding.left / 5}
              y1={line.y}
              x2={width - padding.right / 5}
              y2={line.y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <text
              x={2}
              y={line.y}
              fill="#6b7280"
              fontSize="3"
              fontFamily="monospace"
              dominantBaseline="middle"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Area under line */}
        <path
          d={areaD}
          fill={color}
          fillOpacity="0.1"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="1"
              fill={color}
              className="hover:r-2 transition-all cursor-pointer"
            >
              <title>{`${point.label}: ${point.value}`}</title>
            </circle>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 5}
            fill="#6b7280"
            fontSize="2.5"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {data[index].label}
          </text>
        ))}
      </svg>
    </div>
  );
}
