// Splits raw text into overlapping chunks for embedding + retrieval.
// Chunk size matches the existing notes-chunking pattern used elsewhere in
// the app (2000 chars). A small overlap prevents key sentences from being
// split exactly at a chunk boundary and losing context on either side.
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    // Prefer breaking on a paragraph/sentence boundary near the end of the
    // window rather than mid-word, when one exists reasonably close by.
    let breakPoint = end;
    if (end < clean.length) {
      const lookback = clean.slice(Math.max(start, end - 200), end);
      const lastBreak = Math.max(
        lookback.lastIndexOf("\n\n"),
        lookback.lastIndexOf(". "),
        lookback.lastIndexOf("\n"),
      );
      if (lastBreak !== -1) {
        breakPoint = Math.max(start, end - 200) + lastBreak + 1;
      }
    }
    chunks.push(clean.slice(start, breakPoint).trim());
    if (breakPoint >= clean.length) break;
    start = breakPoint - CHUNK_OVERLAP;
    if (start < 0) start = breakPoint;
  }

  return chunks.filter((c) => c.length > 0);
}
