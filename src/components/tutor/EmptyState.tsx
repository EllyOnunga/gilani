import React from "react";

const STARTER_PROMPTS = [
  "Explain Newton's laws of motion with examples",
  "Solve a quadratic equation with me",
  "What are the causes of World War I?",
];

type Props = {
  onPromptClick: (prompt: string) => void;
};

export function EmptyState({ onPromptClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 gap-3 text-center">
      <div>
        <div className="mx-auto h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
          <span className="text-lg">🎓</span>
        </div>
        <h3 className="font-serif text-sm font-bold text-foreground mb-0.5">
          GilaniAI Tutor
        </h3>
        <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed">
          Your personal AI study assistant. Ask anything to get started.
        </p>
      </div>

      <div className="w-full max-w-xs">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
          Try asking...
        </p>
        <div className="flex flex-col gap-1.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptClick(prompt)}
              className="text-left rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 active:bg-accent transition-all leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
