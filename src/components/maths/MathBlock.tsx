import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function MathBlock({ block }: Props) {
  let latex = (block.data as any)?.latex || block.content || "";

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

  // Auto-wrap multi-line equations in aligned environment if not already wrapped
  if (latex.includes("\n") && !latex.match(/\\begin\{.*?\}/)) {
    latex = `\\begin{aligned}\n${latex
      .split("\n")
      .filter((l: string) => l.trim())
      .join(" \\\\\n")}\n\\end{aligned}`;
  }

  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
    macros,
    strict: "ignore",
  });

  return (
    <section
      className="
                my-6
                w-full
                max-w-full
                overflow-x-auto
                overflow-y-hidden
                py-2
                text-lg
            "
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
