import type { DocumentBlock } from "@/components/renderer/types/document";

/**
 * Recursively visits all blocks in a document AST.
 */
export function visit(blocks: DocumentBlock[], visitor: (block: DocumentBlock) => void) {
    for (const block of blocks) {
        visitor(block);
        if (block.children && block.children.length > 0) {
            visit(block.children, visitor);
        }
    }
}

/**
 * Finds a block by ID.
 */
export function findBlock(blocks: DocumentBlock[], id: string): DocumentBlock | null {
    for (const block of blocks) {
        if (block.id === id) return block;
        if (block.children) {
            const found = findBlock(block.children, id);
            if (found) return found;
        }
    }
    return null;
}
