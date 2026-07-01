import React from "react";
import {
  FlaskConical,
  Globe,
  Calculator,
  BookOpen,
  Leaf,
  Code2,
  FileText,
  PenLine,
} from "lucide-react";

const SUBJECTS = [
  {
    icon: Calculator,
    label: "Solve Maths",
    prompt: "Help me solve a maths problem step by step",
    color: "text-orange-400",
  },
  {
    icon: Globe,
    label: "Geography",
    prompt: "Explain major landforms of East Africa for Geography",
    color: "text-cyan-400",
  },
  {
    icon: FlaskConical,
    label: "Chemistry",
    prompt: "Explain periodic table trends for Chemistry",
    color: "text-emerald-400",
  },
  {
    icon: BookOpen,
    label: "History",
    prompt: "What are the causes of World War I?",
    color: "text-amber-400",
  },
  {
    icon: Leaf,
    label: "Biology",
    prompt: "Help me understand photosynthesis for Biology",
    color: "text-green-400",
  },
  {
    icon: Code2,
    label: "Programming",
    prompt: "Teach me the basics of programming with examples",
    color: "text-blue-400",
  },
  {
    icon: FileText,
    label: "Summarise PDF",
    prompt: "I'll upload a document — please summarise the key points",
    color: "text-purple-400",
  },
  {
    icon: PenLine,
    label: "Essay Help",
    prompt: "Help me structure and write an essay",
    color: "text-pink-400",
  },
];

type Props = {
  onPromptClick: (prompt: string) => void;
};

export function EmptyState({ onPromptClick }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-5 py-8 gap-6 text-center select-none"
      style={{ minHeight: 0 }}
    >
      {/* Avatar */}
      <div
        className="relative flex items-center justify-center"
        style={{
          animation: "gs-fadein 0.5s ease both",
        }}
      >
        {/* Outer glow pulse */}
        <div
          className="absolute rounded-full"
          style={{
            width: 72,
            height: 72,
            background:
              "radial-gradient(circle, rgba(217,83,30,0.25) 0%, transparent 70%)",
            animation: "gs-pulse 2.4s ease-in-out infinite",
          }}
        />
        {/* Avatar circle */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #C96A3D 0%, #E28743 100%)",
            boxShadow:
              "0 0 0 3px rgba(217,83,30,0.18), 0 4px 20px rgba(217,83,30,0.35)",
          }}
        >
          <span
            style={{
              fontSize: 24,
              lineHeight: 1,
              userSelect: "none",
            }}
            aria-hidden="true"
          >
            🎓
          </span>
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          animation: "gs-fadein 0.5s 0.1s ease both",
        }}
      >
        <h2
          className="font-serif font-black text-foreground leading-tight"
          style={{ fontSize: 22 }}
        >
          GilaniAI
        </h2>
        <p
          className="font-mono font-bold uppercase tracking-widest"
          style={{
            fontSize: 9,
            color: "#d9531e",
            letterSpacing: "0.18em",
            marginTop: 2,
          }}
        >
          AI Tutor
        </p>
        <p
          className="text-muted-foreground leading-relaxed mt-2"
          style={{ fontSize: 12, maxWidth: 220 }}
        >
          Ask questions, solve problems, or upload notes — all in one place.
        </p>
      </div>

      {/* Subject grid */}
      <div
        className="w-full"
        style={{
          maxWidth: 320,
          animation: "gs-slideup 0.5s 0.2s ease both",
        }}
      >
        <p
          className="font-mono uppercase tracking-widest text-muted-foreground mb-3"
          style={{ fontSize: 9, letterSpacing: "0.16em" }}
        >
          Try asking about
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {SUBJECTS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onPromptClick(s.prompt)}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-[#1a1d27] active:scale-[0.97]"
              style={{
                animation: `gs-slideup 0.4s ${0.25 + i * 0.04}s ease both`,
              }}
            >
              <s.icon
                className={`${s.color} flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                style={{ width: 14, height: 14 }}
              />
              <span
                className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors"
                style={{ fontSize: 11, lineHeight: 1.3 }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes gs-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gs-slideup {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gs-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.7; }
          50%       { transform: scale(1.5); opacity: 0;   }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="gs-"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}