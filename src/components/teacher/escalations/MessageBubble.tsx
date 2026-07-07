import { Suspense, lazy } from "react";
import { User } from "lucide-react";

const MarkdownRenderer = lazy(() =>
  import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
);

export function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  const isTeacherReview = msg.content?.startsWith("👨‍🏫 **Teacher Review:**");

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span
        className={`font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 ${isUser ? "text-primary/70" : isTeacherReview ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
      >
        <User className="h-2.5 w-2.5" />
        {isUser ? "Student" : isTeacherReview ? "Teacher Review" : "GilaniAI"}
        {msg.created_at && (
          <span className="text-[8px] opacity-60 ml-1">
            {new Date(msg.created_at).toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </span>
      <div
        className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed prose-compact ${isUser ? "bg-primary/10 text-foreground rounded-tr-sm" : isTeacherReview ? "bg-green-50/60 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60 text-foreground rounded-tl-sm" : "bg-card border border-border text-foreground rounded-tl-sm"}`}
      >
        <Suspense
          fallback={
            <span className="text-xs text-muted-foreground">
              {isTeacherReview
                ? msg.content.replace(/^👨‍🏫 \*\*Teacher Review:\*\*\n?/, "")
                : msg.content}
            </span>
          }
        >
          <MarkdownRenderer
            content={
              isTeacherReview
                ? msg.content.replace(/^👨‍🏫 \*\*Teacher Review:\*\*\n?/, "")
                : msg.content
            }
            className="text-xs"
          />
        </Suspense>
      </div>
    </div>
  );
}
