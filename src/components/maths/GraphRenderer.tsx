import { useEffect, useRef } from "react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import EquationToolbar from "./EquationToolbar";
import JXG from "jsxgraph";

interface Props {
  block: DocumentBlock;
}

export default function GraphRenderer({ block }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const data = block.content || "";

  useEffect(() => {
    if (!boardRef.current) return;

    // Initialize board
    const board = JXG.JSXGraph.initBoard(boardRef.current.id, {
      boundingbox: [-10, 10, 10, -10],
      axis: true,
      showCopyright: false,
    });

    try {
      if (data) {
        board.create("functiongraph", [
          function (x: number) {
            // Very basic evaluation for scaffold
            // Replace common math functions
            const safeStr = data
              .replace(/sin/g, "Math.sin")
              .replace(/cos/g, "Math.cos")
              .replace(/tan/g, "Math.tan")
              .replace(/sqrt/g, "Math.sqrt");
            return new Function("x", `return ${safeStr}`)(x);
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to parse function for JSXGraph", e);
    }

    return () => {
      JXG.JSXGraph.freeBoard(board);
    };
  }, [data]);

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title="Graph" />
      <div
        ref={boardRef}
        id={`graph-${block.id}`}
        className="jxgbox"
        style={{ width: "100%", height: "400px" }}
      />
    </section>
  );
}
