
## What we're building

The student-facing core of GolaniAI plus role hooks for teachers and admins. Backend is Lovable Cloud (Postgres + Auth + Storage + server functions); LLM calls go through Lovable AI Gateway (Gemini default). FastAPI/Celery/Chroma from your blueprint are replaced with the Lovable-native equivalents — same capabilities, no separate Python service.

## Design

"Scholarly hearth" direction (warm parchment, terracotta primary, Playfair Display serif headings + Inter body + JetBrains Mono for labels). Tokens are copied verbatim into `src/styles.css`. Layout: left sidebar nav, top hero greeting with streak + next-exam, two-column dashboard grid (tutor on the left, contextual cards on the right). "Escalate to teacher" is a first-class affordance in the sidebar.

## Scope of this build

In:
- Auth (email + password, Google sign-in via Lovable broker)
- Roles: student / teacher / admin (separate `user_roles` table + `has_role` security-definer function — never on profiles)
- Student app: dashboard, AI tutor chat, notes upload + summarizer, quiz generator + attempts, study planner, analytics
- Teacher app: escalation queue + student insight read view
- Admin app: user list + role management + audit log view
- Ethical layer (v1): per-turn confidence/safety check on tutor responses; low-confidence or distress signals create an `escalations` row; dignity filter blocks a small phrase list; every AI call writes to `audit_logs`
- RAG via pgvector in Postgres (text-embedding via Lovable AI Gateway)

Explicitly out (phase 2): Celery, Redis, Sentry, Docker, native multi-agent CrewAI orchestration. Scout/Guardian/Hunter are modeled as **prompt roles within one orchestrated server function**, not separate runtimes — this preserves the architecture intent without standing up a Python agent framework.

## Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx                  shell + onAuthStateChange invalidation
  index.tsx                   landing
  login.tsx, register.tsx, reset-password.tsx
  about.tsx
  _authenticated.tsx          gate: requires session
  _authenticated/
    dashboard.tsx             hero + grid
    tutor.tsx                 full-screen chat
    tutor.$threadId.tsx       threaded chat (real URL per conversation)
    notes.tsx                 upload + summary list
    notes.$noteId.tsx         summary view
    quizzes.tsx               generator + history
    quizzes.$quizId.tsx       attempt
    planner.tsx
    analytics.tsx
  _authenticated/_teacher.tsx beforeLoad: has_role('teacher'|'admin')
  _authenticated/_teacher/
    escalations.tsx
    students.tsx
  _authenticated/_admin.tsx   beforeLoad: has_role('admin')
  _authenticated/_admin/
    users.tsx
    audit.tsx
  api/chat.ts                 streaming AI SDK endpoint for tutor
```

## Database (Lovable Cloud migration)

Tables — all with explicit GRANTs and RLS:
- `profiles` (id → auth.users, display_name, avatar_url, curriculum enum)
- `app_role` enum (`student`,`teacher`,`admin`) + `user_roles(user_id, role, unique)` + `has_role()` security-definer
- `notes` (user_id, title, source_path in storage, text, created_at)
- `note_chunks` (note_id, content, embedding vector(768)) — pgvector for RAG
- `conversations` (user_id, title, created_at)
- `messages` (conversation_id, role, content, parts jsonb, confidence float, created_at)
- `quizzes` (user_id, topic, difficulty, questions jsonb, created_at)
- `quiz_attempts` (quiz_id, user_id, answers jsonb, score, created_at)
- `study_plans` (user_id, exam_date, items jsonb)
- `analytics_events` (user_id, kind, payload jsonb, created_at)
- `escalations` (user_id, conversation_id, reason, status, reviewer_id, created_at)
- `audit_logs` (user_id, action, payload jsonb, created_at)

RLS: students see only their own rows; teachers can read `escalations` + read-only student analytics; admins read all + write `user_roles` and `audit_logs`. Storage bucket `notes` is private with per-user-folder policies.

## Server functions / routes

- `src/routes/api/chat.ts` — streaming tutor (AI SDK `streamText`, model `google/gemini-3-flash-preview`, RAG retrieval from `note_chunks` via pgvector top-k, system prompt enforces curriculum grounding + dignity rules, post-stream writes `messages` + `audit_logs`, triggers `escalations` insert when confidence < threshold or distress keywords detected)
- `src/lib/notes.functions.ts` — `uploadNote`, `summarizeNote` (extract → chunk → embed via gateway → insert chunks + summary)
- `src/lib/quizzes.functions.ts` — `generateQuiz` (structured `Output.object` schema), `submitQuizAttempt`
- `src/lib/planner.functions.ts` — `generateStudyPlan` (structured output)
- `src/lib/analytics.functions.ts` — `getDashboardStats`, `getWeakTopics`
- `src/lib/admin.functions.ts` — admin-only role grants (server-gated via `has_role`)

All protected with `requireSupabaseAuth`; `attachSupabaseAuth` registered in `src/start.ts`.

## Build order

1. Cloud + AI gateway setup, design tokens in `src/styles.css`, fonts, sidebar shell
2. Auth (email + Google), profiles, roles + `has_role`, route guards (`_authenticated`, `_teacher`, `_admin`)
3. Tutor chat + threads + `/api/chat` streaming endpoint (no RAG yet)
4. Notes upload → storage → summarize → embeddings → pgvector retrieval wired into tutor
5. Quiz generator + attempts
6. Study planner + analytics dashboard
7. Ethical layer: confidence/dignity checks, escalations table, teacher escalation queue
8. Admin: user list + role management + audit log view

I'll likely pause at step 3 or 4 for a checkpoint so you can verify the tutor feels right before we layer RAG and the rest.

## Notes / trade-offs

- "Multi-agent" Scout/Guardian/Hunter is implemented as orchestrated prompts + tools inside one server function. Real CrewAI requires a Python runtime Lovable doesn't host.
- Refresh-token rotation is handled by Supabase Auth automatically — no custom JWT layer needed.
- Background jobs (Celery) aren't required for this MVP; summarization runs synchronously in a server function. If a note gets very large we can chunk in the client.
- No Sentry/Docker — Lovable handles hosting and runtime.

Ready to build on approval.
