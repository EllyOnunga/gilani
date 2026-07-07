import { DocumentBlock } from "@/components/renderer/types/document";
import { Quote } from "lucide-react";

interface Props {
  block: DocumentBlock;
}

export default function Blockquote({ block }: Props) {
  return (
    <aside
      className="
        my-6
        rounded-xl
        border-l-4
        border-[#C96A3D]
        bg-[#2B211C]
        p-5
      "
    >
      <div className="mb-3 flex items-center gap-2 text-[#E28743]">
        <Quote size={18} />
        <span className="font-semibold">Note</span>
      </div>

      <p className="leading-8 text-zinc-300">{block.content}</p>
    </aside>
  );
}
