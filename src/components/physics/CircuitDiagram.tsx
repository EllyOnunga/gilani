import React, { useMemo } from "react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar } from "@/components/maths";
import { InlineMath } from "react-katex";

type ComponentType = "resistor" | "capacitor" | "battery" | "inductor" | "wire" | "switch";

interface CircuitComponent {
  type: ComponentType;
  label?: string;
  position: "top" | "bottom" | "left" | "right";
  color?: string;
}

interface CircuitData {
  title?: string;
  components: CircuitComponent[];
}

interface Props {
  block: DocumentBlock;
}

export default function CircuitDiagram({ block }: Props) {
  const data = block.content || "";

  const spec = useMemo<CircuitData | null>(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!spec || !Array.isArray(spec.components)) {
    return (
      <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <EquationToolbar title="Circuit Diagram (Error)" />
        <div className="p-4 text-destructive font-mono text-[11px] overflow-x-auto">
          Invalid Circuit JSON syntax: {data}
        </div>
      </section>
    );
  }

  const W = 500;
  const H = 400;
  const PAD = 50;

  const rect = {
    top: PAD,
    bottom: H - PAD,
    left: PAD,
    right: W - PAD,
  };

  const renderLabel = (label?: string) => {
    if (!label) return null;
    if (label.startsWith("$") && label.endsWith("$")) {
      return <InlineMath math={label.slice(1, -1)} />;
    }
    return label;
  };

  const renderComponent = (c: CircuitComponent, index: number) => {
    // Determine coordinates based on position
    let x1, y1, x2, y2, mx, my, angle;
    switch (c.position) {
      case "top":
        x1 = rect.left;
        y1 = rect.top;
        x2 = rect.right;
        y2 = rect.top;
        mx = (x1 + x2) / 2;
        my = y1;
        angle = 0;
        break;
      case "bottom":
        x1 = rect.left;
        y1 = rect.bottom;
        x2 = rect.right;
        y2 = rect.bottom;
        mx = (x1 + x2) / 2;
        my = y1;
        angle = 0;
        break;
      case "left":
        x1 = rect.left;
        y1 = rect.top;
        x2 = rect.left;
        y2 = rect.bottom;
        mx = x1;
        my = (y1 + y2) / 2;
        angle = 90;
        break;
      case "right":
        x1 = rect.right;
        y1 = rect.top;
        x2 = rect.right;
        y2 = rect.bottom;
        mx = x1;
        my = (y1 + y2) / 2;
        angle = 90;
        break;
      default:
        return null;
    }

    const color = c.color || "currentColor";
    const size = 20; // Half-length of the component symbol

    let symbol = null;
    if (c.type === "wire") {
      symbol = <line x1={-size} y1={0} x2={size} y2={0} stroke={color} strokeWidth="2" />;
    } else if (c.type === "resistor") {
      // Zigzag pattern
      const pts = "-20,0 -15,-10 -5,10 5,-10 15,10 20,0";
      symbol = (
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="bevel" />
      );
    } else if (c.type === "capacitor") {
      symbol = (
        <g stroke={color} strokeWidth="2">
          <line x1={-20} y1={0} x2={-5} y2={0} />
          <line x1={-5} y1={-15} x2={-5} y2={15} />
          <line x1={5} y1={-15} x2={5} y2={15} />
          <line x1={5} y1={0} x2={20} y2={0} />
        </g>
      );
    } else if (c.type === "battery") {
      symbol = (
        <g stroke={color} strokeWidth="2">
          <line x1={-20} y1={0} x2={-5} y2={0} />
          <line x1={-5} y1={-15} x2={-5} y2={15} /> {/* Long positive */}
          <line x1={5} y1={-8} x2={5} y2={8} strokeWidth="3" /> {/* Short negative */}
          <line x1={5} y1={0} x2={20} y2={0} />
          <text x={-15} y={-10} fontSize="10" fill={color} stroke="none">
            +
          </text>
        </g>
      );
    } else if (c.type === "inductor") {
      // Semicircles
      symbol = (
        <g stroke={color} strokeWidth="2" fill="none">
          <line x1={-20} y1={0} x2={-15} y2={0} />
          <path d="M -15,0 a 5,5 0 0,1 10,0" />
          <path d="M -5,0 a 5,5 0 0,1 10,0" />
          <path d="M 5,0 a 5,5 0 0,1 10,0" />
          <line x1={15} y1={0} x2={20} y2={0} />
        </g>
      );
    } else if (c.type === "switch") {
      symbol = (
        <g stroke={color} strokeWidth="2">
          <line x1={-20} y1={0} x2={-10} y2={0} />
          <circle cx={-10} cy={0} r={2} fill={color} />
          <line x1={-10} y1={0} x2={8} y2={-10} />
          <circle cx={10} cy={0} r={2} fill={color} />
          <line x1={10} y1={0} x2={20} y2={0} />
        </g>
      );
    }

    // Determine label positioning
    let lx = 0,
      ly = 0;
    if (c.position === "top") {
      lx = -25;
      ly = -35;
    }
    if (c.position === "bottom") {
      lx = -25;
      ly = 20;
    }
    if (c.position === "left") {
      lx = -60;
      ly = -10;
    }
    if (c.position === "right") {
      lx = 20;
      ly = -10;
    }

    // How many components are on this side?
    const sideComponents = spec.components.filter((cc) => cc.position === c.position);
    const posIndex = sideComponents.indexOf(c);
    const fraction = (posIndex + 1) / (sideComponents.length + 1);

    // Calculate actual position on the line
    const dx = x1 + (x2 - x1) * fraction;
    const dy = y1 + (y2 - y1) * fraction;

    return (
      <g key={index}>
        <g transform={`translate(${dx}, ${dy}) rotate(${angle})`}>
          {/* White background to hide the main wire behind the component */}
          <rect
            x={-size}
            y={-10}
            width={size * 2}
            height={20}
            fill="var(--color-card, #fff)"
            className="dark:fill-[#09090b]"
          />
          {symbol}
        </g>
        {c.label && (
          <foreignObject
            x={dx - 100}
            y={dy - 100}
            width="200"
            height="200"
            style={{ overflow: "visible", pointerEvents: "none" }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: c.color, transform: `translate(${lx}px, ${ly}px)` }}
              >
                {renderLabel(c.label)}
              </span>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title={spec.title || "Circuit Diagram"} />
      <div className="p-6 flex flex-col items-center justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[500px]">
          {/* Main wires forming the rectangle loop */}
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.right - rect.left}
            height={rect.bottom - rect.top}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground"
          />

          {/* Components */}
          {spec.components.map((c, i) => renderComponent(c, i))}
        </svg>
      </div>
    </section>
  );
}
