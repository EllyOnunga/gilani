import { BookOpen } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function DefinitionCard({ children }: Props) {
  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-[#C96A3D]/30 bg-[#241B17]">
      <div className="flex items-center gap-2 border-b border-[#C96A3D]/20 bg-[#2D201A] px-5 py-3">
        <BookOpen size={18} className="text-[#E28743]" />

        <span className="font-semibold text-[#E28743]">Definition</span>
      </div>

      <div className="p-5 leading-8 text-zinc-200">{children}</div>
    </section>
  );
}
