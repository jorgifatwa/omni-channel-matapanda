import React from "react";

interface BarcodeSvgProps {
  value: string;
  className?: string;
  height?: number;
}

/**
 * Crisp SVG barcode representation for thermal shipping labels.
 * Produces clean alternating bars without external dependencies.
 */
export function BarcodeSvg({ value, className = "", height = 48 }: BarcodeSvgProps) {
  // Generate consistent bar widths using character codes
  const bars: { width: number; isBlack: boolean }[] = [];
  const text = value || "NO-TRACKING";

  // Start guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const pattern = [
      (code % 3) + 1,
      ((code >> 1) % 2) + 1,
      ((code >> 2) % 3) + 1,
      ((code >> 3) % 2) + 1,
    ];

    pattern.forEach((w, pIdx) => {
      bars.push({ width: w, isBlack: pIdx % 2 === 0 });
    });
  }

  // Stop guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[280px] h-12"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="currentColor"
            />
          );
        })}
      </svg>
      <span className="font-mono text-xs font-bold tracking-wider mt-1 text-black">
        {value}
      </span>
    </div>
  );
}
