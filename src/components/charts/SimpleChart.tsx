/**
 * Simple Chart Components
 *
 * Lightweight chart components using pure SVG
 * No external dependencies required
 */

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function LineChart({ data, height = 200, color = '#f97316' }: LineChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 80,
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Area fill */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill={color}
          fillOpacity="0.1"
        />
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function BarChart({ data, height = 200 }: BarChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-around h-full gap-2">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col justify-end h-full">
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#f97316',
                }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
}

export function PieChart({ data, size: _size = 200 }: PieChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90;

  const slices = data.map((item, i) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (currentAngle * Math.PI) / 180;

    const x1 = 50 + 45 * Math.cos(startRad);
    const y1 = 50 + 45 * Math.sin(startRad);
    const x2 = 50 + 45 * Math.cos(endRad);
    const y2 = 50 + 45 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const colors = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const color = item.color || colors[i % colors.length];

    return {
      path: `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color,
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-full max-w-[200px]">
        {slices.map((slice, i) => (
          <g key={i}>
            <title>{`${slice.label}: ${slice.value} (${slice.percentage}%)`}</title>
            <path
              d={slice.path}
              fill={slice.color}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          </g>
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-300">
              {slice.label}: <span className="font-semibold">{slice.percentage}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

export function StatCard({ label, value, change, icon: Icon, color = 'orange' }: StatCardProps) {
  const colorClasses = {
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.orange} border rounded-lg p-6 transition-all duration-200 hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {change !== undefined && (
        <div className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
