import { Check, X } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { MarkdownRenderer } from "@/client/components/tutor/MarkdownRenderer";

export type QuizOptionState =
  | "default"
  | "selected-correct"
  | "selected-incorrect"
  | "reveal-correct"
  | "disabled"
  | "selected"
  | "locked";

interface QuizOptionButtonProps {
  label: string;
  index: number;
  state: QuizOptionState;
  onClick: () => void;
}

const LETTERS = ["A", "B", "C", "D"];

export function QuizOptionButton({ label, index, state, onClick }: QuizOptionButtonProps) {
  const isInteractive = state === "default";

  return (
    <button
      onClick={onClick}
      disabled={!isInteractive}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
        state === "default" &&
          "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
        state === "selected-correct" && "border-emerald-500 bg-emerald-500/10",
        state === "selected-incorrect" && "border-red-500 bg-red-500/10",
        state === "reveal-correct" && "border-emerald-500 bg-emerald-500/5",
        state === "disabled" && "border-border bg-card opacity-60 cursor-not-allowed",
        state === "selected" && "border-primary bg-primary/10",
        state === "locked" && "border-border bg-card opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2",
          state === "default" && "border-border text-muted-foreground",
          state === "selected-correct" && "border-emerald-500 bg-emerald-500 text-white",
          state === "selected-incorrect" && "border-red-500 bg-red-500 text-white",
          state === "reveal-correct" && "border-emerald-500 text-emerald-500",
          state === "disabled" && "border-border text-muted-foreground",
          state === "selected" && "border-primary bg-primary text-primary-foreground",
          state === "locked" && "border-border text-muted-foreground",
        )}
      >
        {state === "selected-correct" || state === "reveal-correct" ? (
          <Check className="h-4 w-4" />
        ) : state === "selected-incorrect" ? (
          <X className="h-4 w-4" />
        ) : (
          LETTERS[index]
        )}
        {/* "selected" (test mode) and "locked" states intentionally fall through to LETTERS[index] above — no correctness icon shown until results. */}
      </span>
      <div className="text-sm font-medium text-foreground prose prose-sm max-w-none [&>p]:m-0">
        <MarkdownRenderer content={label} />
      </div>
    </button>
  );
}
