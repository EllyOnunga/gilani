import type { DocumentBlock } from "@/client/components/renderer/types/document";
import MathBlock from "./MathBlock";
import EquationToolbar from "./EquationToolbar";

interface Props {
  block: DocumentBlock;
}

export default function FormulaCard({ block }: Props) {
  const formula = (block.data as any)?.latex || block.content || "";
  const explanation = block.metadata?.subject; // fallback to subject for explanation? Or just empty for now until block.data handles it.

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title="Formula" />

      <MathBlock block={block} />

      {explanation && (
        <div className="border-t border-border/40 bg-muted/20 p-5 text-muted-foreground text-sm">
          {explanation}
        </div>
      )}
    </section>
  );
}
