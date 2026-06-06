import React, { useEffect, useState } from "react";

const LETTERS = "GilaniAI".split("");

export function GilaniLoader() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= LETTERS.length) return;
    const timeout = setTimeout(() => {
      setVisibleCount((v) => v + 1);
    }, 120);
    return () => clearTimeout(timeout);
  }, [visibleCount]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex items-end gap-0.5 mb-4">
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            className={`font-serif font-bold text-5xl text-primary transition-all duration-300 ${
              i < visibleCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${i * 30}ms` }}
          >
            {letter}
          </span>
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
        Preparing your experience…
      </p>
    </div>
  );
}
