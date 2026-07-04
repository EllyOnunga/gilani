import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar } from "@/components/maths";

interface Props {
    block: DocumentBlock;
}

export default function FreeBodyDiagram({ block }: Props) {
    const data = block.content || "";
    
    return (
        <section className="my-6 overflow-hidden rounded-xl border border-indigo-600 bg-zinc-900/50">
            <EquationToolbar title="Free Body Diagram" />
            <div className="p-8 flex items-center justify-center text-zinc-500 italic">
                {/* Placeholder for physics drawing canvas */}
                [FBD: {data}]
            </div>
        </section>
    );
}
