import React from "react";

interface ThinkingIndicatorProps {
  show: boolean;
}

export const ThinkingIndicator = React.memo(function ThinkingIndicator({ show }: ThinkingIndicatorProps) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 mb-2 animate-in fade-in duration-300">
      <span className="font-mono text-[11px] text-muted-foreground">Gilani Thinking</span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full bg-primary"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
});
