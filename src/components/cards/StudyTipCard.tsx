import { Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function StudyTipCard({ children }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-amber-500/30 bg-amber-950/20">
      <div className="flex items-center gap-2 border-b border-amber-500/20 px-5 py-3">
        <Sparkles size={18} className="text-amber-400" />

        <span className="font-semibold text-amber-300">Study Tip</span>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}
