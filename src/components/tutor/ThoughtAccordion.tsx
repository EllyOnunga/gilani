import React, { useEffect, useState } from "react";
import { Brain, ChevronDown, Check, Zap, BookOpen, Lightbulb, Globe, Pencil } from "lucide-react";

interface ThoughtAccordionProps {
  messageId: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  messageText: string;
}

const STEPS = [
  { icon: BookOpen,   label: "Retrieving study context",          detail: "Aligning explanation with notes context" },
  { icon: Globe,      label: "Retrieving your study notes",       detail: "Scanning uploaded documents for context" },
  { icon: Brain,      label: "Reasoning through the concept",     detail: "Building a clear, step-by-step explanation" },
  { icon: Lightbulb,  label: "Finding real-world illustrations",  detail: "Connecting theory to Kenyan everyday examples" },
  { icon: Pencil,     label: "Composing the response",            detail: "Structuring the answer for clarity" },
];

export function ThoughtAccordion({
  messageId,
  isLastMessage,
  isStreaming,
  messageText,
}: ThoughtAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  const isThinking = isStreaming && isLastMessage && messageText.trim() === "";
  const isDone     = !isThinking && messageText.trim() !== "";

  // Timer while thinking
  useEffect(() => {
    if (!isThinking) return;
    setIsOpen(true);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [isThinking]);

  // Lock duration when done
  useEffect(() => {
    if (isDone && doneAt === null && elapsed > 0) {
      setDoneAt(elapsed);
      // Auto-collapse after a short pause
      const t = setTimeout(() => setIsOpen(false), 900);
      return () => clearTimeout(t);
    }
  }, [isDone, doneAt, elapsed]);

  const displaySeconds = doneAt ?? elapsed;

  // Deterministic duration for historical messages
  const historicalSeconds = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < messageId.length; i++) h = messageId.charCodeAt(i) + ((h << 5) - h);
    return Math.abs((h % 5) + 3);
  }, [messageId]);

  const shownSeconds = (isThinking || isDone) ? displaySeconds : historicalSeconds;
  const activeStep   = Math.min(Math.floor(shownSeconds / 1.5), STEPS.length - 1);
  const completedAll = isDone || (!isThinking && !isStreaming);

  return (
    <div className={`rounded-xl border transition-all duration-300 mb-2 overflow-hidden ${isThinking ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"}`}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-black/5"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary/80" />
            </span>
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary/60" />
          )}
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            {isThinking
              ? `Thinking… ${shownSeconds}s`
              : `Thought process · ${shownSeconds}s`}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? `${STEPS.length * 56 + 16}px` : "0px" }}
      >
        <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-1">
          {STEPS.map((step, i) => {
            const done    = completedAll || i < activeStep;
            const active  = isThinking && i === activeStep;
            const pending = !done && !active;
            const Icon    = step.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-300 ${
                  active  ? "bg-primary/10" :
                  done    ? "opacity-60" :
                  pending ? "opacity-30" : ""
                }`}
              >
                <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                  done   ? "bg-primary/20 text-primary" :
                  active ? "bg-primary text-primary-foreground" :
                           "bg-border text-muted-foreground"
                }`}>
                  {done
                    ? <Check className="h-2.5 w-2.5" />
                    : active
                      ? <Zap className="h-2.5 w-2.5" />
                      : <Icon className="h-2.5 w-2.5" />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`font-mono text-[10px] font-bold uppercase tracking-wider leading-tight ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {(active || done) && (
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">{step.detail}</p>
                  )}
                </div>
                {active && (
                  <div className="ml-auto flex gap-0.5 items-center mt-1">
                    {[0,1,2].map((d) => (
                      <span key={d} className="h-1 w-1 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
