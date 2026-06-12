import { useEffect, useState } from "react";

const TAGLINES = [
  "Grounding in KCSE, CBC & IGCSE syllabi…",
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
        
        <div className="relative flex items-center justify-center bg-card/70 border border-border/80 p-4.5 rounded-3xl shadow-2xl backdrop-blur-md w-24 h-24 hover:scale-105 transition-transform duration-300">
          <img
            src="/gilanilogo.png"
            alt="GilaniAI Logo"
            className="h-16 w-auto object-contain"
          />
          {/* Sparkles micro-badge */}
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-lg animate-bounce">
            ✨
          </span>
        </div>
      </div>

      {/* Typing brand text */}
      <div className="relative flex items-baseline gap-0 mb-5">
        <span className="flex items-baseline">
          {WORD1.split("").map((letter, i) => (
            <span
              key={i}
              className="font-serif font-black text-4xl sm:text-5xl text-foreground tracking-tight"
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

      {/* Study status progress dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/70"
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
