import { useEffect, useState } from "react";
import { Menu, Timer } from "lucide-react";

type Props = {
  title: string;
  threadId: string;
};

type TimerState = { minutes: number; seconds: number; running: boolean };

export function ChatHeader({
  title,
  className,
}: Props & { className?: string }) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { minutes, seconds, running } = (e as CustomEvent).detail as TimerState;
      setTimerState(running ? { minutes, seconds, running } : null);
    };
    window.addEventListener("pomodoro:tick", handler);
    return () => window.removeEventListener("pomodoro:tick", handler);
  }, []);

  return (
    <div className={`flex items-center justify-between border-b border-border bg-card px-3 sm:px-5 py-2.5 gap-2 min-w-0 ${className ?? ""}`}>
      {/* Left: menu toggle + timer (if running) */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("custom:open-sidebar"))}
          className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground flex-shrink-0"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {timerState ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-primary flex-shrink-0">
            <Timer className="h-3 w-3 animate-pulse" />
            <span className="font-mono">
              {String(timerState.minutes).padStart(2, "0")}:{String(timerState.seconds).padStart(2, "0")}
            </span>
          </div>
        ) : null}

        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate leading-tight">{title || "New session"}</h2>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 hidden sm:block">
            Socratic Study Session
          </p>
        </div>
      </div>
    </div>
  );
}
