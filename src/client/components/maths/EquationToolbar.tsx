import { Sigma } from "lucide-react";

interface Props {
  title?: string;
}

export default function EquationToolbar({ title }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sigma size={14} />
        <span className="text-xs font-medium uppercase tracking-wide">{title ?? "Equation"}</span>
      </div>
    </div>
  );
}
