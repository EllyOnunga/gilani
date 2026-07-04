import type { DocumentBlock } from "../types/document";

export function createDocument(
  id: string = "",
  type: DocumentBlock["type"] = "paragraph",
): DocumentBlock {
  return {
    id,
    type,
    children: [],
  };
}