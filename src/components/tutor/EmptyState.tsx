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
    <div className="flex flex-col items-center justify-center h-full px-4 py-3 text-center">
      <div className="mb-3">
        <div className="mx-auto h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <span className="text-xl">🎓</span>
        </div>
        <h3 className="font-serif text-base font-bold text-foreground mb-1">
          Welcome to GilaniAI Tutor
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Your personal AI study assistant. Ask any question and get step-by-step guidance.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Try asking...
        </p>
        <div className="flex flex-col gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptClick(prompt)}
              className="text-left rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 active:bg-accent transition-all leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
