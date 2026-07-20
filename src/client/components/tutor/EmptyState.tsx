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
  { label: "Homework", prompt: "Check my homework answers before I submit" },
  { label: "Code", prompt: "Teach me the basics of programming with examples" },
  { label: "Maths", prompt: "Help me solve a maths problem step by step" },
  { label: "Essays", prompt: "Help me structure and write an essay" },
];

const MORNING_TEMPLATES = [
  "Good Morning{name}! What do you want to learn today?",
  "Good Morning{name}! Ready to get started?",
  "Rise and shine{name}! Let's learn something new today.",
];
const AFTERNOON_TEMPLATES = [
  "Good Afternoon{name}! What's up today?",
  "Good Afternoon{name}! Ready to keep learning?",
  "Good Afternoon{name}! What do you want to explore today?",
];
const EVENING_TEMPLATES = [
  "Good Evening{name}! What's up today?",
  "Good Evening{name}! Let's make progress before the day ends.",
  "Good Evening{name}! What would you like to study tonight?",
];
const MONDAY_TEMPLATES = [
  "Happy New Week{name}! Your study awaits.",
  "Happy New Week{name}! Let's make this week count.",
  "It's a brand new week{name}. Ready to dive in?",
];
const FRIDAY_TEMPLATES = [
  "Happy Friday{name}! What's up today?",
  "Happy Friday{name}! Let's finish the week strong.",
  "It's Friday{name}! What do you want to learn today?",
];

function getGreeting(userName?: string | null): string {
  const firstName = userName ? userName.split(" ")[0] : "";
  const nameToken = firstName ? `, ${firstName}` : "";

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday ... 1 = Monday ... 5 = Friday

  const timeTemplates =
    hour < 12 ? MORNING_TEMPLATES : hour < 17 ? AFTERNOON_TEMPLATES : EVENING_TEMPLATES;

  const pool = [
    ...timeTemplates,
    ...(day === 1 ? MONDAY_TEMPLATES : []),
    ...(day === 5 ? FRIDAY_TEMPLATES : []),
  ];

  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace("{name}", nameToken);
}

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
  /** First name of the signed-in user for the personalised greeting */
  userName?: string | null;
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
  userName,
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

  // Recomputed on every mount, so it changes each time the user visits the empty state
  const greeting = useMemo(() => getGreeting(userName), []);

  return (
    <div className="flex flex-col items-center justify-start min-h-[60vh] pt-6 md:pt-12 px-4 sm:px-6 gap-6 md:gap-8 w-full max-w-3xl mx-auto flex-1 animate-in fade-in duration-500 pb-12">
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
      <div className="flex flex-col items-center text-center space-y-1">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {greeting}
        </h1>
      </div>

      {/* Prompt Pills */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-2 w-full">
        {SUBJECTS.map((subject) => (
          <button
            key={subject.label}
            onClick={() => onPromptClick(subject.prompt)}
            className="rounded-full border border-border/60 bg-transparent px-4 py-2 text-sm font-medium text-foreground/80 hover:border-primary/40 hover:text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all"
          >
            {subject.label}
          </button>
        ))}
      </div>

      {/* Recent Threads */}
      {recentThreads.length > 0 && (
        <div className="w-full flex flex-col mt-2">
          <div className="flex items-center justify-between w-full mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider m-0">
              Recent Chats
            </p>
            {recentThreads.length > 3 && allThreadsPath && (
              <Link
                to={allThreadsPath}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1 w-full">
            {recentThreads.slice(0, 3).map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  window.location.href = `/tutor/${thread.id}`;
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all text-left"
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{thread.title || "New Conversation"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
