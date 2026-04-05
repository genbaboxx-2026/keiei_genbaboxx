"use client";

interface GaugeChartProps {
  current: number;
  target: number;
  max?: number;
  label?: string;
  width?: number;
  height?: number;
}

export function GaugeChart({
  current,
  target,
  max = 30,
  label = "粗利率",
  width = 200,
  height = 130,
}: GaugeChartProps) {
  const cx = width / 2;
  const cy = height - 10;
  const r = Math.min(cx - 16, cy - 16);

  const valueToAngle = (val: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    return -180 + (clamped / max) * 180;
  };

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(endAngle, radius);
    const end = polarToCartesian(startAngle, radius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const currentAngle = valueToAngle(current);
  const targetAngle = valueToAngle(target);
  const needleEnd = polarToCartesian(currentAngle, r - 8);

  const dangerEnd = valueToAngle(max * 0.33);
  const warningEnd = valueToAngle(max * 0.66);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background arc zones */}
      <path d={describeArc(-180, dangerEnd, r)} fill="none" stroke="#fecaca" strokeWidth={12} strokeLinecap="round" />
      <path d={describeArc(dangerEnd, warningEnd, r)} fill="none" stroke="#fef08a" strokeWidth={12} strokeLinecap="round" />
      <path d={describeArc(warningEnd, 0, r)} fill="none" stroke="#bbf7d0" strokeWidth={12} strokeLinecap="round" />

      {/* Current value arc */}
      <path d={describeArc(-180, currentAngle, r)} fill="none" stroke="#3b82f6" strokeWidth={6} strokeLinecap="round" />

      {/* Target marker */}
      {(() => {
        const tp = polarToCartesian(targetAngle, r + 6);
        const tp2 = polarToCartesian(targetAngle, r - 16);
        return <line x1={tp.x} y1={tp.y} x2={tp2.x} y2={tp2.y} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />;
      })()}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#1e293b" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill="#1e293b" />

      {/* Current value - centered above needle */}
      <text x={cx} y={cy - 24} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#1e293b">
        {current.toFixed(1)}%
      </text>

      {/* Label below */}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
        {label}
      </text>

      {/* Target label - outside arc */}
      {(() => {
        const tp = polarToCartesian(targetAngle, r + 18);
        return <text x={tp.x} y={Math.min(tp.y, cy - 6)} textAnchor="middle" fontSize={8} fill="#dc2626" fontWeight="bold">目標{target}%</text>;
      })()}
    </svg>
  );
}
