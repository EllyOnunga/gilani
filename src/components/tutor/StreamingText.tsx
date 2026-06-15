import { useEffect, useRef, useState, useMemo } from "react";
/**
 * StreamingText — renders streaming tokens smoothly with a word-by-word fade-in.
 * - Splits text into word spans so CSS can animate each independently.
 * - Uses memoization to prevent re-rendering old words.
 * - Throttles updates to prevent main-thread freezing.
 */
const FLUSH_MS = 30;
type Props = {
  text: string;
  isStreaming: boolean;
};
export function StreamingText({ text, isStreaming }: Props) {
  const [displayed, setDisplayed] = useState(text);
  const bufferRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    bufferRef.current = text;
  }, [text]);
  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(bufferRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setDisplayed((prev) => {
        const next = bufferRef.current;
        return next === prev ? prev : next;
      });
    }, FLUSH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);
  const words = useMemo(() => {
    if (!displayed) return [];
    return displayed.match(/(\S+|\s)/g) || [];
  }, [displayed]);
  if (!displayed) return null;
  return (
    <div
      className="whitespace-pre-wrap text-sm leading-relaxed"
      style={{ wordBreak: "break-word" }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className="sd-fade-in inline-block"
        >
          {word}
        </span>
      ))}
    </div>
  );
}
