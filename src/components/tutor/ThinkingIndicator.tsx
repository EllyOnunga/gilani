import React from "react";

interface ThinkingIndicatorProps {
  show: boolean;
}

export const ThinkingIndicator = React.memo(function ThinkingIndicator({ show }: ThinkingIndicatorProps) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 py-2 animate-in fade-in duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dancing-dots {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          50% {
            transform: translateY(-9px);
            opacity: 1;
          }
        }
        .animate-dancing-dot {
          animation: dancing-dots 0.75s infinite ease-in-out;
        }
      `}} />
      <span className="text-xs font-bold uppercase tracking-wider text-primary/80 mr-1 animate-pulse">
        Thinking
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-2.5 h-2.5 rounded-full bg-primary/95 animate-dancing-dot shadow-[0_0_8px_rgba(249,115,22,0.45)]"
          style={{ animationDelay: `${i * 0.13}s` }}
        />
      ))}
    </div>
  );
});

