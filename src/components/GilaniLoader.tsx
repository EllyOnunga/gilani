import { useEffect, useState } from "react";

const TAGLINES = [
  "Thinking through your question…",
  "Grounding in your curriculum…",
  "Preparing your session…",
  "Almost ready…",
];

export function GilaniLoader() {
  const [phase, setPhase] = useState(0);
  const [letterCount, setLetterCount] = useState(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglineFade, setTaglineFade] = useState(true);

  const WORD1 = "Gilani";
  const WORD2 = "AI";
  const ALL = WORD1 + WORD2;

  useEffect(() => {
    if (phase !== 0) return;
    if (letterCount < ALL.length) {
      const t = setTimeout(() => setLetterCount((c) => c + 1), 80);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase(1), 200);
      return () => clearTimeout(t);
    }
  }, [phase, letterCount, ALL.length]);

  useEffect(() => {
    if (phase !== 1) return;
    const t = setTimeout(() => setPhase(2), 600);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 2) return;
    const interval = setInterval(() => {
      setTaglineFade(false);
      setTimeout(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        setTaglineFade(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background select-none">
      <div
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)/0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      />

      <div className="relative flex items-baseline gap-0 mb-6">
        <span className="flex items-baseline">
          {WORD1.split("").map((letter, i) => (
            <span
              key={i}
              className="font-serif font-bold text-5xl sm:text-6xl text-foreground"
              style={{
                opacity: i < letterCount ? 1 : 0,
                transform: i < letterCount ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
                transitionDelay: `${i * 20}ms`,
              }}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="flex items-baseline ml-0.5">
          {WORD2.split("").map((letter, i) => {
            const globalIndex = WORD1.length + i;
            return (
              <span
                key={i}
                className="font-mono font-bold text-3xl sm:text-4xl text-primary"
                style={{
                  opacity: globalIndex < letterCount ? 1 : 0,
                  transform: globalIndex < letterCount ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                  transitionDelay: `${globalIndex * 20}ms`,
                  letterSpacing: "0.05em",
                }}
              >
                {letter}
              </span>
            );
          })}
        </span>
        {phase === 0 && (
          <span
            className="ml-1 inline-block w-0.5 bg-primary self-stretch"
            style={{ animation: "pulse 0.8s step-end infinite", minHeight: "2.5rem" }}
          />
        )}
      </div>

      <div
        className="h-px bg-primary/30 mb-6 rounded-full"
        style={{
          width: phase >= 1 ? "180px" : "0px",
          transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <p
        className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-center px-4"
        style={{
          opacity: phase === 2 && taglineFade ? 1 : 0,
          transition: "opacity 0.3s ease",
          minHeight: "1.2em",
        }}
      >
        {TAGLINES[taglineIndex]}
      </p>

      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/50"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: phase >= 2 ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
