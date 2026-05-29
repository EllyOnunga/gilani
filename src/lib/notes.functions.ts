import { embedMany } from 'ai';
import { createGoogleAiProvider } from './ai-gateway.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/**
 * Processes a note by chunking and generating embeddings
 * using the RETRIEVAL_DOCUMENT task type for optimized RAG.
 */
export async function processNoteEmbeddings(noteId: string, text: string) {
  // Fetch note to get user_id
  const { data: note, error: noteError } = await supabaseAdmin
    .from('notes')
    .select('user_id')
    .eq('id', noteId)
    .single();

  if (noteError || !note) {
    throw noteError || new Error(`Note not found: ${noteId}`);
  }
  const userId = note.user_id;

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
  const { error } = await supabaseAdmin.from('note_chunks').insert(
    chunks.map((content, i) => ({
      note_id: noteId,
      content,
      user_id: userId,
      embedding: JSON.stringify(embeddings[i]),
    }))
  );

  if (error) throw error;

  // Audit the processing
  await supabaseAdmin.from('audit_logs').insert({
    action: 'note_processed',
    user_id: userId,
    payload: { noteId, chunkCount: chunks.length }
  });

  return { success: true, chunkCount: chunks.length };
}