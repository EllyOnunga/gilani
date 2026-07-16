import React, { useState } from "react";
import { RotateCcw } from "lucide-react";

interface FlashCardProps {
  front: string;
  back: string;
}

export function FlashCard({ front, back }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full my-2 cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped((f) => !f)}
    >
      {/* Card container */}
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "80px",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-5 py-4 flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
              Question
            </span>
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <p className="text-[15px] sm:text-[16px] leading-relaxed text-foreground">{front}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">
            Click to reveal answer
          </p>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm px-5 py-4 flex flex-col justify-between"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Answer
            </span>
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <p className="text-[15px] sm:text-[16px] leading-relaxed text-foreground">{back}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">Click to flip back</p>
        </div>
      </div>

      {/* Spacer so the card takes up space (since children are absolute) */}
      <div aria-hidden className="invisible px-5 py-4 min-h-[80px]">
        <div className="mb-2 h-5" />
        <p className="text-[15px] sm:text-[16px] leading-relaxed">{flipped ? back : front}</p>
        <p className="text-[10px] mt-2">placeholder</p>
      </div>
    </div>
  );
}

export default FlashCard;
