ALTER TABLE public.conversations ALTER COLUMN title DROP DEFAULT;
ALTER TABLE public.conversations ALTER COLUMN title DROP NOT NULL;
UPDATE public.conversations SET title = NULL WHERE title IN ('New conversation', 'New thread', 'New tutor session');
