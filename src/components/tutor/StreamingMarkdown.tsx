import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = { content: string; isStreaming: boolean };

export const StreamingMarkdown = React.memo(function StreamingMarkdown({
  content,
  isStreaming,
}: Props) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (!isStreaming && content) {
      // Small delay lets React flush the render before triggering animation
      const t = setTimeout(() => setShow(true), 30);
      return () => clearTimeout(t);
    }
    if (isStreaming) setShow(false);
  }, [isStreaming, content]);

  if (isStreaming || !content) return null;

  return (
    <div
      className="transition-opacity duration-500"
      style={{ opacity: show ? 1 : 0 }}
    >
      <MarkdownRenderer content={content} />
    </div>
  );
});
