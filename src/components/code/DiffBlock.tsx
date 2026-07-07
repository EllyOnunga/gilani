import type { DocumentBlock } from "@/components/renderer/types/document";
import CodeToolbar from "./CodeToolbar";

interface Props {
  block: DocumentBlock;
}

export default function DiffBlock({ block }: Props) {
  const lines = (block.content || "").split("\n");

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117]">
      <CodeToolbar language="diff" fileName={block.metadata?.fileName} code={block.content || ""} />
      <div className="overflow-auto bg-[#0d1117] font-mono text-[13px] leading-relaxed py-4">
        {lines.map((line, i) => {
          const isAdd = line.startsWith("+");
          const isSub = line.startsWith("-");
          return (
            <div
              key={i}
              className={`px-4 whitespace-pre ${isAdd ? "bg-emerald-900/20 text-emerald-300" : isSub ? "bg-red-900/20 text-red-300" : "text-zinc-300"}`}
            >
              <span className="inline-block w-4 mr-2 select-none opacity-50">
                {isAdd ? "+" : isSub ? "-" : " "}
              </span>
              {isAdd || isSub ? line.substring(1) : line}
            </div>
          );
        })}
      </div>
    </section>
  );
}
