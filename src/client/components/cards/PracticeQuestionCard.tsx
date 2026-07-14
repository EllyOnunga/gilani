import { CircleHelp } from "lucide-react";
import { useState } from "react";

interface Props {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export default function PracticeQuestionCard({ question, answer }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <section className="my-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
        <CircleHelp className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Try Yourself
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div className="text-sm text-foreground leading-relaxed">{question}</div>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60"
        >
          {showAnswer ? "Hide Answer" : "Reveal Answer"}
        </button>
        {showAnswer && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-foreground leading-relaxed">
            {answer}
          </div>
        )}
      </div>
    </section>
  );
}
