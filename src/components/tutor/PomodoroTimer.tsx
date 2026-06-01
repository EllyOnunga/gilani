import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { toast } from "sonner";

export function PomodoroTimer() {
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"study" | "break">("study");
  const [timerOpen, setTimerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s > 0) return s - 1;
        setTimerMinutes((m) => {
          if (m > 0) return m - 1;
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          if (timerMode === "study") {
            toast.success("🎉 Study session complete! Take a 5-minute break.", { duration: 6000 });
            setTimerMode("break");
            setTimerMinutes(5);
            setTimerSeconds(0);
          } else {
            toast.success("⏰ Break over! Time to study.", { duration: 6000 });
            setTimerMode("study");
            setTimerMinutes(25);
            setTimerSeconds(0);
          }
          return 0;
        });
        return 59;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerMode("study");
    setTimerMinutes(25);
    setTimerSeconds(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setTimerOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
          timerRunning
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-accent"
        }`}
        title="Pomodoro Study Timer"
      >
        <Timer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {timerRunning
            ? `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`
            : "Timer"}
        </span>
        {timerRunning && (
          <span className="sm:hidden">
            {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
          </span>
        )}
      </button>
      {timerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTimerOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {timerMode === "study" ? "📚 Study Session" : "☕ Break Time"}
              </p>
              <p className="font-serif text-3xl font-bold text-center mt-2 text-primary">
                {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
              </p>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    timerRunning ? pauseTimer() : startTimer();
                  }}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={resetTimer}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-accent transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[15, 25, 45].map((min) => (
                  <button
                    key={min}
                    onClick={() => {
                      resetTimer();
                      setTimerMinutes(min);
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                      timerMinutes === min && !timerRunning
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
