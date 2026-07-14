export function GilaniLoader({ fullScreen = true }: { fullScreen?: boolean } = {}) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background select-none ${
        fullScreen ? "min-h-screen" : "py-12 sm:py-16"
      }`}
    >
      {/* Arc spinner */}
      <div className="relative w-14 h-14">
        {/* Track ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden
        >
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border opacity-40"
          />
          {/* Animated arc */}
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="url(#gilani-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="150.796"
            strokeDashoffset="113"
            className="animate-gilani-spin"
            style={{ transformOrigin: "28px 28px" }}
          />
          <defs>
            <linearGradient id="gilani-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(22,96%,45%)" />
              <stop offset="100%" stopColor="hsl(35,95%,62%)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Centre G */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-serif font-black text-xl text-primary animate-gilani-pulse"
            style={{ letterSpacing: "-0.02em" }}
          >
            G
          </span>
        </div>
      </div>

      {/* Label */}
      <p
        className="mt-5 text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground animate-gilani-pulse"
        style={{ animationDelay: "0.15s" }}
      >
        GilaniAI
      </p>
    </div>
  );
}
