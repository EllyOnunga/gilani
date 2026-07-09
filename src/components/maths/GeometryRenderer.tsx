import React, { useEffect, useRef, useMemo } from "react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import EquationToolbar from "./EquationToolbar";

/**
 * GeometryRenderer — renders geometric diagrams from a JSON spec using JSXGraph.
 *
 * Expected block.content: JSON matching the GeometrySpec interface below.
 * Falls back to a labeled SVG triangle if content is empty or invalid JSON.
 *
 * Example JSON:
 * {
 *   "title": "Triangle ABC",
 *   "boundingbox": [-6, 6, 6, -6],
 *   "points": [
 *     { "name": "A", "coords": [0, 4] },
 *     { "name": "B", "coords": [-3, -2] },
 *     { "name": "C", "coords": [3, -2] }
 *   ],
 *   "polygons": [["A","B","C"]],
 *   "segments": [],
 *   "circles": [],
 *   "angles": [{ "points": ["B","A","C"], "name": "α" }]
 * }
 */

interface GeoPoint {
  name: string;
  coords: [number, number];
  label?: string;
  color?: string;
  fixed?: boolean;
}

interface GeoCircle {
  center: string; // point name
  through?: string; // point name on circumference
  radius?: number;
  color?: string;
  label?: string;
}

interface GeoAngle {
  points: [string, string, string]; // [ray1, vertex, ray2]
  name?: string;
  radius?: number;
}

interface GeometrySpec {
  title?: string;
  boundingbox?: [number, number, number, number]; // [xMin, yMax, xMax, yMin]
  axis?: boolean;
  points?: GeoPoint[];
  segments?: [string, string][]; // pairs of point names
  polygons?: string[][]; // arrays of point names
  circles?: GeoCircle[];
  angles?: GeoAngle[];
}

interface Props {
  block: DocumentBlock;
}

export default function GeometryRenderer({ block }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardIdRef = useRef<string>(`geom-${block.id}`);

  const spec = useMemo<GeometrySpec | null>(() => {
    const raw = (block.content || "").trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GeometrySpec;
    } catch {
      return null;
    }
  }, [block.content]);

  useEffect(() => {
    if (!boardRef.current) return;

    let board: any = null;

    import("jsxgraph").then((JXG: any) => {
      if (!boardRef.current) return;

      const bb: [number, number, number, number] = spec?.boundingbox ?? [-6, 6, 6, -6];

      board = JXG.JSXGraph.initBoard(boardIdRef.current, {
        boundingbox: bb,
        axis: spec?.axis ?? true,
        showCopyright: false,
        keepAspectRatio: false,
        pan: { enabled: true },
        zoom: { wheel: true, needShift: false },
      });

      if (!spec || !spec.points || spec.points.length === 0) {
        // Default demo: equilateral-ish triangle with labels
        const A = board.create("point", [0, 4], { name: "A", size: 4, color: "#3b82f6" });
        const B = board.create("point", [-3, -2], { name: "B", size: 4, color: "#3b82f6" });
        const C = board.create("point", [3, -2], { name: "C", size: 4, color: "#3b82f6" });
        board.create("polygon", [A, B, C], {
          borders: { strokeWidth: 2, strokeColor: "#3b82f6" },
          fillColor: "#3b82f620",
        });
        return;
      }

      // Build a name -> JSXGraph point map
      const pointMap: Record<string, any> = {};

      (spec.points || []).forEach((p) => {
        const pt = board.create("point", p.coords, {
          name: p.label ?? p.name,
          size: 4,
          color: p.color ?? "#3b82f6",
          fixed: p.fixed ?? false,
        });
        pointMap[p.name] = pt;
      });

      // Polygons
      (spec.polygons || []).forEach((poly) => {
        const pts = poly.map((n) => pointMap[n]).filter(Boolean);
        if (pts.length >= 3) {
          board.create("polygon", pts, {
            borders: { strokeWidth: 2, strokeColor: "#3b82f6" },
            fillColor: "#3b82f615",
          });
        }
      });

      // Segments
      (spec.segments || []).forEach(([a, b]) => {
        const pa = pointMap[a];
        const pb = pointMap[b];
        if (pa && pb) {
          board.create("segment", [pa, pb], { strokeWidth: 2, strokeColor: "#6366f1" });
        }
      });

      // Circles
      (spec.circles || []).forEach((circ) => {
        const center = pointMap[circ.center];
        if (!center) return;
        let circle;
        if (circ.through && pointMap[circ.through]) {
          circle = board.create("circle", [center, pointMap[circ.through]], {
            strokeWidth: 2,
            strokeColor: circ.color ?? "#10b981",
            fillColor: "transparent",
          });
        } else if (circ.radius !== undefined) {
          circle = board.create("circle", [center, circ.radius], {
            strokeWidth: 2,
            strokeColor: circ.color ?? "#10b981",
            fillColor: "transparent",
          });
        }
        if (circle && circ.label) {
          board.create("text", [
            circ.center ? pointMap[circ.center].X() + 0.2 : 0,
            circ.center ? pointMap[circ.center].Y() + 0.2 : 0,
            circ.label,
          ]);
        }
      });

      // Angles
      (spec.angles || []).forEach((ang) => {
        const [r1, vtx, r2] = ang.points;
        if (pointMap[r1] && pointMap[vtx] && pointMap[r2]) {
          board.create("angle", [pointMap[r1], pointMap[vtx], pointMap[r2]], {
            name: ang.name ?? "",
            radius: ang.radius ?? 0.8,
            fillColor: "#f97316",
            strokeColor: "#f97316",
            label: { fontSize: 14, color: "#f97316" },
          });
        }
      });
    });

    return () => {
      if (board) {
        import("jsxgraph").then((JXG: any) => {
          JXG.JSXGraph.freeBoard(board);
        });
      }
    };
  }, [spec]);

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EquationToolbar title={spec?.title ?? "Geometry"} />
      <div
        ref={boardRef}
        id={boardIdRef.current}
        className="jxgbox"
        style={{ width: "100%", height: "400px" }}
      />
    </section>
  );
}
