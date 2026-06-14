import React from "react";

// ─── Safe expression compiler ──────────────────────────────────────────────
// Whitelists identifiers to Math.* equivalents; rejects anything else.
const FUNC_MAP: Record<string, string> = {
  sin: "Math.sin", cos: "Math.cos", tan: "Math.tan",
  asin: "Math.asin", acos: "Math.acos", atan: "Math.atan",
  sinh: "Math.sinh", cosh: "Math.cosh", tanh: "Math.tanh",
  sqrt: "Math.sqrt", abs: "Math.abs", exp: "Math.exp",
  ln: "Math.log", log: "Math.log10", log10: "Math.log10", log2: "Math.log2",
  floor: "Math.floor", ceil: "Math.ceil", round: "Math.round",
  min: "Math.min", max: "Math.max", pow: "Math.pow", sign: "Math.sign",
};
const CONST_MAP: Record<string, string> = { pi: "Math.PI", e: "Math.E" };

export function compileExpression(expr: string): ((x: number) => number) | null {
  if (!expr || expr.length > 200) return null;
  let safe = expr.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (id) => {
    const lower = id.toLowerCase();
    if (lower === "x") return "x";
    if (CONST_MAP[lower]) return CONST_MAP[lower];
    if (FUNC_MAP[lower]) return FUNC_MAP[lower];
    return "\0INVALID\0";
  });
  if (safe.includes("\0INVALID\0")) return null;
  safe = safe.replace(/\^/g, "**");
  if (!/^[0-9+\-*/%.,()\sA-Za-z_]*$/.test(safe)) return null;
  const stripped = safe.replace(/Math\.[a-zA-Z0-9]+/g, "").replace(/\bx\b/g, "");
  if (/[A-Za-z_]/.test(stripped)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "x",
      `"use strict"; const r = (${safe}); return (typeof r === "number" && isFinite(r)) ? r : NaN;`
    );
    fn(1);
    return fn as (x: number) => number;
  } catch {
    return null;
  }
}

function niceStep(range: number, targetTicks = 8): number {
  if (!isFinite(range) || range <= 0) return 1;
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type GraphFn = { expr: string; label?: string; color?: string };
export type GraphSpec = {
  title?: string;
  functions: GraphFn[];
  xMin?: number; xMax?: number; yMin?: number; yMax?: number;
  points?: { x: number; y: number; label?: string }[];
};

const PALETTE = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#eab308"];

export function FunctionGraph({ spec }: { spec: GraphSpec }) {
  const xMin = spec.xMin ?? -10;
  const xMax = spec.xMax ?? 10;
  const yMin = spec.yMin ?? -10;
  const yMax = spec.yMax ?? 10;

  const W = 600, H = 400, PAD = 32;
  const plotW = W - PAD * 2, plotH = H - PAD * 2;
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => PAD + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const xStep = niceStep(xMax - xMin);
  const yStep = niceStep(yMax - yMin);

  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax + 1e-9; v += xStep) {
    if (Math.abs(v) > 1e-9) xTicks.push(round(v));
  }
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + 1e-9; v += yStep) {
    if (Math.abs(v) > 1e-9) yTicks.push(round(v));
  }

  const xAxisY = sy(clamp(0, yMin, yMax));
  const yAxisX = sx(clamp(0, xMin, xMax));

  const curves = (spec.functions || []).map((f, i) => {
    const color = f.color || PALETTE[i % PALETTE.length];
    const fn = compileExpression(f.expr);
    if (!fn) return { ...f, color, path: "", error: true };
    const N = 400;
    let path = "";
    let prevValid = false;
    let prevY = 0;
    const bound = (yMax - yMin) * 3 + Math.abs(yMax) + Math.abs(yMin) + 1;
    for (let i2 = 0; i2 <= N; i2++) {
      const x = xMin + ((xMax - xMin) * i2) / N;
      const y = fn(x);
      const valid = isFinite(y);
      if (valid) {
        const jump = prevValid && Math.abs(y - prevY) > (yMax - yMin) * 1.5;
        const big = Math.abs(y) > bound;
        const cy = clamp(y, yMin - (yMax - yMin), yMax + (yMax - yMin));
        if (jump || big) {
          path += ` M ${sx(x).toFixed(2)},${sy(clamp(cy, yMin, yMax)).toFixed(2)}`;
        } else {
          path += (prevValid ? " L " : " M ") + `${sx(x).toFixed(2)},${sy(clamp(cy, yMin, yMax)).toFixed(2)}`;
        }
        prevValid = !big;
        prevY = y;
      } else {
        prevValid = false;
      }
    }
    return { ...f, color, path, error: false };
  });

  return (
    <div className="my-3 rounded-xl border border-border bg-card p-3 overflow-hidden">
      {spec.title && (
        <p className="text-xs font-bold text-foreground mb-2 text-center">{spec.title}</p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 340 }}>
        {/* Grid */}
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={PAD} y2={H - PAD}
            stroke="currentColor" className="text-border" strokeWidth="1" opacity="0.4" />
        ))}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={PAD} x2={W - PAD} y1={sy(t)} y2={sy(t)}
            stroke="currentColor" className="text-border" strokeWidth="1" opacity="0.4" />
        ))}

        {/* Axes */}
        <line x1={PAD} x2={W - PAD} y1={xAxisY} y2={xAxisY} stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" />
        <line x1={yAxisX} x2={yAxisX} y1={PAD} y2={H - PAD} stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" />

        {/* Tick labels */}
        {xTicks.map((t) => (
          <text key={`xl${t}`} x={sx(t)} y={xAxisY + 14} textAnchor="middle"
            className="fill-muted-foreground" fontSize="9" fontFamily="monospace">{t}</text>
        ))}
        {yTicks.map((t) => (
          <text key={`yl${t}`} x={yAxisX - 6} y={sy(t) + 3} textAnchor="end"
            className="fill-muted-foreground" fontSize="9" fontFamily="monospace">{t}</text>
        ))}
        <text x={yAxisX + 4} y={xAxisY - 4} className="fill-muted-foreground" fontSize="9" fontFamily="monospace">0</text>

        {/* Curves */}
        {curves.map((c, i) =>
          c.error ? null : (
            <path key={i} d={c.path} fill="none" stroke={c.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          )
        )}

        {/* Points */}
        {(spec.points || []).map((p, i) => (
          <g key={`pt${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill="currentColor" className="text-foreground" />
            {p.label && (
              <text x={sx(p.x) + 6} y={sy(p.y) - 6} fontSize="10" fontFamily="monospace" className="fill-foreground">{p.label}</text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 px-1">
        {curves.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full inline-block flex-shrink-0" style={{ background: c.error ? "#999" : c.color }} />
            {c.error ? `${c.label || c.expr} (invalid expression)` : (c.label || `y = ${c.expr}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FunctionGraphBlock({ spec }: { spec: string }) {
  let parsed: GraphSpec | null = null;
  try {
    parsed = JSON.parse(spec);
  } catch {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed.functions) || parsed.functions.length === 0) {
    return (
      <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">
        {spec}
      </code>
    );
  }
  return <FunctionGraph spec={parsed} />;
}
