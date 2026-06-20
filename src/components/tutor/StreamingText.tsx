import React, { useEffect, useState, useRef } from "react";

type Props = {
  text: string;
};

export function StreamingText({ text }: Props) {
  // Keep a ref so the interval always reads the latest text without restarting
  const textRef = useRef(text);
  const [displayedText, setDisplayedText] = useState("");
  const displayedRef = useRef("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep the ref in sync on every render
  textRef.current = text;

  // Start the ticker once on mount; stop it on unmount
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const target = textRef.current;
      const current = displayedRef.current;

      if (!target) return;

      // Already caught up
      if (current === target) return;

      // If the text was replaced (edit/regenerate) or current is ahead, snap
      if (current.length > target.length || !target.startsWith(current)) {
        displayedRef.current = target;
        setDisplayedText(target);
        return;
      }

      const gap = target.length - current.length;
      // Adaptive step: catch up faster when far behind (AI streams in bursts)
      let step = 1;
      if (gap > 120) step = 12;
      else if (gap > 60) step = 6;
      else if (gap > 30) step = 3;
      else if (gap > 10) step = 2;

      const next = target.substring(0, current.length + step);
      displayedRef.current = next;
      setDisplayedText(next);
    }, 18); // ~55fps tick — smooth but lightweight

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // intentionally empty — ticker runs for the lifetime of this component

  if (!displayedText) return null;

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
      {displayedText}
      <span
        className="inline-block w-[2px] h-[1.1em] bg-primary opacity-90 ml-0.5 align-text-bottom rounded-full"
        style={{
          animation: "streaming-cursor-blink 0.65s infinite step-start",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes streaming-cursor-blink {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
}
