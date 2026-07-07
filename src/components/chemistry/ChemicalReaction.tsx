import { MathBlock, EquationToolbar } from "@/components/maths";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function ChemicalReaction({ block }: Props) {
  let content = (block.data as any)?.latex || block.content || "";
  if (!content.trim().startsWith("\\ce{")) {
    content = `\\ce{${content}}`;
  }

  const customBlock: DocumentBlock = {
    ...block,
    content,
    data: { ...((block.data as any) || {}), latex: content },
  };

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-emerald-600">
      <EquationToolbar title="Chemical Reaction" />
      <MathBlock block={customBlock} />
    </section>
  );
}
