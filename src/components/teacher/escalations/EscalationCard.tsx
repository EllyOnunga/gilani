import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { EscalationDetail } from "./EscalationDetail";
import { REASON_LABELS } from "./reasonLabels";
import type { Escalation } from "@/components/teacher/hooks/useTeacherEscalations";

type Props = {
  esc: Escalation;
  isOpen: boolean;
  onOpen: () => void;
  convoMessages: any[];
  loadingMessages: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  saving: boolean;
  onResolve: (id: string) => void;
  onCancel: () => void;
  urgent?: boolean;
};

export function EscalationCard({
  esc,
  isOpen,
  onOpen,
  convoMessages,
  loadingMessages,
  answer,
  setAnswer,
  saving,
  onResolve,
  onCancel,
  urgent = false,
}: Props) {
  const reasonMeta = REASON_LABELS[esc.reason] ?? {
    label: esc.reason,
    color: "text-muted-foreground border-border",
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow ${urgent ? "border-red-300 dark:border-red-800" : "border-border"} ${isOpen ? "shadow-md" : ""}`}
    >
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-inner">
            {esc.student_avatar ? (
              esc.student_avatar.startsWith("preset:") ? (
                <span className="font-serif text-xs font-bold text-primary capitalize">
                  {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
                </span>
              ) : (
                <img src={esc.student_avatar} alt="Avatar" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="font-serif text-xs font-bold text-primary capitalize">
                {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-sans text-sm font-bold text-foreground">
                {esc.student_name || "Student"}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}
              >
                {reasonMeta.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                #{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}
              </span>
              {esc.status === "resolved" && (
                <span className="rounded-full border border-green-300 dark:border-green-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {esc.created_at
                ? new Date(esc.created_at).toLocaleString("en-KE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isOpen ? "border-border bg-muted text-muted-foreground" : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"}`}
          >
            {isOpen ? "Collapse" : "Respond"}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="lg:hidden">
          <EscalationDetail
            esc={esc}
            convoMessages={convoMessages}
            loadingMessages={loadingMessages}
            answer={answer}
            setAnswer={setAnswer}
            saving={saving}
            onResolve={onResolve}
            onCancel={onCancel}
            variant="inline"
          />
        </div>
      )}
    </div>
  );
}
