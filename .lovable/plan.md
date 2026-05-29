## AI Tutor — Streaming Chat with Threads

Build the conversational AI tutor with threaded history, persisted to the database, using Lovable AI Gateway (`google/gemini-3-flash-preview`) and AI SDK UI.

### Scope
- Threaded conversations (already chose database persistence via `conversations` + `messages` tables).
- Streaming responses via `/api/chat` server route.
- Dedicated thread URL: `/tutor/$threadId`.
- Thread list sidebar (new thread, switch, delete).
- AI Elements primitives for the chat surface.
- "Escalate to teacher" button on each assistant message (writes to `escalations`).
- No RAG yet — that lands with the Notes step.

### Files to add
- `src/routes/api/chat.ts` — POST handler. Auth via `requireSupabaseAuth`. Validates `{ threadId, messages }`, verifies thread ownership, calls `streamText` with system prompt (Kenyan CBC/KCSE tutor, Socratic, dignified). In `onFinish`, inserts assistant message with `parts` jsonb and a heuristic `confidence` score; if confidence < 0.4 or distress keywords match, insert into `escalations`.
- `src/lib/tutor.functions.ts` — `createThread`, `listThreads`, `getThreadMessages`, `deleteThread`, `escalateMessage` server fns (all `requireSupabaseAuth`).
- `src/routes/_authenticated/tutor.tsx` — index route: auto-create or redirect to most recent thread.
- `src/routes/_authenticated/tutor.$threadId.tsx` — chat page. Thread sidebar + AI Elements `Conversation`/`Message`/`PromptInput`. Keyed by `threadId`. Loads messages via server fn → converts rows to `UIMessage[]`.
- Install AI Elements: `bun x ai-elements@latest add conversation message prompt-input shimmer`.

### Sidebar update
- Add new-thread button in tutor page header; thread list shows title + timestamp. Delete via separate sibling button (no nested buttons).

### Ethical layer (v1)
- System prompt enforces: cite curriculum context, never fabricate exam answers, encourage reasoning over rote.
- Distress detection: simple keyword list (self-harm, abuse) → auto-escalate + show supportive banner with helpline.
- Every turn logs to `audit_logs` (action: `tutor.message`, payload: `{threadId, confidence}`).

### Technical notes
- Use `toUIMessageStreamResponse({ originalMessages, onFinish })` to persist both user + assistant messages in the same thread.
- DB-generated UUID PKs for `messages.id` (AI SDK `msg_...` IDs stored only if needed — skipped for MVP).
- Mount chat keyed by `threadId` so messages don't bleed between threads.
- Assistant messages: no background. User messages: `primary`/`primary-foreground` bubble.
- Agent identity: use a small generated terracotta/parchment glyph (not `Sparkles`).

### Verification before finishing
- Sign in, create 2 threads, send messages in each, reload — both restore independently.
- Trigger distress keyword → escalation row appears.
- Textarea stays focused after send and after thread switch.
