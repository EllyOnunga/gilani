import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { QuizOptionButton, type QuizOptionState } from "./QuizOptionButton";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";
import type { QuizQuestion } from "@/lib/quiz.server-fns";

interface QuizQuestionCardProps {
    question: QuizQuestion;
    questionNumber: number;
    onAnswer: (selectedIndex: number, correct: boolean) => void;
    /** "practice" reveals correctness + explanation immediately (default). "test" hides both until results. */
    mode?: "practice" | "test";
}

export function QuizQuestionCard({ question, questionNumber, onAnswer, mode = "practice" }: QuizQuestionCardProps) {
    const [selected, setSelected] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        if (selected !== null) return;
        setSelected(index);
        onAnswer(index, index === question.correctIndex);
    };

    const getState = (index: number): QuizOptionState => {
        if (mode === "test") {
            if (selected === null) return "default";
            return index === selected ? "selected" : "locked";
        }
        if (selected === null) return "default";
        if (index === selected && index === question.correctIndex) return "selected-correct";
        if (index === selected) return "selected-incorrect";
        if (index === question.correctIndex) return "reveal-correct";
        return "disabled";
    };

    const isCorrect = selected !== null && selected === question.correctIndex;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                Question {questionNumber}
                <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground normal-case font-medium">
                    {question.difficulty}
                </span>
            </div>
            <div className="text-xl font-bold text-foreground leading-snug prose prose-sm max-w-none [&>p]:m-0 [&>p]:text-xl [&>p]:font-bold [&>p]:text-foreground [&>p]:leading-snug">
                <MarkdownRenderer content={question.question} />
            </div>
            <div className="space-y-3">
                {question.options.map((opt, i) => (
                    <QuizOptionButton
                        key={i}
                        label={opt}
                        index={i}
                        state={getState(i)}
                        onClick={() => handleSelect(i)}
                    />
                ))}
            </div>
            {selected !== null && mode === "practice" && (
                <div
                    className={`p-4 rounded-2xl border ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-foreground">
                        <Lightbulb className="h-4 w-4" />
                        {isCorrect ? "Correct! Here's why:" : "Not quite — here's the explanation:"}
                    </div>
                    <div className="text-sm text-foreground/90 prose prose-sm max-w-none">
                        <MarkdownRenderer content={question.explanation} />
                    </div>
                </div>
            )}
        </div>
    );
}