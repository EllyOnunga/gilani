import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MessageSquare,
  FileText,
  AlertCircle,
  Clock,
  CreditCard,
  X,
} from "lucide-react";
import { useRateLimitCountdown, formatTime } from "./ChatInput";

const SUBJECTS = [
  { icon: "✅", label: "Homework Help", prompt: "Check my homework answers before I submit" },
  { icon: "📐", label: "Math", prompt: "Help me solve a maths problem step by step" },
  { icon: "🧪", label: "Chemistry", prompt: "Explain periodic table trends for Chemistry" },
  { icon: "🌱", label: "Biology", prompt: "Help me understand photosynthesis for Biology" },
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
  chatError?: string | null;
  isRateLimited?: boolean;
  messagesUsed?: number;
  messagesMax?: number;
  onUpgrade?: () => void;
  onRateLimitExpired?: () => void;
};

export function EmptyState({
  onPromptClick,
  recentThreads = [],
  allThreadsPath,
  chatError,
  isRateLimited,
  messagesUsed = 0,
  messagesMax,
  onUpgrade,
  onRateLimitExpired,
}: Props) {
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);

  const { secondsLeft, isDaily } = useRateLimitCountdown(
    isRateLimited ? (chatError ?? null) : null,
    onRateLimitExpired,
  );

  const usagePct = (messagesMax ?? 0) > 0 ? messagesUsed / (messagesMax ?? 1) : 0;
  const isApproachingLimit =
    (messagesMax ?? 999_999) < 999_999 &&
    usagePct >= 0.8 &&
    messagesUsed < (messagesMax ?? 999_999) &&
    !isRateLimited;
  const remaining = Math.max(0, (messagesMax ?? 0) - messagesUsed);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 gap-10 w-full max-w-3xl mx-auto flex-1 animate-in fade-in duration-500 pb-12">
      {/* Banners */}
      <div className="w-full flex flex-col gap-2 max-w-xl">
        {isApproachingLimit && !dismissedBanners.includes("approaching") && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-900/30 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 leading-snug">
                  {remaining <= 1
                    ? `You've used all ${messagesMax} messages today`
                    : `You've hit ${Math.round(usagePct * 100)}% of your daily limit`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onUpgrade && (
                  <button
                    onClick={onUpgrade}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-orange-600 active:scale-95 transition-all duration-200"
                  >
                    <CreditCard className="h-3 w-3" /> Upgrade
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedBanners((p) => [...p, "approaching"])}
                  className="rounded-lg p-1 text-orange-600 hover:bg-orange-200 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* thin usage bar */}
            <div className="h-0.5 bg-orange-100 dark:bg-orange-900/40">
              <div
                className="h-full bg-orange-400 dark:bg-orange-500 transition-all duration-500"
                style={{ width: `${Math.min(100, usagePct * 100)}%` }}
              />
            </div>
          </div>
        )}

        {isRateLimited && !dismissedBanners.includes("ratelimit") && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 dark:border-destructive/30 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-4 w-4 flex-shrink-0 text-destructive dark:text-red-400" />
                <p className="text-xs font-semibold text-destructive dark:text-red-300 leading-snug">
                  {isDaily
                    ? secondsLeft > 0
                      ? `Daily limit hit — resets in ${formatTime(secondsLeft)}`
                      : "Daily limit hit — resets at midnight (EAT)"
                    : secondsLeft > 0
                      ? `Too many messages — try again in ${formatTime(secondsLeft)}`
                      : "Too many messages — please wait a moment"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onUpgrade && (
                  <button
                    onClick={onUpgrade}
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-destructive px-2.5 py-1 text-[10px] font-bold text-white hover:bg-destructive/90 active:scale-95 transition-all"
                  >
                    <CreditCard className="h-3 w-3" /> Upgrade
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedBanners((p) => [...p, "ratelimit"])}
                  className="rounded-lg p-1 text-destructive/80 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {chatError && !isRateLimited && !dismissedBanners.includes("error") && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 dark:border-destructive/30 backdrop-blur-sm shadow-sm animate-in-slide">
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-destructive dark:text-red-300">
                  Chat Session Issue
                </p>
                <p className="text-[11px] text-destructive/80 dark:text-red-400/85 mt-0.5 font-medium leading-relaxed">
                  {(() => {
                    try {
                      const parsed = JSON.parse(chatError);
                      return parsed.error || parsed.message || chatError;
                    } catch {
                      return chatError;
                    }
                  })()}
                </p>
              </div>
              <button
                onClick={() => setDismissedBanners((p) => [...p, "error"])}
                className="flex-shrink-0 rounded-lg p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Dismiss error"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Welcome Section */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <span className="text-2xl">🤖</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          How can I help you today?
        </h1>
      </div>

      {/* Subject Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        {SUBJECTS.map((subject, index) => (
          <button
            key={subject.label}
            onClick={() => onPromptClick(subject.prompt)}
            className="flex flex-col items-start gap-2 bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all text-left group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">
              {subject.icon}
            </div>
            <span className="text-sm font-semibold text-foreground/90 group-hover:text-foreground">
              {subject.label}
            </span>
          </button>
        ))}
      </div>

      {/* Recent Threads */}
      {recentThreads.length > 0 && (
        <div className="w-full flex flex-col items-center mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Recent Chats
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
            {recentThreads.slice(0, 3).map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  window.location.href = `/tutor/${thread.id}`;
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate max-w-[150px]">{thread.title || "New Conversation"}</span>
              </button>
            ))}
            {recentThreads.length > 3 && allThreadsPath && (
              <Link
                to={allThreadsPath}
                className="flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-all"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
