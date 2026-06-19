import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { checkPlanRateLimit, getRateLimitStatus } from "@/lib/rate-limit.server";
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
  Clock,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout, friendlyError } from "@/lib/async";
import { buildNotesPrompt } from "@/lib/notes-prompt";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";
const LazyMarkdownRenderer = lazy(() =>
  import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function useRateLimitCountdown(errorMsg: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!errorMsg) { setSecondsLeft(0); return; }
    const daily = errorMsg.toLowerCase().includes("daily");
    setIsDaily(daily);
    const match = errorMsg.match(/(\d+)s[./]?/);
    const secs = match ? parseInt(match[1], 10) : 0;
    if (secs > 0) {
      setSecondsLeft(secs);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [errorMsg]);

  return { secondsLeft, isDaily };
}

// ─── JSON Repair Helper ───────────────────────────────────────────────────────

function repairAndParseJson(raw: string): any {
  // 0. Immediately strip ALL control characters (the #1 cause of "Bad control character" errors)
  //    Preserve only \t (0x09), \n (0x0A), \r (0x0D)
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 1. Strip markdown fences
  s = s.trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 2. Extract outermost { ... }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  // 3. Pre-repair: Fix "daily_quote": "Quote text." — First Last (author outside quotes)
  s = s
    .split("\n")
    .map((line) => {
      const quoteMatch = line.match(
        /^(\s*"daily_quote"\s*:\s*")(.*)"\s*[—–-]\s*([^",]+)(\s*,?\s*)$/,
      );
      if (quoteMatch) {
        const prefix = quoteMatch[1];
        const quoteText = quoteMatch[2];
        const author = quoteMatch[3].trim();
        const suffix = quoteMatch[4];
        return `${prefix}${quoteText} — ${author}"${suffix}`;
      }
      return line;
    })
    .join("\n");

  // 4. Escape unescaped double quotes inside all JSON string values (line-by-line)
  s = s
    .split("\n")
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

  // 5. Remove trailing commas before ] or } (handles ,\n} and ,})
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 6. Fix lone backslashes inside JSON string values:
  //    Escape any backslash that is not:
  //    - part of an already-escaped backslash (\\)
  //    - part of an escaped double quote (\")
  //    - part of a valid newline escape (\n)
  //    - part of a valid tab escape (\t)
  //    - part of a valid return escape (\r)
  //    - part of a valid Unicode escape sequence (\uXXXX)
  //    This successfully repairs LaTeX sequences like \sqrt, \frac, \text, \pm etc.
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    return match.replace(/\\(\\|"|n|r|t|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
      if (g1) return m;
      return "\\\\";
    });
  });

  // 7. Replace literal newlines/tabs inside JSON string values with their escape sequences
  //    This handles cases where the AI puts actual newlines inside a JSON string value
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    // Replace real newlines, carriage returns, and tabs inside JSON strings
    return match
      .replace(/\r\n/g, "\\n")
      .replace(/\r/g, "\\n")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
  });

  // 8. Try direct parse first, then escalating fallbacks
  try {
    return JSON.parse(s);
  } catch (err: any) {
    // Second pass: aggressively strip anything non-printable except basic whitespace
    const cleaned = s.replace(/[^\x20-\x7E\n\r\t]/g, (ch) => {
      // Keep common Unicode characters (accented letters, etc.) but strip control chars
      const code = ch.charCodeAt(0);
      return code > 127 ? ch : "";
    });
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
            end,
          )} ...`,
        );
      }

      // Return a minimal fallback object instead of crashing
      console.warn("[JSON Repair] Returning fallback study material object.");
      return {
        title: "Document Summary",
        type: "study_notes" as const,
        subject: "",
        topic: "",
        form_level: "",
        comprehensive_summary: "We encountered a formatting issue while processing your document. The AI generated a response that could not be parsed. Please try uploading again — this is usually a one-time glitch.",
        key_concepts: [],
        formulas_and_equations: [],
        solutions: [],
        study_tips: ["Try re-uploading the document if this summary appears incomplete."],
        common_exam_questions: [],
        related_topics: [],
        recommended_resources: [],
        quick_review_cards: [],
        safety_warning: null,
      };
    }
  }
}

// ─── Server Functions ──────────────────────────────────────────────────────────

const listNotes = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;

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
      heading: z.string(),
      subheading: z.string(),
      content: z.string(),
      // userId removed
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;

    const rlNotes = await checkPlanRateLimit(userId, "notes");
    if (!rlNotes.allowed) {
      const s = Math.ceil(rlNotes.retryAfterMs / 1000);
      throw new Error(
        rlNotes.isDaily
          ? `Daily notes ingest limit reached for your ${rlNotes.plan} plan. Resets in ${s}s.`
          : `Rate limit exceeded. Please try again in ${s}s.`
      );
    }
    const title = sanitizeUntrustedInput(data.title || "");
    const heading = data.heading ? sanitizeUntrustedInput(data.heading) : "";
    const subheading = data.subheading ? sanitizeUntrustedInput(data.subheading) : "";
    const content = sanitizeUntrustedInput(data.content || "");
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
      safety_warning?: string | null;
    }

    let parsed: StudyMaterialResponse | null = null;
    let lastError: unknown;

    for (let i = 0; i < models.length; i++) {
      const { model, name } = models[i];
      try {
        if (i > 0) {
          const { backoffDelay } = await import("@/lib/provider-backoff");
          await backoffDelay(i);
        }
        console.log(`[Notes] Trying model: ${name}`);
        const result = await generateText({
          model: model as any,
          maxTokens: 4000,
          prompt: buildNotesPrompt({ title, heading, subheading, content }),
          // heading and subheading are passed to the prompt above
        } as any);
        const textResult = result.text.trim();
        if (textResult) {
          parsed = repairAndParseJson(textResult) as StudyMaterialResponse;
          console.log(`[Notes] Success with model: ${name}`);
          break;
        }
      } catch (err) {
        console.warn(`[Notes] Model ${name} failed:`, err);
        lastError = err;
      }
    }

    if (!parsed) {
      throw (
        lastError || new Error("Failed to generate and parse notes with all configured providers.")
      );
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
    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const segment = content.slice(i, i + chunkSize);
      const fullChunkText = `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${segment}`;
      chunks.push(fullChunkText);
    }

    // Process embeddings in batches of 5 to avoid upstream rate limits
    const chunkData: any[] = [];
    const concurrencyLimit = 3;
    const INTER_BATCH_DELAY_MS = 500;
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (chunkText, batchIdx) => {
        const index = i + batchIdx;
        let embedding: number[] | null = null;
        let retries = 3;
        let delayMs = 1000;

        while (retries > 0) {
          try {
            const { embed } = await import("ai");
            const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
            const res = await embed({
              model: embeddingModel,
              value: chunkText,
              providerOptions: { google: { outputDimensionality: 768 } },
              maxRetries: 0,
            });
            embedding = res.embedding;
            break;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error(`[Embedding] Failed for chunk ${index} after all retries.`);
              break;
            }
            await new Promise((res) => setTimeout(res, delayMs + Math.random() * 200));
            delayMs *= 2;
          }
        }

        return {
          note_id: (note as any).id,
          content: chunkText,
          user_id: userId,
          embedding: embedding ? JSON.stringify(embedding) : null,
        };
      });
      const batchResults = await Promise.all(batchPromises);
      chunkData.push(...batchResults);
      if (i + concurrencyLimit < chunks.length) await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }

    // Bulk insert chunks
    const { error: chunksErr } = await supabaseAdmin.from("note_chunks").insert(chunkData);
    if (chunksErr) {
      console.error("Failed to bulk insert note chunks:", chunksErr);
      throw new Error(`Failed to save note chunks: ${chunksErr.message}`);
    }

    return note as any;
  });

const saveNoteOnly = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string(),
      heading: z.string(),
      subheading: z.string(),
      content: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;

    const rlNotes = await checkPlanRateLimit(userId, "notes");
    if (!rlNotes.allowed) {
      const s = Math.ceil(rlNotes.retryAfterMs / 1000);
      throw new Error(
        rlNotes.isDaily
          ? `Daily notes ingest limit reached for your ${rlNotes.plan} plan. Resets in ${s}s.`
          : `Rate limit exceeded. Please try again in ${s}s.`
      );
    }

    const title = sanitizeUntrustedInput(data.title || "");
    const heading = data.heading ? sanitizeUntrustedInput(data.heading) : "";
    const subheading = data.subheading ? sanitizeUntrustedInput(data.subheading) : "";
    const content = sanitizeUntrustedInput(data.content || "");
    if (!title.trim() || !content.trim()) throw new Error("Title and content are required");

    const { data: note, error: noteErr } = await supabaseAdmin
      .from("notes")
      .insert({ title, raw_text: content, summary: null, key_concepts: [], user_id: userId })
      .select()
      .single();
    if (noteErr) throw new Error(noteErr.message);

    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const segment = content.slice(i, i + chunkSize);
      const fullChunkText = `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${segment}`;
      chunks.push(fullChunkText);
    }

    const chunkData: any[] = [];
    const concurrencyLimit = 3;
    const INTER_BATCH_DELAY_MS = 500;
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (chunkText, batchIdx) => {
        const index = i + batchIdx;
        let embedding: number[] | null = null;
        let retries = 3;
        let delayMs = 1000;
        while (retries > 0) {
          try {
            const { embed } = await import("ai");
            const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
            const res = await embed({ model: embeddingModel, value: chunkText, maxRetries: 0, providerOptions: { google: { outputDimensionality: 768 } } });
            embedding = res.embedding;
            break;
          } catch (err) {
            retries--;
            if (retries === 0) { console.error(`[Embedding] Failed for chunk ${index} after all retries.`, err); break; }
            await new Promise((res) => setTimeout(res, delayMs + Math.random() * 200));
            delayMs *= 2;
          }
        }
        return { note_id: (note as any).id, content: chunkText, user_id: userId, embedding: embedding ? JSON.stringify(embedding) : null };
      });
      const batchResults = await Promise.all(batchPromises);
      chunkData.push(...batchResults);
      if (i + concurrencyLimit < chunks.length) await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }

    const { error: chunksErr } = await supabaseAdmin.from("note_chunks").insert(chunkData);
    if (chunksErr) throw new Error(`Failed to save note chunks: ${chunksErr.message}`);

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
  head: () => ({
    meta: [{ title: "Study Notes — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () => [] as Note[],
  component: NotesPage,
});

// ─── Offline Cache ─────────────────────────────────────────────────────────────

const NOTES_CACHE_KEY = "gilani_notes_cache";

function getCachedNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

function setCachedNotes(notes: Note[]) {
  try {
    localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

function NotesPage() {
  const initialNotes = Route.useLoaderData() as Note[];
  const [notes, setNotes] = useState<Note[]>(() => {
    // Seed from loader if available, otherwise fall back to cache
    if (initialNotes && initialNotes.length > 0) return initialNotes;
    return getCachedNotes();
  });
  const [isOffline, setIsOffline] = useState(false);
  const [showForm, setShowForm] = useState(() => {
    try { return sessionStorage.getItem("notes_showForm") === "true"; } catch { return false; }
  });

  const setShowFormPersisted = (val: boolean | ((v: boolean) => boolean)) => {
    setShowForm((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try { sessionStorage.setItem("notes_showForm", String(next)); } catch { }
      return next;
    });
  };
  const [title, setTitle] = useState("");
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarising, setSummarising] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [parsingFile, setParsingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [notesRateError, setNotesRateError] = useState<string | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const isRateLimited = !!(
    notesRateError?.toLowerCase().includes("limit") ||
    notesRateError?.toLowerCase().includes("rate")
  );
  const { secondsLeft, isDaily } = useRateLimitCountdown(isRateLimited ? notesRateError : null);

  // Restore rate limit warning after page refresh
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getRateLimitStatus({ data: "notes" });
        if (mounted && status.isRateLimited && !notesRateError) {
          const secs = Math.ceil(status.retryAfterMs / 1000);
          setNotesRateError(
            status.isDaily
              ? `Daily notes limit reached. Resets in ${secs}s.`
              : `Rate limit exceeded. Please try again in ${secs}s.`
          );
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load notes client-side on mount (Stale-While-Revalidate)
  useEffect(() => {
    let active = true;
    const loadNotesData = async () => {
      try {
        const fresh = await listNotes();
        if (active && fresh) {
          setCachedNotes(fresh as Note[]);
          setNotes(fresh as Note[]);
          setIsOffline(false);
        }
      } catch (err) {
        console.error("Failed to load notes on mount:", err);
        // Fallback to cache
        if (active) {
          const cached = getCachedNotes();
          if (cached.length > 0) {
            setNotes(cached);
          }
          setIsOffline(!navigator.onLine);
        }
      }
    };
    loadNotesData();
    return () => {
      active = false;
    };
  }, []);

  // Listen for online/offline transitions
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      const cached = getCachedNotes();
      if (cached.length > 0) {
        setNotes(cached);
        setIsOffline(true);
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDocUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileParsing(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocUploadError(null);
    if (e.target.files && e.target.files[0]) {
      await handleFileParsing(e.target.files[0]);
    }
    e.target.value = "";
  };

  const handleFileParsing = async (file: File) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB hard limit
    if (file.size > MAX_FILE_SIZE) {
      setDocUploadError(`File too large (${formatFileSize(file.size)}). Maximum allowed size is 2MB. Please split large documents into smaller sections.`);
      return;
    }
    setParsingFile(true);
    setDocUploadError(null);
    const toastId = toast.loading(`Extracting text from ${file.name}...`);
    try {
      const parsed = await parseDocument(file);
      const baseName = parsed.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
      setHeading("");
      setSubheading("");
      setAttachedFile({ name: parsed.name, text: parsed.text, size: parsed.size });
      toast.success("Document text extracted successfully!", { id: toastId });
    } catch (err: any) {
      const errMsg = friendlyError(err, "Failed to extract text from document.");
      setDocUploadError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!title.trim() || (!content.trim() && !attachedFile)) {
      toast.error("Please fill in both title and content.");
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (!session) { toast.error("Not signed in"); return; }
      const note = await saveNoteOnly({
        data: {
          title,
          heading,
          subheading,
          content: attachedFile
            ? `[Document: ${attachedFile.name}]\n${attachedFile.text}\n${content}`.trim()
            : content,
        },
      });
      setNotes((prev) => [note as Note, ...prev]);
      setTitle("");
      setContent("");
      setAttachedFile(null);
      setShowFormPersisted(false);
      try { sessionStorage.removeItem("notes_showForm"); } catch { }
      toast.success("Note saved!");
    } catch (err: unknown) {
      const message = (err as any)?.message || "Failed to save note";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || (!content.trim() && !attachedFile)) {
      toast.error("Please fill in both title and content.");
      return;
    }
    setSummarising(true);
    setSaving(true);
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (!session) {
        toast.error("Not signed in");
        return;
      }
      const note = await withTimeout(
        ingestNote({
          data: {
            title,
            heading,
            subheading,
            content: attachedFile
              ? `[Document: ${attachedFile.name}]

${attachedFile.text}

${content}`.trim()
              : content,
          },
        }),
        120000,
        "Saving note timed out. Please try again.",
      );
      setNotes((prev) => [note as Note, ...prev]);
      setTitle("");
      setContent("");
      setAttachedFile(null);
      setShowFormPersisted(false);
      try { sessionStorage.removeItem('notes_showForm'); } catch { }
      toast.success("Note ingested & summarised!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to save note");
      const isLimit = message.toLowerCase().includes("limit") || message.toLowerCase().includes("rate");
      if (isLimit) {
        setNotesRateError(message);
        toast.error(message, {
          action: {
            label: "Upgrade",
            onClick: () => window.dispatchEvent(new CustomEvent("custom:open-plans")),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
      setSummarising(false);
    }
  };

  return (
    <div className="w-full mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-10">
      {/* Offline Backup Badge */}
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span>
            <strong>Offline mode</strong> — Viewing cached notes from your last session. New notes
            will sync when you reconnect.
          </span>
        </div>
      )}

      {/* Rate Limit Banner */}
      {notesRateError && (
        <div className={`rounded-xl border overflow-hidden animate-in-slide ${isRateLimited
            ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30"
            : "border-destructive/30 bg-destructive/10"
          }`}>
          <div className="flex items-start gap-2.5 px-4 py-3">
            <div className="flex-shrink-0 mt-0.5">
              {isRateLimited
                ? (secondsLeft > 0
                  ? <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />)
                : <AlertCircle className="h-4 w-4 text-destructive" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${isRateLimited ? "text-amber-800 dark:text-amber-300" : "text-destructive"
                }`}>
                {isRateLimited
                  ? (isDaily ? "Daily notes limit reached" : "Slow down a little…")
                  : "Note saving failed"}
              </p>
              <p className={`text-[11px] mt-0.5 ${isRateLimited ? "text-amber-700/80 dark:text-amber-400/80" : "text-destructive/80"
                }`}>
                {isRateLimited
                  ? (isDaily
                    ? `You've used your daily notes allowance.${secondsLeft > 0 ? ` Resets in ${formatTime(secondsLeft)}.` : " Resets at midnight (EAT)."}`
                    : `You're saving notes too fast. Take a short break.${secondsLeft > 0 ? ` Try again in ${formatTime(secondsLeft)}.` : ""}`)
                  : notesRateError}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
              {isRateLimited && secondsLeft > 0 && (
                <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 tabular-nums border border-amber-500/30">
                  <Clock className="h-3 w-3" /> {formatTime(secondsLeft)}
                </div>
              )}
              {isRateLimited && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("custom:open-plans"))}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <CreditCard className="h-3 w-3" /> Upgrade
                </button>
              )}
            </div>
            <button
              onClick={() => setNotesRateError(null)}
              className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {isRateLimited && secondsLeft > 0 && (
            <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (secondsLeft / (isDaily ? 86400 : 60)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="animate-in-slide flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between text-center sm:text-left">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Study Notes
          </p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl">Upload &amp; Summarise</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste your class notes and GilaniAI will extract a summary and key concepts
            automatically.
          </p>
        </div>
        <button
          onClick={() => setShowFormPersisted((v) => !v)}
          disabled={isOffline || isRateLimited}
          className="self-center sm:self-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Note"}
        </button>
      </header>

      {/* Upload Form */}
      {showForm && (
        <div className="animate-in-slide rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-serif text-xl mb-4 text-center sm:text-left">Add Study Note</h3>
          <div className="space-y-3">
            {/* Document Upload Zone */}
            <div className="relative rounded-xl border border-border bg-background p-3 overflow-hidden">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 disabled:cursor-not-allowed"
                accept=".pdf,.docx,.doc,.txt,.md,.csv"
                onChange={handleFileChange}
                disabled={parsingFile}
              />
              <div
                className={`pointer-events-none flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors w-full text-center ${parsingFile ? "opacity-50 bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
              >
                {parsingFile
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Parsing document...</span></>
                  : <><Upload className="h-4 w-4" /><span className="hidden sm:inline">Upload Document (PDF, DOCX, TXT, CSV — max 2MB)</span><span className="sm:hidden">Upload Document (max 2MB)</span></>
                }
              </div>
            </div>

            {/* Inline upload error banner */}
            {docUploadError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-left text-xs dark:bg-destructive/10 dark:border-destructive/30 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-destructive dark:text-red-300">Document Upload Issue</span>
                  <p className="text-destructive/80 dark:text-red-400/85 mt-0.5 font-medium leading-relaxed">
                    {docUploadError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDocUploadError(null)}
                  className="rounded-lg p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                  title="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

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
                  Subheading{" "}
                  <span className="normal-case text-muted-foreground/60">(optional)</span>
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
              {/* Attached file pill */}
              {attachedFile && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="truncate text-xs font-semibold text-foreground flex-1">
                    {attachedFile.name}{" "}
                    <span className="font-mono text-[10px] text-muted-foreground font-normal">
                      ({formatFileSize(attachedFile.size)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      setDocUploadError(null);
                    }}
                    className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your class notes here…"
                rows={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {content.length.toLocaleString()} characters
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowFormPersisted(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOnly}
                disabled={saving || isRateLimited}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground shadow-sm hover:bg-muted disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {saving && !summarising && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving && !summarising ? "Saving…" : "Save only"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || isRateLimited}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {summarising && <Loader2 className="h-4 w-4 animate-spin" />}
                {summarising ? "Summarising…" : "Save & Summarise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 sm:p-10 text-center">
          <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No notes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first note to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const open = expanded === note.id;
            return (
              <div
                key={note.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md group"
              >
                <button
                  className="w-full flex items-center justify-between px-3 py-3 sm:p-5 text-left gap-4"
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
                  <div className="border-t border-border px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-4 space-y-3 animate-in-slide">
                    {note.summary && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          AI Summary
                        </p>
                        <div className="text-sm leading-relaxed text-foreground/90 markdown-note-summary break-words overflow-hidden">
                          <Suspense
                            fallback={
                              <div className="h-10 w-full animate-pulse bg-muted/50 rounded" />
                            }
                          >
                            <LazyMarkdownRenderer content={note.summary} />
                          </Suspense>
                        </div>
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
                              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary max-w-[200px] truncate" title={c}
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
