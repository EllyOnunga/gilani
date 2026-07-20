import { Link } from "@tanstack/react-router";

export default function FinalCTA() {
  return (
    <section className="w-full bg-[#0a0a0a] py-24 relative overflow-hidden border-t border-white/5">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C96A3D]/5 blur-[150px] rounded-full mix-blend-screen opacity-50"></div>

      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-6 text-center relative z-10">
        <h2 className="mb-6 font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your next question deserves a real answer.
        </h2>
        <p className="mb-10 text-lg font-medium text-[#a1a1aa] sm:text-xl max-w-2xl">
          Free to start. No credit card. Works with your curriculum from day one.
        </p>
        <Link
          to="/login"
          search={{ redirect: undefined, signout: undefined }}
          className="rounded-full bg-[#C96A3D] px-10 py-5 text-lg font-bold text-white shadow-[0_0_30px_rgba(201,106,61,0.3)] transition-all hover:scale-105 hover:bg-[#E28743] active:scale-95"
        >
          Join Free
        </Link>
      </div>
    </section>
  );
}
