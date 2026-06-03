import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Tag,
  FileText,
  X,
  Upload,
} from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";

// ─── Server Functions ──────────────────────────────────────────────────────────

const listNotes = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

    const { data: notes, error } = await supabaseAdmin
      .from("notes")
      .select("id, title, summary, key_concepts, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return notes ?? [];
  });

const ingestNote = createServerFn({ method: "POST" })
  .inputValidator(z.object({ title: z.string(), content: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    const { title, content, userId } = data;

    if (!title.trim() || !content.trim()) {
      throw new Error("Title and content are required");
    }

    const { generateText } = await import("ai");
    const models = createLovableAiGatewayProvider().getAllChatModels();
    if (models.length === 0) throw new Error("No AI providers are configured.");

    let text = "";
    let lastError: unknown;
    for (const model of models) {
      try {
        console.log(`[Notes] Trying model: ${model.provider}/${model.modelId}`);
        const result = await generateText({
          model,
          prompt: `You are an expert curriculum-aligned educational content engine for Kenyan (KCSE/CBC) and International (IGCSE) learners.

Your task is to transform the input content into structured, high-quality study material.

---

# 🚨 CRITICAL OUTPUT RULE (ABSOLUTE)

You MUST return ONLY valid JSON.

STRICT RULES:
- No markdown
- No \`\`\` code blocks
- No commentary outside JSON
- No extra keys outside schema
- Must be JSON.parse() valid
- No trailing commas

If you violate this → output is invalid.

---

# 🎯 TASK DEFINITION

Analyze the input and classify it as:

"type":
- "study_notes" (theory, explanations, summaries)
- "question_paper" (questions + solutions)

You MUST infer this correctly from content.

---

# 📘 CONTENT REQUIREMENTS

## If type = study_notes

You MUST:
- Produce structured academic notes
- Use headings, bullet points, and clear explanations
- Highlight key terms in **bold (within markdown string only)**
- Include Kenyan real-world examples (M-Pesa, agriculture, geography, etc.)
- Include formulas using LaTeX ($...$)

## If type = question_paper

You MUST:
- Break down all questions step-by-step
- Provide marking scheme hints [e.g. 2 marks]
- Highlight common student mistakes
- Provide alternative solving methods where relevant

---

# 🧠 CURRICULUM RULES

## KCSE
- Align strictly with KNEC syllabus
- Use KLB / Longhorn logic
- Include Kenyan context (schools, economy, environment)

## CBC
- Focus on competencies, real-life application, projects
- Emphasize understanding over memorization

## IGCSE
- Use Cambridge command words:
  describe, explain, evaluate, calculate
- Align to AO1, AO2, AO3 assessment structure

---

# 🧪 FORMATTING RULES (STRICT)

- All math MUST use LaTeX with $...$
- Chemistry MUST use proper notation:
  $H_2O$, $CO_2$, $SO_4^{2-}$
- NO markdown outside JSON strings
- Keep explanations clean and exam-ready

---

# 📦 OUTPUT JSON SCHEMA (MANDATORY)

Return EXACTLY:

{
  "title": "string",
  "type": "study_notes | question_paper",
  "subject": "string",
  "topic": "string",
  "form_level": "string",
  "comprehensive_summary": "string (markdown allowed inside)",
  "key_concepts": [
    {
      "concept": "string",
      "definition": "string",
      "importance": "string"
    }
  ],
  "formulas_and_equations": [
    {
      "name": "string",
      "expression": "string (LaTeX)",
      "explanation": "string"
    }
  ],
  "solutions": [
    {
      "question_number": 1,
      "question_text": "string",
      "solution": "string (step-by-step)",
      "marks_breakdown": "string",
      "common_mistakes": "string",
      "alternative_approach": "string"
    }
  ],
  "study_tips": ["string"],
  "common_exam_questions": ["string"],
  "related_topics": ["string"],
  "recommended_resources": [
    {
      "name": "string",
      "type": "textbook | website | video",
      "description": "string",
      "link": "string (optional)"
    }
  ],
  "quick_review_cards": [
    {
      "front": "string",
      "back": "string"
    }
  ]
}

---

# ⚠️ FIELD RULES (IMPORTANT)

- "solutions" ONLY required if type = question_paper
- If study_notes → solutions MUST be an empty array []
- "key_concepts" MUST extract ALL major ideas
- "formulas_and_equations" MUST include ALL relevant formulas
- Never omit required fields

---

# 🧠 QUALITY SELF-CHECK

Before responding, verify:
- JSON is valid
- Schema fully matches
- No missing fields
- No extra fields
- Curriculum alignment correct
- Output is structured and exam-ready

---

Now process the input and generate the JSON output.`,
        });
        text = result.text;
        if (text.trim()) {
          console.log(`[Notes] Success with model: ${model.provider}/${model.modelId}`);
          break;
        }
      } catch (err) {
        console.warn(`[Notes] Model ${model.provider}/${model.modelId} failed:`, err);
        lastError = err;
      }
    }

    if (!text.trim()) {
      throw lastError || new Error("Failed to generate notes with all configured providers.");
    }

    interface StudyMaterialResponse {
      title: string;
      type: "study_notes" | "question_paper";
      subject: string;
      topic: string;
      form_level: string;
      comprehensive_summary: string;
      summary?: string;
      key_concepts: Array<{ concept: string; definition: string; importance: string }>;
      formulas_and_equations: Array<{ name: string; expression: string; explanation: string }>;
      solutions?: Array<{
        question_number: number;
        question_text: string;
        solution: string;
        marks_breakdown: string;
        common_mistakes: string;
        alternative_approach?: string;
      }>;
      study_tips: string[];
      common_exam_questions: string[];
      related_topics: string[];
      recommended_resources: Array<{
        name: string;
        type: string;
        description: string;
        link?: string;
      }>;
      quick_review_cards: Array<{ front: string; back: string }>;
    }

    let summary = "";
    let keyConcepts: string[] = [];

    try {
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanText) as StudyMaterialResponse;
      summary = parsed.comprehensive_summary || parsed.summary || "";
      keyConcepts = Array.isArray(parsed.key_concepts)
        ? parsed.key_concepts.map((kc) =>
            typeof kc === "string" ? kc : `${kc.concept}: ${kc.definition}`,
          )
        : [];
    } catch (error) {
      console.error("Failed to parse study material JSON:", error);
      summary = text.slice(0, 1000);
      keyConcepts = [];
    }

    // Insert note
    const { data: note, error: noteErr } = await supabaseAdmin
      .from("notes")
      .insert({ title, raw_text: content, summary, key_concepts: keyConcepts, user_id: userId })
      .select()
      .single();

    if (noteErr) throw new Error(noteErr.message);

    // Split text into chunks
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    // Process embeddings in parallel
    const chunkPromises = chunks.map(async (chunk, index) => {
      let embedding: number[] | null = null;
      try {
        const { embed } = await import("ai");
        const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
        const res = await embed({
          model: embeddingModel,
          value: chunk,
          maxRetries: 0,
        });
        embedding = res.embedding;
      } catch (err) {
        console.error(`Failed to generate embedding for chunk ${index}`, err);
      }

      return {
        note_id: (note as any).id,
        content: chunk,
        user_id: userId,
        embedding: embedding ? JSON.stringify(embedding) : null,
      };
    });

    const chunkData = await Promise.all(chunkPromises);

    // Bulk insert chunks
    const { error: chunksErr } = await supabaseAdmin.from("note_chunks").insert(chunkData);
    if (chunksErr) {
      console.error("Failed to bulk insert note chunks:", chunksErr);
      throw new Error(`Failed to save note chunks: ${chunksErr.message}`);
    }

    return note as any;
  });

// ─── Types ─────────────────────────────────────────────────────────────────────

type Note = {
  id: string;
  title: string;
  summary?: string | null;
  key_concepts?: string[] | null;
  created_at?: string | null;
};

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Study Notes — GilaniAI" }] }),
  loader: async () => {
    const res = await supabase.auth.getSession();
    const session = res?.data?.session;
    if (!session?.user?.id) return [];
    return listNotes({ data: { userId: session.user.id } });
  },
  component: NotesPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

function NotesPage() {
  const initialNotes = Route.useLoaderData() as Note[];
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [parsingFile, setParsingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileParsing(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileParsing(e.target.files[0]);
    }
  };

  const handleFileParsing = async (file: File) => {
    setParsingFile(true);
    const toastId = toast.loading(`Extracting text from ${file.name}...`);
    try {
      const parsed = await parseDocument(file);
      const baseName = parsed.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
      setContent(parsed.text);
      toast.success("Document text extracted successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to extract text from document", { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content.");
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (!session) {
        toast.error("Not signed in");
        return;
      }
      const note = await withTimeout(
        ingestNote({ data: { title, content, userId: session.user.id } }),
        120000,
        "Saving note timed out. Please try again.",
      );
      setNotes((prev) => [note as Note, ...prev]);
      setTitle("");
      setContent("");
      setShowForm(false);
      toast.success("Note ingested & summarised!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save note"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Study Notes
          </p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Upload &amp; Summarise</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste your class notes and GilaniAI will extract a summary and key concepts
            automatically.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="self-start sm:self-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Note"}
        </button>
      </header>

      {/* Upload Form */}
      {showForm && (
        <div className="animate-in-slide rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-xl mb-4">Add Study Note</h3>
          <div className="space-y-4">
            {/* Document Upload Zone */}
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={handleFileDrop}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-border bg-background hover:bg-accent/30 hover:border-muted-foreground/50"
              }`}
            >
              <input
                type="file"
                id="notes-file-upload"
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.csv"
                onChange={handleFileChange}
                disabled={parsingFile}
              />
              <label
                htmlFor="notes-file-upload"
                className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground w-full h-full py-2"
              >
                {parsingFile ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-primary/70 animate-pulse" />
                )}
                <div>
                  <span className="font-semibold text-primary underline underline-offset-2">
                    Click to upload
                  </span>{" "}
                  or drag and drop a document
                </div>
                <div className="font-mono text-[10px] text-muted-foreground/80">
                  Supports PDF, DOCX, TXT, MD, CSV (Max 10MB)
                </div>
              </label>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Biology Chapter 3 — Photosynthesis"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your class notes here…"
                rows={10}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {content.length.toLocaleString()} characters
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Processing…" : "Save & Summarise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 sm:p-16 text-center">
          <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first note to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const open = expanded === note.id;
            return (
              <div
                key={note.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md"
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left gap-4"
                  onClick={() => setExpanded(open ? null : note.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{note.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>

                {open && (
                  <div className="border-t border-border px-5 pb-5 pt-4 space-y-4 animate-in-slide">
                    {note.summary && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          AI Summary
                        </p>
                        <p className="text-sm leading-relaxed text-foreground/90">{note.summary}</p>
                      </div>
                    )}
                    {note.key_concepts && (note.key_concepts as any).length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <Tag className="h-3 w-3" /> Key Concepts
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(note.key_concepts as string[]).map((c) => (
                            <span
                              key={c}
                              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
