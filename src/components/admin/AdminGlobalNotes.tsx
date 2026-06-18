// ─── AdminGlobalNotes.tsx ─────────────────────────────────────────────────────
// Drop this file into src/components/admin/AdminGlobalNotes.tsx
// Then import and add it as a new tab in admin.users.tsx (see bottom of file)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest, requireRole } from "@/lib/api-auth.server";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { parseDocument } from "@/lib/document-parser";
import { z } from "zod";
import { Upload, Loader2, FileText, X, BookOpen, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type GlobalNote = {
    id: string;
    title: string;
    subject: string | null;
    created_at: string;
};

// ─── Server: ingest a global note (admin only) ────────────────────────────────
export const ingestGlobalNote = createServerFn({ method: "POST" })
    .inputValidator(
        z.object({
            title: z.string(),
            subject: z.string().optional(),
            heading: z.string().optional(),
            subheading: z.string().optional(),
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

        const isAdmin = await requireRole(authResult.userId, "admin");
        if (!isAdmin) throw new Error("Forbidden: admin only");

        const title = sanitizeUntrustedInput(data.title || "");
        const subject = data.subject ? sanitizeUntrustedInput(data.subject) : null;
        const heading = data.heading ? sanitizeUntrustedInput(data.heading) : "";
        const subheading = data.subheading ? sanitizeUntrustedInput(data.subheading) : "";
        const content = sanitizeUntrustedInput(data.content || "");

        if (!title.trim() || !content.trim()) throw new Error("Title and content are required");

        // ── Insert global note (raw upload, no AI summarization) ───────────────────
        const { data: note, error: noteErr } = await supabaseAdmin
            .from("global_notes")
            .insert({ title, subject, raw_text: content })
            .select()
            .single();
        if (noteErr) throw new Error(noteErr.message);

        // ── Chunk + embed ─────────────────────────────────────────────────────────
        const chunkSize = 2000;
        const chunks: string[] = [];
        for (let i = 0; i < content.length; i += chunkSize) {
            const seg = content.slice(i, i + chunkSize);
            chunks.push(
                `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${seg}`,
            );
        }

        const chunkData: any[] = [];
        const BATCH = 3, DELAY = 500;
        for (let i = 0; i < chunks.length; i += BATCH) {
            const batch = chunks.slice(i, i + BATCH);
            const results = await Promise.all(
                batch.map(async (text, bi) => {
                    let embedding: number[] | null = null, retries = 3, delay = 1000;
                    while (retries > 0) {
                        try {
                            const { embed } = await import("ai");
                            const embModel = createLovableAiGatewayProvider().textEmbeddingModel();
                            const res = await embed({ model: embModel, value: text, maxRetries: 0 });
                            embedding = res.embedding;
                            break;
                        } catch {
                            retries--;
                            if (retries === 0) break;
                            await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
                            delay *= 2;
                        }
                    }
                    return { note_id: (note as any).id, content: text, embedding: embedding ? JSON.stringify(embedding) : null };
                }),
            );
            chunkData.push(...results);
            if (i + BATCH < chunks.length) await new Promise((r) => setTimeout(r, DELAY));
        }

        const { error: chunksErr } = await supabaseAdmin.from("global_note_chunks").insert(chunkData);
        if (chunksErr) throw new Error(`Failed to save chunks: ${chunksErr.message}`);

        return { id: (note as any).id, title };
    });

// ─── Server: list global notes ────────────────────────────────────────────────
export const listGlobalNotes = createServerFn({ method: "GET" }).handler(async () => {
    const request = getRequest();
    let authResult;
    try { authResult = await authenticateRequest(request); }
    catch (err) { throw new Error("Unauthorized"); }

    const isAdmin = await requireRole(authResult.userId, "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await supabaseAdmin
        .from("global_notes")
        .select("id, title, subject, created_at")
        .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
});

// ─── Server: delete global note ───────────────────────────────────────────────
export const deleteGlobalNote = createServerFn({ method: "POST" })
    .inputValidator(z.object({ id: z.string().uuid() }))
    .handler(async ({ data }) => {
        const request = getRequest();
        let authResult;
        try { authResult = await authenticateRequest(request); }
        catch (err) { throw new Error("Unauthorized"); }

        const isAdmin = await requireRole(authResult.userId, "admin");
        if (!isAdmin) throw new Error("Forbidden");

        const { error } = await supabaseAdmin.from("global_notes").delete().eq("id", data.id);
        if (error) throw new Error(error.message);
        return { deleted: data.id };
    });

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminGlobalNotes() {
    const [notes, setNotes] = useState<GlobalNote[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [heading, setHeading] = useState("");
    const [subheading, setSubheading] = useState("");
    const [content, setContent] = useState("");
    const [parsingFile, setParsingFile] = useState(false);
    const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load notes once
    async function loadNotes() {
        setLoading(true);
        try {
            const data = await listGlobalNotes();
            setNotes(data as GlobalNote[]);
            setLoaded(true);
        } catch (err: any) {
            toast.error(err.message ?? "Failed to load global notes");
        } finally {
            setLoading(false);
        }
    }

    // File handling
    async function handleFile(file: File) {
        if (file.size > 2 * 1024 * 1024) {
            setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`);
            return;
        }
        setParsingFile(true);
        setUploadError(null);
        try {
            const extracted = await parseDocument(file);
            setAttachedFile({ name: file.name, text: extracted.text, size: file.size });
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
        } catch (err: any) {
            setUploadError(err.message ?? "Could not parse file");
        } finally {
            setParsingFile(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    async function handleSubmit() {
        const finalContent = attachedFile ? attachedFile.text : content;
        if (!title.trim() || !finalContent.trim()) {
            setUploadError("Title and content (or file) are required.");
            return;
        }
        setUploading(true);
        setUploadError(null);
        try {
            const result = await ingestGlobalNote({
                data: { title, subject, heading, subheading, content: finalContent },
            });
            toast.success(`"${(result as any).title}" added to global notes`);
            // Reset form
            setTitle(""); setSubject(""); setHeading(""); setSubheading("");
            setContent(""); setAttachedFile(null);
            // Refresh list
            const data = await listGlobalNotes();
            setNotes(data as GlobalNote[]);
        } catch (err: any) {
            setUploadError(err.message ?? "Upload failed");
            toast.error(err.message ?? "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(id: string, noteTitle: string) {
        if (!confirm(`Delete "${noteTitle}"? This also removes all its chunks.`)) return;
        try {
            await deleteGlobalNote({ data: { id } });
            setNotes((prev) => prev.filter((n) => n.id !== id));
            toast.success("Global note deleted");
        } catch (err: any) {
            toast.error(err.message ?? "Delete failed");
        }
    }

    // Lazy-load notes on first render of this tab
    if (!loaded && !loading) loadNotes();

    return (
        <div className="space-y-6">
            {/* ── Upload form ── */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                        Add Global Note
                    </h3>
                </div>

                {/* Title + Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Title *</label>
                        <input
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="e.g. Form 3 Chemistry — Acids & Bases"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                        <input
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="e.g. Chemistry"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                </div>

                {/* Heading + Subheading */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Heading</label>
                        <input
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="e.g. Unit 2"
                            value={heading}
                            onChange={(e) => setHeading(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Subheading</label>
                        <input
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="e.g. Topic 2.3"
                            value={subheading}
                            onChange={(e) => setSubheading(e.target.value)}
                        />
                    </div>
                </div>

                {/* File drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => { if (!parsingFile) fileInputRef.current?.click(); }}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-colors ${dragActive
                        ? "border-primary bg-primary/5 text-primary"
                        : attachedFile
                            ? "border-green-500/50 bg-green-500/5 text-green-600"
                            : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    {parsingFile ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /><span>Parsing file…</span></>
                    ) : attachedFile ? (
                        <>
                            <FileText className="h-4 w-4" />
                            <span className="flex-1 truncate">{attachedFile.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }}
                                className="ml-auto rounded p-0.5 hover:bg-destructive/10"
                            >
                                <X className="h-3.5 w-3.5 text-destructive" />
                            </button>
                        </>
                    ) : (
                        <><Upload className="h-4 w-4" /><span>Upload document (PDF, DOCX, TXT, CSV — max 2 MB)</span></>
                    )}
                </div>

                {/* Manual content textarea (shown when no file) */}
                {!attachedFile && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                            Content * <span className="font-normal">(paste text or upload a file above)</span>
                        </label>
                        <textarea
                            rows={6}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                            placeholder="Paste note content here…"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                )}

                {/* Error */}
                {uploadError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                        <span className="font-semibold">Error:</span>
                        <span>{uploadError}</span>
                        <button onClick={() => setUploadError(null)} className="ml-auto">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={uploading || parsingFile}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : <><Upload className="h-4 w-4" />Upload Global Note</>}
                </button>
                {uploading && (
                    <p className="text-xs text-muted-foreground">Summarising and embedding — this may take 15–30 seconds…</p>
                )}
            </div>

            {/* ── Existing global notes ── */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                            Global Notes ({notes.length})
                        </h3>
                    </div>
                    <button
                        onClick={loadNotes}
                        disabled={loading}
                        className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : notes.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No global notes yet.</p>
                ) : (
                    <table className="w-full text-sm min-w-[320px]">
                        <thead>
                            <tr className="border-b border-border/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="pb-2 pr-4">Title</th>
                                <th className="pb-2 pr-4 hidden sm:table-cell">Subject</th>
                                <th className="pb-2 pr-4 hidden sm:table-cell">Added</th>
                                <th className="pb-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {notes.map((n) => (
                                <tr key={n.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 pr-4 font-medium">{n.title}</td>
                                    <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">
                                        {n.subject ?? <span className="italic opacity-50">—</span>}
                                    </td>
                                    <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell text-xs">
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-2.5 text-right">
                                        <button
                                            onClick={() => handleDelete(n.id, n.title)}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}


