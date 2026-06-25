import { useEffect, useState } from "react";

export function GilaniLoader({ fullScreen = true }: { fullScreen?: boolean } = {}) {
  const [letterCount, setLetterCount] = useState(0);
  const WORD = "GilaniAI";

  useEffect(() => {
    if (letterCount < WORD.length) {
      const t = setTimeout(() => setLetterCount((c) => c + 1), 55);
      return () => clearTimeout(t);
    }
    // Loop: brief pause once fully typed, then restart the typing animation.
    const resetTimer = setTimeout(() => setLetterCount(0), 900);
    return () => clearTimeout(resetTimer);
  }, [letterCount]);

  const done = letterCount >= WORD.length;

  return (
    <div className={`flex flex-col items-center justify-center bg-background select-none ${fullScreen ? "min-h-screen" : "py-12 sm:py-16"}`}>
      <div className="flex items-baseline">
        {WORD.split("").map((letter, i) => (
          <span
            key={i}
            className="font-serif font-black text-3xl sm:text-4xl text-primary"
            style={{
              opacity: i < letterCount ? 1 : 0,
              transform: i < letterCount ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            {letter}
          </span>
        ))}
        <span className="flex items-center ml-1.5 gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{
                opacity: done ? 1 : 0,
                transition: "opacity 0.3s ease",
                transitionDelay: done ? `${i * 150}ms` : "0ms",
                animation: done ? `bounce 1.2s ease-in-out ${i * 0.2}s infinite` : "none",
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
