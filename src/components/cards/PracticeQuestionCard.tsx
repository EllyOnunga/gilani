import { CircleHelp } from "lucide-react";
import { useState } from "react";

interface Props {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export default function PracticeQuestionCard({ question, answer }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <section className="my-6 rounded-2xl border border-[#C96A3D]/30">
      <div className="flex items-center gap-2 border-b border-[#C96A3D]/20 bg-[#2A201C] px-5 py-3">
        <CircleHelp size={18} className="text-[#E28743]" />

        <span className="font-semibold text-[#E28743]">Try Yourself</span>
      </div>

      <div className="space-y-5 p-5">
        {question}

        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="rounded-lg bg-[#C96A3D] px-4 py-2 text-white transition hover:bg-[#E28743]"
        >
          {showAnswer ? "Hide Answer" : "Reveal Answer"}
        </button>

        {showAnswer && <div className="rounded-xl bg-zinc-900 p-4">{answer}</div>}
      </div>
    </section>
  );
}
