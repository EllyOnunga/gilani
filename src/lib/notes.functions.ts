import { embedMany } from 'ai';
import { createGoogleAiProvider } from './ai-gateway.server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

/**
 * Processes a note by chunking and generating embeddings
 * using the RETRIEVAL_DOCUMENT task type for optimized RAG.
 */
export async function processNoteEmbeddings(noteId: string, text: string) {
  // Simple chunking strategy for the hearth/parchment direction
  const chunks = text.match(/[\s\S]{1,1000}/g) || [];

  const googleProvider = createGoogleAiProvider();

  // Use embedMany for efficient batch processing
  const { embeddings } = await embedMany({
    model: googleProvider.textEmbeddingModel('text-embedding-004'),
    values: chunks,
    providerOptions: {
      google: {
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    },
  });

  // Batch insert into pgvector table
  const { error } = await supabase.from('note_chunks').insert(
    chunks.map((content, i) => ({
      note_id: noteId,
      content,
      embedding: embeddings[i],
    }))
  );

  if (error) throw error;

  // Audit the processing
  await supabase.from('audit_logs').insert({
    action: 'note_processed',
    payload: { noteId, chunkCount: chunks.length }
  });

  return { success: true, chunkCount: chunks.length };
}