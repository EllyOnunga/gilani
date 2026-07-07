import { ClipboardList } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function SummaryCard({ children }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-purple-500/30 bg-purple-950/20">
      <div className="flex items-center gap-2 border-b border-purple-500/20 px-5 py-3">
        <ClipboardList size={18} className="text-purple-400" />

        <span className="font-semibold text-purple-300">Summary</span>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}
