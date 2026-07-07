import React from "react";
import { Link } from "@tanstack/react-router";
import {
  FileUp,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

const SUBJECTS = [
  { icon: "✅", label: "Homework Help", prompt: "Check my homework answers before I submit" },
  { icon: "📐", label: "Math", prompt: "Help me solve a maths problem step by step" },
  { icon: "🧪", label: "Chemistry", prompt: "Explain periodic table trends for Chemistry" },
  { icon: "🌍", label: "Geography", prompt: "Explain major landforms for Geography" },
  { icon: "🌱", label: "Biology", prompt: "Help me understand photosynthesis for Biology" },
  { icon: "📖", label: "History", prompt: "What are the causes of World War I?" },
  { icon: "💻", label: "Coding", prompt: "Teach me the basics of programming with examples" },
  { icon: "✍️", label: "Essays", prompt: "Help me structure and write an essay" },
];

type Props = {
  onPromptClick: (prompt: string) => void;
  onUploadClick?: () => void;
  onScanClick?: () => void;
  onVoiceClick?: () => void;
  isListening?: boolean;
  recentThreads?: { id: string; title?: string | null }[];
  allThreadsPath?: string;
};

export function EmptyState({
  onPromptClick,
  onUploadClick,
  onScanClick,
  onVoiceClick,
  isListening,
  recentThreads = [],
  allThreadsPath,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-start h-full px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-28 gap-6 sm:gap-8 overflow-y-auto w-full max-w-3xl mx-auto">

      {/* Welcome Section */}
      <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 animate-in-slide">
        <div className="text-3xl sm:text-4xl bg-primary/20 p-3 sm:p-4 rounded-full flex items-center justify-center">
          🤖
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">GilaniAI</h1>
          <h2 className="text-lg sm:text-xl text-primary font-medium mt-1">Your AI Study Assistant</h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-[280px]">
          Ask questions, upload notes, or solve homework.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-2 sm:gap-3 w-full animate-in-slide" style={{ animationDelay: "100ms" }}>
        <button
          onClick={onUploadClick}
          className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 bg-card border border-border rounded-2xl p-3 sm:p-4 hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all text-xs sm:text-sm font-medium text-foreground active:scale-[0.97] min-w-[120px]"
          title="Upload a document (PDF, DOCX, TXT)"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FileUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="truncate w-full text-center">Upload Document</span>
        </button>
      </div>

      <hr className="w-full border-border/40" />

      {/* Subject Cards */}
      <div className="w-full animate-in-slide" style={{ animationDelay: "200ms" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {SUBJECTS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPromptClick(s.prompt)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 sm:px-4 py-3.5 sm:py-4 text-left transition-all hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] min-w-0"
            >
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <span className="font-semibold text-foreground text-sm truncate">
                {s.label}
              </span>
            </button>
          ))}
          <Link
            to="/tutor/documents"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 sm:px-4 py-3.5 sm:py-4 text-left transition-all hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] min-w-0"
          >
            <span className="text-xl flex-shrink-0">📄</span>
            <span className="font-semibold text-foreground text-sm truncate">
              Summarize a Document
            </span>
          </Link>
        </div>
      </div>

      {/* Continue Learning */}
      {recentThreads.length > 0 && (
        <>
          <hr className="w-full border-border/40" />
          <div className="w-full animate-in-slide" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                Continue Learning
              </h3>
              {allThreadsPath && (
                <Link
                  to={allThreadsPath}
                  className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded font-medium flex items-center gap-1"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {recentThreads.map((t) => (
                <Link
                  key={t.id}
                  to="/tutor/$threadId"
                  params={{ threadId: t.id } as any}
                  className="flex items-center gap-3 w-full text-left p-3 rounded-xl hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors group min-w-0"
                >
                  <div className="h-8 w-8 rounded bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate min-w-0">
                    {t.title || ""}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
