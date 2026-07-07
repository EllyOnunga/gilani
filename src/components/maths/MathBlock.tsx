import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
    block: DocumentBlock;
}

export default function MathBlock({
    block
}: Props) {
    const latex = (block.data as any)?.latex || block.content || "";
    const macros = {
        "\\vec": "\\overrightarrow{#1}",
        "\\unit": "\\mathrm{#1}",
        "\\degree": "^\\circ",
        "\\mol": "\\mathrm{mol}",
        "\\kJ": "\\mathrm{kJ}",
        "\\atm": "\\mathrm{atm}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\R": "\\mathbb{R}",
        "\\C": "\\mathbb{C}",
        "\\diff": "\\mathrm{d}",
        "\\pdiff": "\\partial",
    };

    const html = katex.renderToString(
        latex,
        {
            throwOnError: false,
            displayMode: true,
            macros,
            strict: "ignore",
        }
    );

    return (

        <section
            className="
                my-6
                max-w-full
                overflow-x-auto
                overflow-y-hidden
                rounded-xl
                border
                border-zinc-800
                bg-zinc-900
                p-6
            "
        >

            <div

                dangerouslySetInnerHTML={{

                    __html: html

                }}

            />

        </section>

    );

}