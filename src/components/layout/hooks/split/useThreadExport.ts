import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Thread } from "@/lib/hooks/useThreadsQuery";

export function useThreadExport(threads: Thread[]) {
  const [exportingThreadId, setExportingThreadId] = useState<string | null>(null);

  const handleExportThreadPDF = async (threadId: string) => {
    setExportingThreadId(threadId);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const mapped = (data ?? []).map((m: any) => {
        let resolvedParts: any[] | null = null;
        if (Array.isArray(m.parts) && m.parts.length > 0) resolvedParts = m.parts;
        else if (typeof m.parts === "string" && m.parts.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(m.parts);
            if (Array.isArray(parsed) && parsed.length > 0) resolvedParts = parsed;
          } catch {}
        }
        return {
          id: m.id ?? crypto.randomUUID(),
          role: m.role as "user" | "assistant",
          content: m.content || "",
          parts: resolvedParts ?? [{ type: "text" as const, text: m.content || "" }],
          createdAt: m.created_at ? new Date(m.created_at) : new Date(),
        };
      });
      const title = threads.find((t) => t.id === threadId)?.title || "study-session";
      const { exportAsPDF } = await import("@/lib/export-utils");
      await exportAsPDF(mapped as any, title);
    } catch (err) {
      console.error("Failed to export thread PDF:", err);
      toast.error("Export failed — try again or use a different browser");
    } finally {
      setExportingThreadId(null);
    }
  };

  return { exportingThreadId, handleExportThreadPDF };
}
