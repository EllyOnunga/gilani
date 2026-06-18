import React from "react";

type Props = {
  text: string;
};

export function StreamingText({ text }: Props) {
  if (!text) return null;
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
      {text}
      <span
        className="inline-block w-[2px] h-[1em] bg-current opacity-70 ml-[1px] align-text-bottom animate-cursor-blink"
      />
    </div>
  );
}
