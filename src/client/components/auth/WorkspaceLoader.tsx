import { useState, useEffect } from "react";
import { Logo } from "@/client/components/ui/logo";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { label: "Loading AI", delay: 300 },
  { label: "Syncing profile", delay: 700 },
  { label: "Ready", delay: 1100 },
];

export function WorkspaceLoader() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const timers = STEPS.map((step, i) =>
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
      }, step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d0f18] gap-8">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C96A3D]/5 via-transparent to-[#C96A3D]/3 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <Logo size="md" className="opacity-90" />

        <p className="text-white/50 text-sm font-medium tracking-wide">
          Preparing your workspace...
        </p>

        <div className="flex flex-col gap-3 min-w-[200px]">
          {STEPS.map((step, i) => {
            const done = completedSteps.includes(i);
            const active = !done && completedSteps.length === i;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  done || active ? "opacity-100" : "opacity-20"
                }`}
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    done
                      ? "bg-[#C96A3D] text-white"
                      : active
                        ? "border border-white/20 bg-white/5"
                        : "border border-white/10"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white/40" />
                  ) : null}
                </div>
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    done ? "text-white" : active ? "text-white/60" : "text-white/25"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
