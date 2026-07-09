import React, { useMemo } from "react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar } from "@/components/maths";
import { InlineMath } from "react-katex";

type ComponentType =
  | "resistor"
  | "capacitor"
  | "battery"
  | "inductor"
  | "wire"
  | "switch"
  | "ammeter"
  | "voltmeter"
  | "diode"
  | "led"
  | "bulb"
  | "lamp"
  | "fuse"
  | "earth"
  | "ground"
  | "motor";

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

  /** Return the SVG symbol group centred at origin, facing right (horizontal) */
  const getSymbol = (type: ComponentType, color: string) => {
    const size = 20;
    switch (type) {
      case "wire":
        return <line x1={-size} y1={0} x2={size} y2={0} stroke={color} strokeWidth="2" />;

      case "resistor": {
        const pts = "-20,0 -15,-10 -5,10 5,-10 15,10 20,0";
        return (
          <polyline
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="bevel"
          />
        );
      }

      case "capacitor":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-5} y2={0} />
            <line x1={-5} y1={-15} x2={-5} y2={15} />
            <line x1={5} y1={-15} x2={5} y2={15} />
            <line x1={5} y1={0} x2={20} y2={0} />
          </g>
        );

      case "battery":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-5} y2={0} />
            <line x1={-5} y1={-15} x2={-5} y2={15} />
            <line x1={5} y1={-8} x2={5} y2={8} strokeWidth="3.5" />
            <line x1={5} y1={0} x2={20} y2={0} />
            <text x={-15} y={-10} fontSize="10" fill={color} stroke="none">
              +
            </text>
          </g>
        );

      case "inductor":
        return (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={-20} y1={0} x2={-15} y2={0} />
            <path d="M -15,0 a 5,5 0 0,1 10,0" />
            <path d="M -5,0 a 5,5 0 0,1 10,0" />
            <path d="M 5,0 a 5,5 0 0,1 10,0" />
            <line x1={15} y1={0} x2={20} y2={0} />
          </g>
        );

      case "switch":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-10} y2={0} />
            <circle cx={-10} cy={0} r={2} fill={color} />
            <line x1={-10} y1={0} x2={8} y2={-10} />
            <circle cx={10} cy={0} r={2} fill={color} />
            <line x1={10} y1={0} x2={20} y2={0} />
          </g>
        );

      case "ammeter":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-12} y2={0} />
            <circle cx={0} cy={0} r={12} fill="none" />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill={color}
              stroke="none"
            >
              A
            </text>
            <line x1={12} y1={0} x2={20} y2={0} />
          </g>
        );

      case "voltmeter":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-12} y2={0} />
            <circle cx={0} cy={0} r={12} fill="none" />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill={color}
              stroke="none"
            >
              V
            </text>
            <line x1={12} y1={0} x2={20} y2={0} />
          </g>
        );

      case "diode":
        // Triangle pointing right + vertical bar
        return (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={-20} y1={0} x2={-10} y2={0} />
            <polygon points="-10,-10 -10,10 10,0" fill={color} stroke={color} />
            <line x1={10} y1={-10} x2={10} y2={10} />
            <line x1={10} y1={0} x2={20} y2={0} />
          </g>
        );

      case "led":
        // Diode + two small arrows indicating light emission
        return (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={-20} y1={0} x2={-10} y2={0} />
            <polygon points="-10,-10 -10,10 10,0" fill={color} stroke={color} />
            <line x1={10} y1={-10} x2={10} y2={10} />
            <line x1={10} y1={0} x2={20} y2={0} />
            {/* Light rays */}
            <line x1={5} y1={-14} x2={14} y2={-20} strokeWidth="1.5" />
            <line x1={10} y1={-18} x2={14} y2={-20} strokeWidth="1.5" />
            <line x1={14} y1={-15} x2={14} y2={-20} strokeWidth="1.5" />
            <line x1={-2} y1={-14} x2={6} y2={-20} strokeWidth="1.5" />
          </g>
        );

      case "bulb":
      case "lamp":
        // Circle with X inside
        return (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={-20} y1={0} x2={-10} y2={0} />
            <circle cx={0} cy={0} r={10} />
            <line x1={-7} y1={-7} x2={7} y2={7} />
            <line x1={7} y1={-7} x2={-7} y2={7} />
            <line x1={10} y1={0} x2={20} y2={0} />
          </g>
        );

      case "fuse":
        // Rectangle with a line through it
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-10} y2={0} />
            <rect x={-10} y={-7} width={20} height={14} fill="none" />
            <line x1={-10} y1={0} x2={10} y2={0} strokeDasharray="4 2" />
            <line x1={10} y1={0} x2={20} y2={0} />
          </g>
        );

      case "earth":
      case "ground":
        // Three descending horizontal lines
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={0} y2={0} />
            <line x1={0} y1={0} x2={0} y2={8} />
            <line x1={-12} y1={8} x2={12} y2={8} />
            <line x1={-8} y1={13} x2={8} y2={13} />
            <line x1={-4} y1={18} x2={4} y2={18} />
          </g>
        );

      case "motor":
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={-20} y1={0} x2={-12} y2={0} />
            <circle cx={0} cy={0} r={12} fill="none" />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill={color}
              stroke="none"
            >
              M
            </text>
            <line x1={12} y1={0} x2={20} y2={0} />
          </g>
        );

      default:
        return <line x1={-size} y1={0} x2={size} y2={0} stroke={color} strokeWidth="2" />;
    }
  };

  const renderComponent = (c: CircuitComponent, index: number) => {
    let x1: number, y1: number, x2: number, y2: number, angle: number;
    switch (c.position) {
      case "top":
        x1 = rect.left;
        y1 = rect.top;
        x2 = rect.right;
        y2 = rect.top;
        angle = 0;
        break;
      case "bottom":
        x1 = rect.left;
        y1 = rect.bottom;
        x2 = rect.right;
        y2 = rect.bottom;
        angle = 0;
        break;
      case "left":
        x1 = rect.left;
        y1 = rect.top;
        x2 = rect.left;
        y2 = rect.bottom;
        angle = 90;
        break;
      case "right":
        x1 = rect.right;
        y1 = rect.top;
        x2 = rect.right;
        y2 = rect.bottom;
        angle = 90;
        break;
      default:
        return null;
    }

    const color = c.color || "currentColor";

    // Label offset based on position
    let lx = 0,
      ly = 0;
    if (c.position === "top") {
      lx = 0;
      ly = -32;
    }
    if (c.position === "bottom") {
      lx = 0;
      ly = 28;
    }
    if (c.position === "left") {
      lx = -60;
      ly = 0;
    }
    if (c.position === "right") {
      lx = 52;
      ly = 0;
    }

    const sideComponents = spec.components.filter((cc) => cc.position === c.position);
    const posIndex = sideComponents.indexOf(c);
    const fraction = (posIndex + 1) / (sideComponents.length + 1);

    const dx = x1 + (x2 - x1) * fraction;
    const dy = y1 + (y2 - y1) * fraction;

    const symbol = getSymbol(c.type, color);

    return (
      <g key={index}>
        <g transform={`translate(${dx}, ${dy}) rotate(${angle})`}>
          {/* Mask out the main wire behind the component */}
          <rect
            x={-22}
            y={-12}
            width={44}
            height={24}
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
                className="text-xs font-medium whitespace-nowrap"
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
          {/* Main wire loop */}
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
          {spec.components.map((c, i) => renderComponent(c, i))}
        </svg>
      </div>
    </section>
  );
}
