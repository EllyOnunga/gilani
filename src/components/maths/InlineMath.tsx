import katex from "katex";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
    block: DocumentBlock;
}

export default function InlineMath({
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
            displayMode: false,
            macros,
            strict: "ignore",
        }
    );

    return (

        <span

            dangerouslySetInnerHTML={{

                __html: html

            }}

        />

    );

}