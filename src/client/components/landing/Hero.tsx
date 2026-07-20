import { Link } from "@tanstack/react-router";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#161210] pt-[88px] pb-20">
      {/* Rich Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C96A3D]/20 blur-[120px] rounded-full mix-blend-screen opacity-60 motion-safe:animate-pulse [animation-duration:8s]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#C96A3D]/10 blur-[150px] rounded-full mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:items-center">
        {/* Left Side: Copy & CTA */}
        <div className="flex flex-1 min-w-0 flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C96A3D]/30 bg-[#C96A3D]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#E28743] backdrop-blur-sm shadow-[0_0_15px_rgba(201,106,61,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C96A3D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C96A3D]"></span>
            </span>
            GilaniAI is Live
          </div>

          <h1 className="font-serif text-5xl font-bold tracking-tight text-white sm:text-6xl xl:text-7xl leading-[1.1] break-words w-full">
            Ace your{" "}
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#C96A3D] to-[#E28743]">
              Exams
            </span>
            , <br className="hidden lg:block" />
            one question at a time.
          </h1>

          <p className="max-w-xl text-lg text-[#a1a1aa] sm:text-xl leading-relaxed font-light">
            GilaniAI doesn't just hand you answers — it teaches you how to find them,{" "}
            <span className="text-white font-semibold">the way a real tutor would.</span>
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              to="/login"
              search={{ redirect: undefined, signout: undefined }}
              className="group relative rounded-full bg-[#C96A3D] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#E28743] hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(201,106,61,0.4)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative">Start for Free</span>
            </Link>
            <a
              href="#demo"
              className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-md"
            >
              Watch Demo
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6 text-sm text-[#a1a1aa]">
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-[#E28743]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Free to start, no credit card required
            </span>
            <span className="text-white/20">·</span>
            <span>Real teacher escalation built in</span>
          </div>
        </div>

        {/* Right Side: Hero Image */}
        <div className="relative flex flex-1 items-center justify-center w-full max-w-lg lg:max-w-none">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(201,106,61,0.5)] overflow-hidden">
            {/* Image Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#C96A3D]/20 to-transparent mix-blend-overlay z-10"></div>

            <img
              src="/hero-library.png"
              alt="Student studying with GilaniAI"
              className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700 ease-out z-0 relative"
            />

            {/* Subtle floating overlay tags */}
            <div className="absolute bottom-6 left-6 z-20 backdrop-blur-md bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C96A3D] animate-pulse"></div>
              <span className="text-sm text-white font-medium">Smart AI Tutor</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
