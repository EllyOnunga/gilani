import React, { useMemo } from "react";

export function ThinkingSweep({ label }: { label?: string }) {
  const text = label || "Thinking...";
  const chars = useMemo(() => text.split(""), [text]);
  const [opacities, setOpacities] = React.useState<number[]>(chars.map(() => 0.25));
  const [arrowSize, setArrowSize] = React.useState(14);
  const [arrowOpacity, setArrowOpacity] = React.useState(0.3);
  const rafRef = React.useRef<number>(0);
  const startRef = React.useRef<number>(0);
  React.useEffect(() => {
    const SWEEP = 800;
    const HOLD = 200;
    const total = chars.length;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) % (SWEEP + HOLD);
      const progress = elapsed / SWEEP;
      const peak = progress * (total + 2);
      setOpacities(
        chars.map((_, i) => {
          const dist = Math.abs(peak - i);
          if (dist < 5) return Math.max(0.55, 0.55 + (1 - dist / 5) * 0.45);
          return 0.55;
        }),
      );
      const arrowDist = Math.abs(peak - total - 1);
      if (arrowDist < 5) {
        const b = Math.max(0, 1 - arrowDist / 5);
        setArrowOpacity(0.5 + b * 0.5);
        setArrowSize(14 + b * 4);
      } else {
        setArrowOpacity(0.5);
        setArrowSize(14);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    startRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [chars]);
  return (
    <span className="select-none mb-3 inline-flex items-center gap-1.5">
      <span
        className="inline-flex"
        style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.04em" }}
      >
        {chars.map((ch, i) => (
          <span
            key={i}
            style={{
              opacity: opacities[i],
              color: "hsl(var(--foreground))",
              transition: "opacity 0.06s ease, color 0.06s ease",
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        ))}
      </span>
      <span
        style={{
          fontSize: arrowSize,
          fontWeight: 800,
          lineHeight: 1,
          color: "hsl(var(--foreground))",
          opacity: arrowOpacity,
          transition: "font-size 0.06s ease, opacity 0.06s ease",
        }}
      >
        ›
      </span>
    </span>
  );
}
