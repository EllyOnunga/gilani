import React from "react";

interface ThinkingIndicatorProps {
  show: boolean;
}

export const ThinkingIndicator = React.memo(function ThinkingIndicator({ show }: ThinkingIndicatorProps) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-1.5 py-1 animate-in fade-in duration-300">
      <span className="text-sm text-primary font-medium">Thinking</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
});
