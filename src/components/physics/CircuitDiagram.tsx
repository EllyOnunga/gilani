import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar } from "@/components/maths";

interface Props {
    block: DocumentBlock;
}

export default function CircuitDiagram({ block }: Props) {
    const data = block.content || "";
    
    return (
        <section className="my-6 overflow-hidden rounded-xl border border-amber-600 bg-zinc-900/50">
            <EquationToolbar title="Circuit Diagram" />
            <div className="p-8 flex items-center justify-center text-zinc-500 italic">
                {/* Placeholder for circuit rendering canvas */}
                [Circuit: {data}]
            </div>
        </section>
    );
}
