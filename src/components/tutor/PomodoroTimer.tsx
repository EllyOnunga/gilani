import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function PomodoroTimer({ open, onOpenChange, showTrigger = true }: Props) {
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"study" | "break">("study");

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const timerOpen = isControlled ? open : internalOpen;
  const setTimerOpen = isControlled ? onOpenChange : setInternalOpen;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dispatchTick = (minutes: number, seconds: number, running: boolean) => {
    window.dispatchEvent(
      new CustomEvent("pomodoro:tick", { detail: { minutes, seconds, running } }),
    );
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s > 0) {
          const newS = s - 1;
          setTimerMinutes((m) => {
            dispatchTick(m, newS, true);
            return m;
          });
          return newS;
        }
        setTimerMinutes((m) => {
          if (m > 0) {
            dispatchTick(m - 1, 59, true);
            return m - 1;
          }
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          if (timerMode === "study") {
            toast.success("🎉 Study session complete! Take a 5-minute break.", { duration: 6000 });
            setTimerMode("break");
            setTimerMinutes(5);
            setTimerSeconds(0);
            dispatchTick(5, 0, false);
          } else {
            toast.success("⏰ Break over! Time to study.", { duration: 6000 });
            setTimerMode("study");
            setTimerMinutes(25);
            setTimerSeconds(0);
            dispatchTick(25, 0, false);
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
    dispatchTick(timerMinutes, timerSeconds, false);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerMode("study");
    setTimerMinutes(25);
    setTimerSeconds(0);
    dispatchTick(25, 0, false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <>
      {showTrigger && (
        <button
          onClick={() => setTimerOpen?.(true)}
          className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
            timerRunning
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-accent"
          }`}
          title="Pomodoro Study Timer"
        >
          <Timer className="h-3.5 w-3.5" />
          <span>
            {timerRunning
              ? `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`
              : "Timer"}
          </span>
        </button>
      )}

      <Dialog open={timerOpen} onOpenChange={setTimerOpen}>
        <DialogContent className="max-w-[300px] rounded-2xl p-5 gap-4 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center">
              {timerMode === "study" ? "📚 Study Session" : "☕ Break Time"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <p className="font-serif text-5xl font-bold text-center my-2 text-primary font-mono tracking-wider">
              {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
            </p>
          </div>
          <div className="space-y-3">
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
                    setTimerSeconds(0);
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
        </DialogContent>
      </Dialog>
    </>
  );
}
