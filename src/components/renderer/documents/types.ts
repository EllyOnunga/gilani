import { ReactNode } from "react";

export type BlockType =
  | "paragraph"
  | "heading"
  | "definition"
  | "example"
  | "formula"
  | "summary"
  | "warning"
  | "tip"
  | "practice"
  | "table"
  | "code"
  | "math"
  | "image"
  | "list";

export interface DocumentBlock {
  id: string;

  type: BlockType;

  title?: string;

  children?: DocumentBlock[];

  content?: string;

  language?: string;

  meta?: Record<string, unknown>;
}
