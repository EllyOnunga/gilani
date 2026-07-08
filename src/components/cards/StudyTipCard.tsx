import { Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function StudyTipCard({ children }: Props) {
  return (
    <section className="my-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Study Tip
        </span>
      </div>
      <div className="p-4 text-sm text-foreground leading-relaxed prose prose-sm max-w-none">
        {children}
      </div>
    </section>
  );
}
