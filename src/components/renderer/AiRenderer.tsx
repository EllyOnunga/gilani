import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";
import { SmoothMarkdownRenderer } from "@/components/tutor/SmoothMarkdownRenderer";

interface Props {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * AiRenderer — thin wrapper used by the renderer pipeline.
 *
 * - During active streaming: SmoothMarkdownRenderer buffers tokens for a
 *   smooth visual reveal, passing `isStreaming` so incomplete math/chem
 *   expressions are rendered as plain text rather than error boxes.
 * - When streaming is done (or for saved messages): MarkdownRenderer
 *   renders the full, final content immediately.
 */
export default function AiRenderer({ content, isStreaming = false, className }: Props) {
  return (
    <div className="w-full overflow-hidden">
      {isStreaming ? (
        <SmoothMarkdownRenderer content={content} isStreaming={isStreaming} className={className} />
      ) : (
        <MarkdownRenderer content={content} isStreaming={false} className={className} />
      )}
    </div>
  );
}
