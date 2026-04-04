"use client";

interface GaugeChartProps {
  current: number;  // current value (%)
  target: number;   // target value (%)
  max?: number;     // max scale (%)
  label?: string;
  width?: number;
  height?: number;
}

export function GaugeChart({
  current,
  target,
  max = 30,
  label = "粗利率",
  width = 280,
  height = 160,
}: GaugeChartProps) {
  const cx = width / 2;
  const cy = height - 20;
  const r = Math.min(cx - 20, cy - 10);

  // Convert percentage to angle (-180 to 0)
  const valueToAngle = (val: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    return -180 + (clamped / max) * 180;
  };

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(endAngle, radius);
    const end = polarToCartesian(startAngle, radius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const currentAngle = valueToAngle(current);
  const targetAngle = valueToAngle(target);

  // Needle
  const needleEnd = polarToCartesian(currentAngle, r - 10);

  // Color zones
  const dangerEnd = valueToAngle(max * 0.33);
  const warningEnd = valueToAngle(max * 0.66);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background arc zones */}
      <path d={describeArc(-180, dangerEnd, r)} fill="none" stroke="#fecaca" strokeWidth={16} strokeLinecap="round" />
      <path d={describeArc(dangerEnd, warningEnd, r)} fill="none" stroke="#fef08a" strokeWidth={16} strokeLinecap="round" />
      <path d={describeArc(warningEnd, 0, r)} fill="none" stroke="#bbf7d0" strokeWidth={16} strokeLinecap="round" />

      {/* Current value arc */}
      <path d={describeArc(-180, currentAngle, r)} fill="none" stroke="#3b82f6" strokeWidth={8} strokeLinecap="round" />

      {/* Target marker */}
      {(() => {
        const tp = polarToCartesian(targetAngle, r);
        const tp2 = polarToCartesian(targetAngle, r - 20);
        return <line x1={tp.x} y1={tp.y} x2={tp2.x} y2={tp2.y} stroke="#dc2626" strokeWidth={3} strokeLinecap="round" />;
      })()}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#1e293b" />

      {/* Labels */}
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">
        {label}
      </text>

      {/* Scale labels */}
      <text x={polarToCartesian(-180, r + 14).x} y={polarToCartesian(-180, r + 14).y} textAnchor="middle" fontSize={9} fill="#94a3b8">0%</text>
      <text x={polarToCartesian(0, r + 14).x} y={polarToCartesian(0, r + 14).y} textAnchor="middle" fontSize={9} fill="#94a3b8">{max}%</text>

      {/* Current value */}
      <text x={cx} y={cy - 20} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#1e293b">
        {current.toFixed(2)}%
      </text>

      {/* Target label */}
      {(() => {
        const tp = polarToCartesian(targetAngle, r + 24);
        return <text x={tp.x} y={tp.y} textAnchor="middle" fontSize={9} fill="#dc2626" fontWeight="bold">目標{target}%</text>;
      })()}
    </svg>
  );
}
