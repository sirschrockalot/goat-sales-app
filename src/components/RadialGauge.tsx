'use client';

/**
 * Radial Gauge Component
 * Speedometer-style gauge for metrics like Pacing and Certainty
 */

interface RadialGaugeProps {
  label: string;
  value: number; // 0-100
  color?: 'green' | 'blue' | 'yellow' | 'red';
  size?: number;
}

export default function RadialGauge({
  label,
  value,
  color = 'green',
  size = 120,
}: RadialGaugeProps) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, value));
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    switch (color) {
      case 'green':
        return '#22C55E'; // Exact from UI_SPEC
      case 'blue':
        return '#3B82F6'; // Exact from UI_SPEC
      case 'yellow':
        return '#EAB308';
      case 'red':
        return '#EF4444';
      default:
        return '#22C55E';
    }
  };

  const getSegmentColors = () => {
    if (color === 'green') {
      return {
        red: '#EF4444',
        yellow: '#EAB308',
        green: '#22C55E',
      };
    }
    return {
      red: '#EF4444',
      yellow: '#EAB308',
      blue: '#3B82F6',
    };
  };

  const segmentColors = getSegmentColors();

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background segments */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.red}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset="0"
            opacity="0.3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.yellow}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset={-(circumference / 3)}
            opacity="0.3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColors.green || segmentColors.blue}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${circumference / 3} ${circumference}`}
            strokeDashoffset={-(circumference * 2) / 3}
            opacity="0.3"
          />

          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: getColor() }}
            >
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
