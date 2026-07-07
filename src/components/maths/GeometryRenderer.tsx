import { useEffect, useRef } from "react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import EquationToolbar from "./EquationToolbar";
import JXG from "jsxgraph";

interface Props {
  block: DocumentBlock;
}

export default function GeometryRenderer({ block }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardRef.current) return;

    // Initialize board for geometry
    const board = JXG.JSXGraph.initBoard(boardRef.current.id, {
      boundingbox: [-5, 5, 5, -5],
      axis: true,
      showCopyright: false,
    });

    // Basic scaffold: parse point definitions, etc.
    // For demonstration, draw a triangle
    const p1 = board.create("point", [0, 4], { name: "A", size: 4 });
    const p2 = board.create("point", [-3, -2], { name: "B", size: 4 });
    const p3 = board.create("point", [3, -2], { name: "C", size: 4 });
    board.create("polygon", [p1, p2, p3], { borders: { strokeWidth: 2 } });

    return () => {
      JXG.JSXGraph.freeBoard(board);
    };
  }, [block.content]);

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-fuchsia-600 bg-white">
      <EquationToolbar title="Geometry Proof" />
      <div
        ref={boardRef}
        id={`geom-${block.id}`}
        className="jxgbox"
        style={{ width: "100%", height: "400px" }}
      />
    </section>
  );
}
