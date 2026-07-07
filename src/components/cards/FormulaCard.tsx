import { Sigma } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function FormulaCard({ children }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-green-500/30 bg-green-950/20">
      <div className="flex items-center gap-2 border-b border-green-500/20 px-5 py-3">
        <Sigma size={18} className="text-green-400" />

        <span className="font-semibold text-green-300">Formula</span>
      </div>

      <div className="overflow-x-auto p-6 text-center text-2xl">{children}</div>
    </section>
  );
}
