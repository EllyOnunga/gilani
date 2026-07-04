import React from "react";
import { Link } from "@tanstack/react-router";
import {
  FileUp,
  Camera,
  Mic,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

const SUBJECTS = [
  { icon: "📐", label: "Math", prompt: "Help me solve a maths problem step by step" },
  { icon: "🧪", label: "Chemistry", prompt: "Explain periodic table trends for Chemistry" },
  { icon: "🌍", label: "Geography", prompt: "Explain major landforms for Geography" },
  { icon: "🌱", label: "Biology", prompt: "Help me understand photosynthesis for Biology" },
  { icon: "📖", label: "History", prompt: "What are the causes of World War I?" },
  { icon: "💻", label: "Coding", prompt: "Teach me the basics of programming with examples" },
  { icon: "✍️", label: "Essays", prompt: "Help me structure and write an essay" },
  { icon: "📄", label: "Summarize PDF", prompt: "I'll upload a document — please summarise the key points" },
];

type Props = {
  onPromptClick: (prompt: string) => void;
  onUploadClick?: () => void;
  onScanClick?: () => void;
  onVoiceClick?: () => void;
  recentThreads?: { id: string; title?: string | null }[];
  allThreadsPath?: string;
};

export function EmptyState({
  onPromptClick,
  onUploadClick,
  onScanClick,
  onVoiceClick,
  recentThreads = [],
  allThreadsPath,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-start h-full px-5 pt-8 pb-16 gap-8 overflow-y-auto w-full max-w-2xl mx-auto">
      
      {/* Welcome Section */}
      <div className="flex flex-col items-center text-center space-y-4 animate-in-slide">
        <div className="text-4xl bg-primary/20 p-4 rounded-full flex items-center justify-center">
          🤖
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">GilaniAI</h1>
          <h2 className="text-xl text-primary font-medium mt-1">Your AI Study Assistant</h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-[280px]">
          Ask questions, upload notes, or solve homework.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 w-full animate-in-slide" style={{ animationDelay: "100ms" }}>
        <button
          onClick={onUploadClick}
          className="flex flex-col items-center justify-center gap-2 bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-muted/40 transition-all text-sm font-medium text-foreground active:scale-[0.97]"
          title="Upload a document (PDF, DOCX, TXT)"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <FileUp className="h-5 w-5" />
          </div>
          Upload
        </button>
        <button
          onClick={onScanClick}
          className="flex flex-col items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl p-4 shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm font-bold active:scale-[0.97]"
          title="Scan a question with your camera"
        >
          <div className="h-10 w-10 rounded-full bg-black/20 flex items-center justify-center">
            <Camera className="h-5 w-5" />
          </div>
          Scan
        </button>
        <button
          onClick={onVoiceClick}
          className="flex flex-col items-center justify-center gap-2 bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-muted/40 transition-all text-sm font-medium text-foreground active:scale-[0.97]"
          title="Voice input"
        >
          <div className="h-10 w-10 rounded-full bg-accent/20 text-accent flex items-center justify-center">
            <Mic className="h-5 w-5" />
          </div>
          Voice
        </button>
      </div>

      <hr className="w-full border-border/40" />

      {/* Subject Cards */}
      <div className="w-full animate-in-slide" style={{ animationDelay: "200ms" }}>
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPromptClick(s.prompt)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-all hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98]"
            >
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <span className="font-semibold text-foreground text-sm truncate">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Continue Learning */}
      {recentThreads.length > 0 && (
        <>
          <hr className="w-full border-border/40" />
          <div className="w-full animate-in-slide" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                Continue Learning
              </h3>
              <Link
                to="/tutor/chats"
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {recentThreads.map((t) => (
                <Link
                  key={t.id}
                  to="/tutor/$threadId"
                  params={{ threadId: t.id } as any}
                  className="flex items-center gap-3 w-full text-left p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                >
                  <div className="h-8 w-8 rounded bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {t.title && t.title !== "New thread" && t.title !== "New tutor session"
                      ? t.title
                      : "Untitled Chat"}
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