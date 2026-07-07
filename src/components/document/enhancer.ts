import type { DocumentBlock } from "@/components/renderer/types/document";

/**
 * Enhances a document AST by assigning missing IDs and aggregating metadata.
 */
export function enhanceDocument(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks.map((block) => {
    return {
      ...block,
      id: block.id || crypto.randomUUID(),
      children: block.children ? enhanceDocument(block.children) : [],
    };
  });
}
