import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar } from "@/components/maths";

interface Props {
  block: DocumentBlock;
}

export default function MolecularStructure({ block }: Props) {
  const smiles = block.content || "";

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-teal-600 bg-zinc-900/50">
      <EquationToolbar title="Molecular Structure" />
      <div className="p-8 flex items-center justify-center text-zinc-500 italic">
        {/* Placeholder for smiles-drawer or similar 2D rendering canvas */}
        [Molecule: {smiles}]
      </div>
    </section>
  );
}
