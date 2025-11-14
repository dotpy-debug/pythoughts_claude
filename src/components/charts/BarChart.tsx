interface BarChartProperties {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function BarChart({ data, height: _height = 200 }: BarChartProperties) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const defaultColors = ['#00ff9f', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b'];

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = item.color || defaultColors[index % defaultColors.length];

        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-gray-300 truncate flex-1">{item.label}</span>
              <span className="text-gray-400 ml-2">{item.value}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
