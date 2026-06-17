import { useEffect, useState } from "react";

const TAGLINES = [
  "Preparing your study environment…",
  "Preparing Socratic tutoring guidance…",
  "Analysing your subject focus areas…",
  "Summarising your study documents…",
  "Generating custom practice quizzes…",
  "Connecting to verified teacher portals…",
  "Almost ready for your study session…",
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
    }, 2500);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background select-none overflow-hidden relative">
      {/* Dynamic Background Glowing Blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-3xl transition-opacity duration-1000"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            animation: "pulse 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-violet-500/5 blur-2xl transition-opacity duration-1000"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            animation: "pulse 3s ease-in-out infinite alternate",
          }}
        />
        {/* Subtle champagne accent glow for premium feel */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-400/[0.04] blur-3xl transition-opacity duration-1000"
          style={{
            opacity: phase >= 2 ? 1 : 0,
          }}
        />
      </div>

      {/* Kicker label */}
      <div
        className="mb-3 transition-all duration-700"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
        }}
      >
        <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 text-center">
          AI-Powered Learning
        </p>
      </div>

      {/* Floating Logo Container */}
      <div
        className="relative mb-8 flex justify-center items-center"
        style={{
          transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease",
        }}
      >
        {/* Soft breathing pulse effect */}
        <div className="absolute inset-0 rounded-3xl bg-primary/25 blur-xl animate-pulse" />

        {/* Refined ring accent — replaces bouncing emoji badge */}
        <div
          className="absolute -inset-1.5 rounded-[1.75rem] border border-amber-400/30 transition-opacity duration-1000"
          style={{ opacity: phase >= 2 ? 1 : 0 }}
        />

        <div className="relative flex items-center justify-center bg-card/70 border border-border/80 p-4.5 rounded-3xl shadow-2xl backdrop-blur-md w-24 h-24 hover:scale-105 transition-transform duration-300">
          <img
            src="/gilanilogo.png"
            alt="GilaniAI Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Typing brand text */}
      <div className="relative flex items-baseline gap-0 mb-5">
        <span className="flex items-baseline">
          {WORD1.split("").map((letter, i) => (
            <span
              key={i}
              className={`font-serif font-black text-4xl sm:text-5xl tracking-tight ${phase >= 2 ? "text-shimmer" : "text-foreground dark:text-[hsl(38,30%,96%)]"}`}
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
                className="font-mono font-black text-2.5xl sm:text-3.5xl text-primary"
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
            style={{ animation: "pulse 0.8s step-end infinite", minHeight: "2rem" }}
          />
        )}
      </div>

      {/* Decorative premium divider */}
      <div
        className="h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-6 rounded-full"
        style={{
          width: phase >= 1 ? "180px" : "0px",
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      {/* Curriculum taglines */}
      <div className="min-h-[1.5rem] flex items-center justify-center">
        <p
          className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground/80 text-center px-6 leading-relaxed transition-all duration-300"
          style={{
            opacity: phase === 2 && taglineFade ? 1 : 0,
            transform: phase === 2 && taglineFade ? "translateY(0)" : "translateY(3px)",
          }}
        >
          {TAGLINES[taglineIndex]}
        </p>
      </div>

      {/* Premium progress line — replaces bouncing dots */}
      <div
        className="mt-6 w-32 h-px bg-border/60 rounded-full overflow-hidden relative transition-opacity duration-500"
        style={{ opacity: phase >= 2 ? 1 : 0 }}
      >
        <div className="loader-progress-fill absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>
    </div>
  );
}
