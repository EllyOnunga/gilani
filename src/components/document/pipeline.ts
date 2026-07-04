import { parse } from "./parser";
import { astToDocument } from "@/components/renderer/documents/astToDocument";
import { enhanceDocument } from "./enhancer";

export function buildDocument(markdown: string) {
    const tree = parse(markdown);
    const doc = astToDocument(tree);
    // Apply the enhancer to all blocks (assigns IDs, aggregates metadata)
    const enhancedBlocks = enhanceDocument(doc.blocks);
    return { ...doc, blocks: enhancedBlocks };
}