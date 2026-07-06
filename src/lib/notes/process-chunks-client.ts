import { processNoteChunk, finalizeNote, markNoteFailed } from "@/lib/notes.server-fns";

const MAX_CHUNK_RETRIES = 2;

export interface ProcessProgress {
  done: number;
  total: number;
}

/**
 * Drives a note's chunks through processNoteChunk -> finalizeNote, one at a
 * time. Shared by both the initial upload flow and the retry-a-failed-note
 * flow so their behavior (retry count, error handling) never drifts apart.
 */
export async function processNoteChunks(
  noteId: string,
  chunks: string[],
  onProgress?: (progress: ProcessProgress) => void,
): Promise<void> {
  const partialSummaries: string[] = [];
  const allKeyConceptsSet = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    let attempt = 0;
    let succeeded = false;
    let lastErr: unknown = null;

    while (attempt <= MAX_CHUNK_RETRIES && !succeeded) {
      try {
        const result = await processNoteChunk({
          data: { noteId, content: chunks[i], chunkIndex: i, totalChunks: chunks.length },
        });
        partialSummaries.push(result.summary);
        result.keyConcepts.forEach((k) => allKeyConceptsSet.add(k));
        succeeded = true;
      } catch (err) {
        lastErr = err;
        attempt++;
      }
    }

    if (!succeeded) {
      const message = lastErr instanceof Error ? lastErr.message : "Failed to process a section";
      await markNoteFailed({ data: { noteId, errorMessage: message } }).catch(() => {});
      throw new Error(message);
    }

    onProgress?.({ done: i + 1, total: chunks.length });
  }

  await finalizeNote({
    data: { noteId, partialSummaries, allKeyConcepts: Array.from(allKeyConceptsSet) },
  });
}
