SET search_path = public, extensions;

-- ─── Global Notes (admin-uploaded) ───────────────────────────────────────────
CREATE TABLE public.global_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  raw_text    text,
  source_path text,
  summary     text,
  curriculum  text,
  subject     text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.global_notes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything; authenticated users can only read
CREATE POLICY "Admins manage global notes"
  ON public.global_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Students read global notes"
  ON public.global_notes FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.global_notes TO authenticated;
GRANT ALL ON public.global_notes TO service_role;

-- ─── Global Note Chunks ───────────────────────────────────────────────────────
CREATE TABLE public.global_note_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     uuid NOT NULL REFERENCES public.global_notes(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(768),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.global_note_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage global chunks"
  ON public.global_note_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Students read global chunks"
  ON public.global_note_chunks FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.global_note_chunks TO authenticated;
GRANT ALL ON public.global_note_chunks TO service_role;

CREATE INDEX ON public.global_note_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── RPC: match_global_note_chunks ───────────────────────────────────────────
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
LANGUAGE sql STABLE SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.match_global_note_chunks(vector, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_global_note_chunks(vector, int) TO authenticated, service_role;
