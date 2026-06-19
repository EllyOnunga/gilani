-- Fix search_path for RAG matching functions to include extensions schema (where pgvector is installed)
-- This resolves the "operator does not exist: extensions.vector <=> extensions.vector" error.

CREATE OR REPLACE FUNCTION public.match_note_chunks(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, note_id UUID, content TEXT, similarity REAL)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT id, note_id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_chunks
  WHERE user_id = match_user_id AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_global_note_chunks(
  query_embedding vector,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id         uuid,
  note_id    uuid,
  content    text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    gc.id,
    gc.note_id,
    gc.content,
    1 - (gc.embedding <=> query_embedding) AS similarity
  FROM public.global_note_chunks gc
  WHERE gc.embedding IS NOT NULL
  ORDER BY gc.embedding <=> query_embedding
  LIMIT match_count;
$$;
