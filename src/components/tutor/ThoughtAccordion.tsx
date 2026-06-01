import React, { useEffect, useMemo, useState } from "react";
import { Brain, ChevronUp, Loader2 } from "lucide-react";

interface ThoughtAccordionProps {
  messageId: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  messageText: string;
}

export function ThoughtAccordion({
  messageId,
  isLastMessage,
  isStreaming,
  messageText,
}: ThoughtAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  const steps = [
    "Consulting Kenyan national curriculum standards...",
    "Reviewing context from your uploaded study notes...",
    "Brainstorming relevant real-world illustrations...",
    "Structuring step-by-step Socratic pedagogical guidance...",
    "Polishing primary English and secondary Swahili definitions...",
  ];

  const historicalDuration = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash = messageId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs((hash % 5) + 3);
  }, [messageId]);

  useEffect(() => {
    if (!isStreaming || !isLastMessage) return;
    if (messageText.trim() !== "") {
      if (!hasStartedGenerating) {
        setHasStartedGenerating(true);
        setFinalDuration(seconds || 1);
        setIsOpen(false);
      }
      return;
    }
    setIsOpen(true);
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming, isLastMessage, messageText, hasStartedGenerating, seconds]);

  const duration =
    finalDuration !== null
      ? finalDuration
      : isStreaming && isLastMessage && !hasStartedGenerating
        ? seconds
        : historicalDuration;

  const activeStepIdx = Math.min(Math.floor(duration / 1.5), steps.length - 1);
  const isThinking = isStreaming && isLastMessage && !hasStartedGenerating;

  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-3 my-1.5 w-full select-none transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-sans text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary/70" />
          )}
          <span className="font-semibold uppercase tracking-wider font-mono text-[9px]">
            {isThinking ? `Thinking process (${duration}s...)` : `Thought process (${duration}s)`}
          </span>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-300 ${
            isOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-3 border-t border-border/40 pt-2.5 font-mono text-[10px] text-muted-foreground/80 space-y-2 animate-in-slide">
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const completed = idx < activeStepIdx;
              const active = idx === activeStepIdx && isThinking;
              let statusSymbol = "•";
              if (completed) statusSymbol = "✓";
              else if (active) statusSymbol = "⚡";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 transition-colors duration-300 ${
                    completed ? "text-primary/70 font-semibold" : ""
                  } ${active ? "text-primary animate-pulse font-bold" : ""}`}
                >
                  <span className="w-3 flex-shrink-0 text-center">{statusSymbol}</span>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
