import React, { useEffect, useState, useRef } from "react";

type Props = {
  text: string;
};

export function StreamingText({ text }: Props) {
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev === text) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }

        // If current text length is longer than the target, snap to target
        if (prev.length > text.length || !text.startsWith(prev)) {
          return text;
        }

        const gap = text.length - prev.length;
        // Dynamically type more characters per tick if the AI stream goes faster
        let step = 1;
        if (gap > 80) step = 8;
        else if (gap > 40) step = 4;
        else if (gap > 15) step = 2;

        return text.substring(0, prev.length + step);
      });
    }, 20);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  if (!displayedText) return null;

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
      {displayedText}
      <span
        className="inline-block w-1.5 h-[1.15em] bg-primary opacity-85 ml-0.5 align-text-bottom"
        style={{
          animation: "streaming-cursor-blink 0.75s infinite step-start",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes streaming-cursor-blink {
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
}

