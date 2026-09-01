import React from "react";

/**
 * Simple SVG arc gauge (0–100) with ISA-101 grayscale palette; turns amber/red
 * only when the reading crosses ISA thresholds.
 */
export default function HealthGauge({ value = 0, size = 150 }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke =
    v < 40 ? "#FF3333" :
    v < 70 ? "#FFBF00" : "#5A6063";

  const R = 62;
  const CX = 80;
  const CY = 78;
  // arc spans 220° starting at 160° going clockwise
  const startAngle = 160;
  const totalArc = 220;
  const endAngle = startAngle + totalArc;

  const toXY = (angleDeg, r = R) => {
    const a = (angleDeg * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };

  const [x1, y1] = toXY(startAngle);
  const [x2, y2] = toXY(endAngle);
  const bgPath = `M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`;

  const valAngleEnd = startAngle + (totalArc * v) / 100;
  const [vx, vy] = toXY(valAngleEnd);
  const largeArc = totalArc * (v / 100) > 180 ? 1 : 0;
  const valPath = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${vx} ${vy}`;

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 160 130" width={size} height={(size * 130) / 160} data-testid="health-gauge">
        <path d={bgPath} fill="none" stroke="#252729" strokeWidth="10" strokeLinecap="butt" />
        <path d={valPath} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="butt" />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = startAngle + (totalArc * tick) / 100;
          const [ox, oy] = toXY(angle, R + 8);
          const [ix, iy] = toXY(angle, R + 2);
          return (
            <line
              key={tick}
              x1={ix} y1={iy} x2={ox} y2={oy}
              stroke="#3A3E41" strokeWidth="1"
            />
          );
        })}
        <text
          x="80" y="70"
          textAnchor="middle"
          className="font-mono-tel"
          fontSize="28"
          fontWeight="600"
          fill={stroke}
        >
          {v.toFixed(0)}
        </text>
        <text
          x="80" y="90"
          textAnchor="middle"
          fontSize="9"
          fill="#757575"
          letterSpacing="1.5"
        >
          HEALTH SCORE
        </text>
      </svg>
    </div>
  );
}
