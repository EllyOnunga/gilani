import type { DocumentBlock } from "@/components/renderer/types/document";
import { EquationToolbar, MathBlock } from "@/components/maths";

interface Props {
    block: DocumentBlock;
}

export default function KinematicsEquation({ block }: Props) {
    const equation = block.content || "";
    
    const customBlock: DocumentBlock = {
        ...block,
        content: equation,
        data: { ...((block.data as any) || {}), latex: equation },
    };

    return (
        <section className="my-6 overflow-hidden rounded-xl border border-sky-600">
            <EquationToolbar title="Kinematics Equation" />
            <MathBlock block={customBlock} />
            {block.metadata?.subject && (
                <div className="border-t border-zinc-800 bg-[#161a22] p-4 text-xs text-zinc-400">
                    {block.metadata.subject}
                </div>
            )}
        </section>
    );
}
