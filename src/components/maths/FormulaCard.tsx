import type { DocumentBlock } from "@/components/renderer/types/document";
import MathBlock from "./MathBlock";
import EquationToolbar from "./EquationToolbar";

interface Props {
    block: DocumentBlock;
}

export default function FormulaCard({
    block
}: Props) {
    const formula = (block.data as any)?.latex || block.content || "";
    const explanation = block.metadata?.subject; // fallback to subject for explanation? Or just empty for now until block.data handles it.

    return (

        <section

            className="
my-6
overflow-hidden
rounded-xl
border
border-[#C96A3D]
"

        >

            <EquationToolbar

                title="Formula"

            />

            <MathBlock
                block={block}
            />

            {explanation && (

                <div

                    className="
border-t
border-zinc-800
bg-[#241B17]
p-5
text-zinc-300
"

                >

                    {explanation}

                </div>

            )}

        </section>

    );

}