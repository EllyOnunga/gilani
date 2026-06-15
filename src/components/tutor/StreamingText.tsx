import { useMemo, useRef } from "react";

type Props = {
  text: string;
};

export function StreamingText({ text }: Props) {
  const prevWordsRef = useRef<string[]>([]);

  const words = useMemo(() => {
    if (!text) return [];
    return text.match(/(\S+|\s)/g) || [];
  }, [text]);

  // Track which indices are new vs already rendered
  const prevLen = prevWordsRef.current.length;
  prevWordsRef.current = words;

  if (!text) return null;

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-relaxed"
      style={{ wordBreak: "break-word" }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className={index >= prevLen ? "animate-fade-in-word inline" : "inline"}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
