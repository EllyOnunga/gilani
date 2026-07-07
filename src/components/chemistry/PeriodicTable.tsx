import type { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function PeriodicTable({ block }: Props) {
  const element = block.content || "H";
  return (
    <div className="inline-flex flex-col items-center justify-center p-4 border border-zinc-700 rounded-lg bg-zinc-800 m-2 w-24 h-24">
      <span className="text-xs text-zinc-400">1</span>
      <strong className="text-2xl text-white">{element}</strong>
      <span className="text-[10px] text-zinc-500 truncate w-full text-center">Hydrogen</span>
    </div>
  );
}
