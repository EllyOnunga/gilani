import { TriangleAlert } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function WarningCard({ children }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-red-500/30 bg-red-950/20">
      <div className="flex items-center gap-2 border-b border-red-500/20 px-5 py-3">
        <TriangleAlert size={18} className="text-red-400" />

        <span className="font-semibold text-red-300">Common Mistake</span>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}
