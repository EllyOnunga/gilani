import MathBlock from "./MathBlock";
import EquationToolbar from "./EquationToolbar";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
    block: DocumentBlock;
}

export default function MatrixRenderer({ block }: Props) {
    let content = (block.data as any)?.latex || block.content || "";
    
    // Ensure it's wrapped in a matrix environment if it looks like raw rows.
    if (!content.includes("\\begin{bmatrix}") && !content.includes("\\begin{pmatrix}")) {
        content = `\\begin{bmatrix} ${content} \\end{bmatrix}`;
    }

    const customBlock: DocumentBlock = {
        ...block,
        content,
        data: { ...((block.data as any) || {}), latex: content },
    };

    return (
        <section className="my-6 overflow-hidden rounded-xl border border-blue-600">
            <EquationToolbar title="Matrix" />
            <MathBlock block={customBlock} />
        </section>
    );
}
