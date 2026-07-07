import { BlockMetadata } from "./metadata";
import { BlockType } from "./block";

export interface DocumentBlock {
  id: string;

  type: BlockType;

  title?: string;

  content?: string;

  data?: unknown;

  metadata?: BlockMetadata;

  children: DocumentBlock[];
}

export interface DocumentModel {
  version: 1;

  blocks: DocumentBlock[];
}

export interface MathData {
  latex: string;

  display: boolean;
}

interface Props {
  block: DocumentBlock;
}
