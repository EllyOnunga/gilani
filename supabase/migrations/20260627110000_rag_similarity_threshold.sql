-- Add similarity threshold to RAG functions to prevent off-topic note injection.
-- Chunks with similarity < 0.65 are discarded entirely.

CREATE OR REPLACE FUNCTION public.match_note_chunks(
  query_embedding extensions.vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (id UUID, note_id UUID, content TEXT, similarity REAL)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT id, note_id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_chunks
  WHERE user_id = match_user_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) >= match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_global_note_chunks(
  query_embedding extensions.vector,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (id UUID, note_id UUID, content TEXT, similarity FLOAT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT
    gc.id,
    gc.note_id,
    gc.content,
    1 - (gc.embedding <=> query_embedding) AS similarity
  FROM public.global_note_chunks gc
  WHERE gc.embedding IS NOT NULL
    AND 1 - (gc.embedding <=> query_embedding) >= match_threshold
  ORDER BY gc.embedding <=> query_embedding
  LIMIT match_count;
$$;
