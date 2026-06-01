import React from "react";

const STARTER_PROMPTS = [
  "Explain Newton's laws of motion with examples",
  "Help me understand photosynthesis step by step",
  "What are the causes of World War I?",
  "Solve a quadratic equation with me",
  "Explain the water cycle",
  "Help me understand cell division",
];

type Props = {
  onPromptClick: (prompt: string) => void;
};

export function EmptyState({ onPromptClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
      <div className="mb-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-3xl">🎓</span>
        </div>
        <h3 className="font-serif text-xl font-bold text-foreground mb-1">
          Welcome to GilaniAI Tutor
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Your personal KCSE/CBC study assistant. Ask any question about your
          curriculum and get step-by-step guidance.
        </p>
      </div>

      {/* Starter prompts */}
      <div className="w-full max-w-lg">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Try asking...
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptClick(prompt)}
              className="text-left rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/30 transition-all leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}