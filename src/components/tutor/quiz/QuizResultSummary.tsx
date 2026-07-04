import { Trophy, RotateCcw, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import type { QuizQuestion } from "@/lib/quiz.server-fns";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

interface AnsweredQuestion {
    question: QuizQuestion;
    selectedIndex: number;
    correct: boolean;
}

interface QuizResultSummaryProps {
    answered: AnsweredQuestion[];
    onRetryAll: () => void;
    onRetryMissed: () => void;
    onExit: () => void;
}

export function QuizResultSummary({
    answered,
    onRetryAll,
    onRetryMissed,
    onExit,
}: QuizResultSummaryProps) {
    const total = answered.length;
    const correctCount = answered.filter((a) => a.correct).length;
    const score = Math.round((correctCount / Math.max(1, total)) * 100);
    const missed = answered.filter((a) => !a.correct);

    const scoreColor = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-3">
                <div className="h-20 w-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className={`h-10 w-10 ${scoreColor}`} />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
                <p className={`text-4xl font-extrabold ${scoreColor}`}>{score}%</p>
                <p className="text-muted-foreground">
                    {correctCount} out of {total} correct
                </p>
            </div>

            {missed.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="font-semibold text-foreground">Review what you missed</h3>
                    {missed.map((a, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-2">
                            <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="font-medium text-sm text-foreground prose prose-sm max-w-none [&>p]:m-0">
                                    <MarkdownRenderer content={a.question.question} />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                                Correct answer:{" "}
                                <span className="font-medium text-emerald-500">
                                    <span className="prose prose-sm max-w-none [&>p]:inline [&>p]:m-0">
                                        <MarkdownRenderer content={a.question.options[a.question.correctIndex]} />
                                    </span>
                                </span>
                            </p>
                            <div className="text-sm text-foreground/80 pl-6 prose prose-sm max-w-none [&>p]:m-0">
                                <MarkdownRenderer content={a.question.explanation} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 justify-center text-emerald-500 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    Perfect score! You nailed every question.
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                {missed.length > 0 && (
                    <button
                        onClick={onRetryMissed}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-xl font-medium hover:bg-primary/20 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Retry Missed ({missed.length})
                    </button>
                )}
                <button
                    onClick={onRetryAll}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                    <RotateCcw className="h-4 w-4" />
                    Retry Full Quiz
                </button>
                <button
                    onClick={onExit}
                    className="flex-1 flex items-center justify-center gap-2 border border-border px-4 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Quizzes
                </button>
            </div>
        </div>
    );
}