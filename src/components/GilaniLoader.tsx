export function GilaniLoader({ fullScreen = true }: { fullScreen?: boolean } = {}) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background select-none ${
        fullScreen ? "min-h-screen" : "py-12 sm:py-16"
      }`}
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
        {/* Circle border */}
        <div className="absolute inset-0 rounded-full border-4 border-orange-500" />

        {/* Bouncing G */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif font-black text-4xl sm:text-5xl text-orange-500 animate-g-bounce">
            G
          </span>
        </div>
      </div>
    </div>
  );
}
