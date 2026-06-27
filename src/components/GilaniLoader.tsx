import { useEffect, useState } from "react";

export function GilaniLoader({ fullScreen = true }: { fullScreen?: boolean } = {}) {
  const [phase, setPhase] = useState(0); // 0: line grows, 1: pause, 2: shrink, 3: reset

  useEffect(() => {
    const durations = [900, 400, 300, 300];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 4), durations[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const lineWidth = phase === 0 ? "100%" : phase === 1 ? "100%" : "0%";
  const opacity = phase === 3 ? 0 : 1;

  return (
    <div
      className={`flex flex-col items-center justify-center bg-background select-none gap-6 ${fullScreen ? "min-h-screen" : "py-12 sm:py-16"}`}
    >
      <div
        style={{ opacity, transition: "opacity 0.3s ease" }}
        className="flex items-baseline gap-px"
      >
        <span className="font-serif font-black text-3xl sm:text-4xl tracking-tight text-foreground">
          Gilani
        </span>
        <span className="font-serif font-black text-3xl sm:text-4xl tracking-tight text-primary">
          AI
        </span>
      </div>

      <div className="w-24 h-px bg-border overflow-hidden rounded-full">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: lineWidth,
            transition:
              phase === 0
                ? "width 0.9s cubic-bezier(0.4,0,0.2,1)"
                : phase === 2
                  ? "width 0.3s ease-in"
                  : "none",
          }}
        />
      </div>
    </div>
  );
}
