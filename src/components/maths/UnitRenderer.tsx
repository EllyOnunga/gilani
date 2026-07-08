import MathBlock from "./MathBlock";
import EquationToolbar from "./EquationToolbar";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function UnitRenderer({ block }: Props) {
  let content = (block.data as any)?.latex || block.content || "";

  // Ensure it's wrapped in siunitx \SI or \pu macro (or standard math)
  if (!content.includes("\\SI") && !content.includes("\\pu")) {
    content = `\\mathrm{${content}}`;
  }

  const customBlock: DocumentBlock = {
    ...block,
    content,
    data: { ...((block.data as any) || {}), latex: content },
  };

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title="Units" />
      <MathBlock block={customBlock} />
    </section>
  );
}
