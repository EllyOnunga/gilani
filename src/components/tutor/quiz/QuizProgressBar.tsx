interface QuizProgressBarProps {
    current: number; // 0-indexed current question
    total: number;
}

export function QuizProgressBar({ current, total }: QuizProgressBarProps) {
    const pct = Math.min(100, Math.round((current / Math.max(1, total)) * 100));
    return (
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}