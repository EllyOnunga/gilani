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

// ─── JSON Repair Helper ───────────────────────────────────────────────────────

function repairAndParseJson(raw: string): any {
  // 1. Strip markdown fences
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Extract outermost { ... }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  // 2.5 Escape unescaped double quotes inside string values (line-by-line)
  const lines = s.split("\n");
  s = lines
    .map((line) => {
      const match = line.match(/^(\s*"[a-zA-Z_0-9]+"\s*:\s*")(.*)("\s*,?\s*)$/);
      if (match) {
        const prefix = match[1];
        const val = match[2];
        const suffix = match[3];
        // Escape any unescaped double quotes inside the value
        const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
        return prefix + escapedVal + suffix;
      }
      return line;
    })
    .join("\n");

  // 3. Remove trailing commas before ] or } (handles ,\n} and ,})
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 4. Fix lone backslashes inside JSON string values:
  //    Escape any backslash that is not:
  //    - part of an already-escaped backslash (\\)
  //    - part of an escaped double quote (\")
  //    - part of a valid newline escape (\n)
  //    - part of a valid Unicode escape sequence (\uXXXX)
  //    This successfully repairs LaTeX sequences like \sqrt, \frac, \text, \pm etc.
  s = s.replace(
    /("(?:[^"\\]|\\.)*")/g,
    (match) => {
      return match.replace(/\\(\\|"|n|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
        if (g1) return m;
        return "\\\\";
      });
    }
  );

  // 5. Try direct parse first, fall back to eval-style as last resort
  try {
    return JSON.parse(s);
  } catch (err: any) {
    // Last-resort: strip any remaining illegal control characters and retry
    const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    try {
      return JSON.parse(cleaned);
    } catch (finalErr: any) {
      console.error("[JSON Repair] Failed to parse repaired JSON string!");
      console.error("[JSON Repair] Error message:", finalErr.message);

      // Attempt to extract position from error message
      let pos = -1;
      const posMatch = finalErr.message.match(/at position (\d+)/);
      if (posMatch) {
        pos = parseInt(posMatch[1], 10);
      }

      if (pos >= 0) {
        const start = Math.max(0, pos - 100);
        const end = Math.min(cleaned.length, pos + 100);
        console.error(
          `[JSON Repair] Snippet around error (pos ${pos}):\n... ${cleaned.substring(
            start,
            end
          )} ...`
        );
      }

      // Write bad JSON to a local debug file for inspection
      try {
        const fs = require("fs");
        fs.writeFileSync("debug-bad-json-notes.json", cleaned, "utf8");
        console.error("[JSON Repair] Wrote bad JSON to debug-bad-json-notes.json");
      } catch (fsErr) {
        // Fallback for environment if require/fs is not available or throws
      }

      throw finalErr;
    }
  }
}

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
  .inputValidator(
    z.object({
      title: z.string(),
      heading: z.string().optional().default(""),
      subheading: z.string().optional().default(""),
      content: z.string(),
      userId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { title, heading, subheading, content, userId } = data;

    if (!title.trim() || !content.trim()) {
      throw new Error("Title and content are required");
    }

    const { generateText } = await import("ai");
    const models = createLovableAiGatewayProvider().getAllChatModels();
    if (models.length === 0) throw new Error("No AI providers are configured.");

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

    let parsed: StudyMaterialResponse | null = null;
    let lastError: unknown;

    for (const model of models) {
      try {
        console.log(`[Notes] Trying model: ${model.provider}/${model.modelId}`);
        const result = await generateText({
          model: model as any,
          maxTokens: 4000,
          prompt: `You are a senior curriculum-aligned educational content engine for Kenyan (KCSE/CBC) and International (IGCSE) learners.

Transform the student's input into structured, exam-ready study material.

════════════════════════════════════════
OUTPUT RULES (ABSOLUTE)
════════════════════════════════════════

Return ONLY valid JSON matching the schema below.
- No markdown outside JSON strings
- No backticks or code fences
- No prose before or after the JSON
- No trailing commas, no comments
- Must be JSON.parse() valid

════════════════════════════════════════
STEP 1 — CLASSIFY THE INPUT
════════════════════════════════════════

Read the content and set "type":
- "study_notes"    → theory, explanations, definitions, summaries
- "question_paper" → exam questions with or without solutions

If unsure, default to "study_notes".

════════════════════════════════════════
STEP 2 — CONTENT RULES BY TYPE
════════════════════════════════════════

## If type = "study_notes"

- Write a thorough comprehensive_summary (markdown allowed inside the string)
- Use headings (##), bullet points, and **bold key terms** inside strings
- Extract every major idea into key_concepts
- List all relevant formulas in formulas_and_equations
- solutions MUST be an empty array []

## If type = "question_paper"

- Break every question into a numbered solution with clear steps
- Add marks_breakdown per solution (e.g. "1 mark: correct formula, 2 marks: correct substitution")
- Highlight common_mistakes students make on that question
- Add alternative_approach where a second method exists
- comprehensive_summary should describe what the paper covers

════════════════════════════════════════
CURRICULUM RULES
════════════════════════════════════════

Detect the curriculum from the content. Apply the matching rules:

## KCSE
- Align to KNEC syllabus (KLB / Longhorn logic)
- Ground examples in Kenyan context:
  M-Pesa transactions, matatu journeys, shamba farming,
  SGR railway, Lake Victoria, Rift Valley, Nairobi geography
- Use KNEC command verbs: state, describe, explain, calculate, outline, give

## CBC
- Focus on competencies, real-life reasoning, project-based learning
- Frame explanations as scenarios the learner can apply
- Prioritise understanding over memorisation
- Connect to everyday Kenyan contexts

## IGCSE
- Use Cambridge command verbs by assessment objective:
  AO1 (recall)  → state, name, list, identify
  AO2 (apply)   → describe, explain, calculate, determine
  AO3 (analyse) → evaluate, discuss, suggest, compare, justify
- Mark each key concept with its likely AO level

════════════════════════════════════════
FORMATTING RULES
════════════════════════════════════════

## Math — always wrap in LaTeX

Inline:  $x = 2a + b$
Block:   $$ F = ma $$

Powers and indices:
  $x^2$              (squared)
  $x^3$              (cubed)
  $x^n$              (nth power)

Roots:
  $\\sqrt{x}$         (square root)
  $\\sqrt[3]{x}$      (cube root)
  $\\sqrt[n]{x}$      (nth root)
  $\\sqrt{b^2 - 4ac}$ (nested — always use braces)

Fractions:
  $\\frac{a}{b}$
  $\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$   (quadratic formula)

Common reference expressions:
  $a^2 + b^2 = c^2$         (Pythagorean theorem)
  $A = \\pi r^2$             (area of circle)
  $V = \\frac{4}{3}\\pi r^3$ (volume of sphere)
  

NEVER write: x^2, sqrt(x), x**2, ²x in plain text — always use $...$

## Chemistry — always use subscripts/superscripts
  $\\text{H}_2\\text{O}$, $\\text{CO}_2$, $\\text{SO}_4^{2-}$, $\\text{H}_2\\text{SO}_4$

## Quick review cards
  front: a question or prompt ("What is the quadratic formula?")
  back:  the answer with full LaTeX if needed

════════════════════════════════════════
RECOMMENDED RESOURCES — STRICT RULES
════════════════════════════════════════

- Only recommend resources that genuinely exist
- For Kenyan textbooks: KLB, Longhorn, Moran series only
- For IGCSE: Cambridge/Hodder/Oxford official titles only
- For websites: only well-known platforms (Khan Academy, BBC Bitesize, Revision Village)
- NEVER fabricate book titles, authors, URLs, or ISBN numbers
- If unsure whether a resource exists, omit it entirely
- link field: only include if you are certain the URL is real and stable

════════════════════════════════════════
OUTPUT SCHEMA (MANDATORY)
════════════════════════════════════════

{
  "title": "string",
  "type": "study_notes | question_paper",
  "subject": "string",
  "topic": "string",
  "form_level": "string (e.g. Form 3, Year 10, Grade 8)",
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
      "solution": "string (step-by-step, LaTeX where needed)",
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
      "link": "string (only if URL is real and verified)"
    }
  ],
  "quick_review_cards": [
    {
      "front": "string",
      "back": "string"
    }
  ]
}

════════════════════════════════════════
INPUT
════════════════════════════════════════

Title: ${title}${heading ? `
Heading: ${heading}` : ""}${subheading ? `
Subheading: ${subheading}` : ""}

Content:
${content.slice(0, 15000)}`,
  // heading and subheading are passed to the prompt above
        } as any);
        const textResult = result.text.trim();
        if (textResult) {
          parsed = repairAndParseJson(textResult) as StudyMaterialResponse;
          console.log(`[Notes] Success with model: ${model.provider}/${model.modelId}`);
          break;
        }
      } catch (err) {
        console.warn(`[Notes] Model ${model.provider}/${model.modelId} failed:`, err);
        lastError = err;
      }
    }

    if (!parsed) {
      throw lastError || new Error("Failed to generate and parse notes with all configured providers.");
    }

    const summary = parsed.comprehensive_summary || parsed.summary || "";
    const keyConcepts = Array.isArray(parsed.key_concepts)
      ? parsed.key_concepts.map((kc) =>
        typeof kc === "string" ? kc : `${kc.concept}: ${kc.definition}`,
      )
      : [];

    // Insert note
    const { data: note, error: noteErr } = await supabaseAdmin
      .from("notes")
      .insert({ title, raw_text: content, summary, key_concepts: keyConcepts, user_id: userId })
      .select()
      .single();

    if (noteErr) throw new Error(noteErr.message);

     // Split text into chunks and prepend Title, Heading, and Subheading context
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const segment = content.slice(i, i + chunkSize);
      const fullChunkText = `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${segment}`;
      chunks.push(fullChunkText);
    }

    // Process embeddings in parallel
    const chunkPromises = chunks.map(async (chunkText, index) => {
      let embedding: number[] | null = null;
      try {
        const { embed } = await import("ai");
        const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
        const res = await embed({
          model: embeddingModel,
          value: chunkText,
          maxRetries: 0,
        });
        embedding = res.embedding;
      } catch (err) {
        console.error(`Failed to generate embedding for chunk ${index}`, err);
      }

      return {
        note_id: (note as any).id,
        content: chunkText,
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
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
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
      setHeading("");
      setSubheading("");
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
        ingestNote({ data: { title, heading, subheading, content, userId: session.user.id } }),
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
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${dragActive
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                  Heading <span className="normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="e.g. Cell Biology"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                  Subheading <span className="normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  value={subheading}
                  onChange={(e) => setSubheading(e.target.value)}
                  placeholder="e.g. Mitosis and Meiosis"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
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
