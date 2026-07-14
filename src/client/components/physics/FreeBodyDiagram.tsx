import React, { useMemo } from "react";
import type { DocumentBlock } from "@/client/components/renderer/types/document";
import { EquationToolbar } from "@/client/components/maths";
import { InlineMath } from "react-katex";

interface Force {
  label?: string;
  mag: number; // Magnitude (length of arrow)
  angle: number; // Angle in degrees (standard math convention: 0 is right, 90 is up)
  color?: string;
}

interface FBDData {
  title?: string;
  mass?: number | string;
  forces: Force[];
}

interface Props {
  block: DocumentBlock;
}

export default function FreeBodyDiagram({ block }: Props) {
  const data = block.content || "";

  const spec = useMemo<FBDData | null>(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!spec || !Array.isArray(spec.forces)) {
    return (
      <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <EquationToolbar title="Free Body Diagram (Error)" />
        <div className="p-4 text-destructive font-mono text-[11px] overflow-x-auto">
          Invalid FBD JSON syntax: {data}
        </div>
      </section>
    );
  }

  const W = 400;
  const H = 400;
  const cx = W / 2;
  const cy = H / 2;

  // Find max magnitude to scale arrows
  const maxMag = Math.max(1, ...spec.forces.map((f) => f.mag));
  const maxRadius = Math.min(W, H) / 2 - 40; // Max arrow length
  const scale = maxRadius / maxMag;

  const renderLabel = (label?: string) => {
    if (!label) return null;
    if (label.startsWith("$") && label.endsWith("$")) {
      return <InlineMath math={label.slice(1, -1)} />;
    }
    return label;
  };

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title={spec.title || "Free Body Diagram"} />
      <div className="p-4 flex flex-col items-center justify-center relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[400px]">
          {/* Axes */}
          <line
            x1="0"
            y1={cy}
            x2={W}
            y2={cy}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="4 4"
          />
          <line
            x1={cx}
            y1="0"
            x2={cx}
            y2={H}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="4 4"
          />

          {/* Central Object */}
          <circle cx={cx} cy={cy} r="10" fill="currentColor" className="text-foreground" />
          {spec.mass && (
            <foreignObject
              x={cx - 100}
              y={cy - 100}
              width="200"
              height="200"
              style={{ overflow: "visible", pointerEvents: "none" }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap translate-x-4 translate-y-4">
                  {renderLabel(String(spec.mass))}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Forces */}
          {spec.forces.map((f, i) => {
            const rad = (f.angle * Math.PI) / 180;
            const length = f.mag * scale;
            const endX = cx + length * Math.cos(rad);
            // Y is inverted in SVG
            const endY = cy - length * Math.sin(rad);

            const color = f.color || "#3b82f6"; // default blue

            // Arrow head
            const arrowSize = 8;
            const angle1 = rad + Math.PI - Math.PI / 6;
            const angle2 = rad + Math.PI + Math.PI / 6;
            const ax1 = endX + arrowSize * Math.cos(angle1);
            const ay1 = endY - arrowSize * Math.sin(angle1);
            const ax2 = endX + arrowSize * Math.cos(angle2);
            const ay2 = endY - arrowSize * Math.sin(angle2);

            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={endX} y2={endY} stroke={color} strokeWidth="2.5" />
                <polygon points={`${endX},${endY} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
                <foreignObject
                  x={endX - 100}
                  y={endY - 100}
                  width="200"
                  height="200"
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <span
                      className="text-sm font-medium whitespace-nowrap"
                      style={{
                        color,
                        transform: `translate(${12 * Math.cos(rad)}px, ${-12 * Math.sin(rad)}px)`,
                      }}
                    >
                      {renderLabel(f.label)}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
