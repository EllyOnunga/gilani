-- Supports the notes upload pipeline: extraction happens instantly client-side,
-- but chunking + embedding + summarization take longer, so we track progress.
alter table notes
  add column if not exists status text not null default 'ready'
    check (status in ('processing', 'ready', 'failed')),
  add column if not exists file_name text,
  add column if not exists error_message text;

-- Existing rows (if any were ever manually inserted) are treated as already ready.
update notes set status = 'ready' where status is null;
