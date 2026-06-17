import React from "react";

type Props = {
  text: string;
};

export const StreamingText = React.memo(function StreamingText({ text }: Props) {
  if (!text) return null;
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
      {text}
    </div>
  );
});
