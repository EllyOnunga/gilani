import { useMemo } from "react";

type Props = {
  text: string;
};

export function StreamingText({ text }: Props) {
  const words = useMemo(() => {
    if (!text) return [];
    return text.match(/(\S+|\s)/g) || [];
  }, [text]);

  if (!text) return null;

  return (
    <div
      className="whitespace-pre-wrap text-sm leading-relaxed"
      style={{ wordBreak: "break-word" }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className="animate-fade-in-word inline-block"
        >
          {word}
        </span>
      ))}
    </div>
  );
}
