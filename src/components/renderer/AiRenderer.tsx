import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load heavy markdown libraries to massively reduce initial bundle size
const MarkdownRenderer = lazy(() =>
  import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
);
const SmoothMarkdownRenderer = lazy(() =>
  import("@/components/tutor/SmoothMarkdownRenderer").then((m) => ({
    default: m.SmoothMarkdownRenderer,
  })),
);

interface Props {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export default function AiRenderer({ content, isStreaming = false, className }: Props) {
  return (
    <div className="w-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-8 items-center">
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          </div>
        }
      >
        {isStreaming ? (
          <SmoothMarkdownRenderer
            content={content}
            isStreaming={isStreaming}
            className={className}
          />
        ) : (
          <MarkdownRenderer content={content} isStreaming={false} className={className} />
        )}
      </Suspense>
    </div>
  );
}
