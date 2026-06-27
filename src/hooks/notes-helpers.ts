import { useState, useEffect, useRef } from "react";
import { getRateLimitStatus } from "@/lib/rate-limit.server";

// ─── Offline Cache ─────────────────────────────────────────────────────────────

const NOTES_CACHE_KEY = "gilani_notes_cache";

export function getCachedNotes(): any[] {
  try {
    const raw = localStorage.getItem(NOTES_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCachedNotes(notes: any[]) {
  try {
    localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
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

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function useRateLimitCountdown(errorMsg: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!errorMsg) {
      setSecondsLeft(0);
      return;
    }
    const daily = errorMsg.toLowerCase().includes("daily");
    setIsDaily(daily);
    const match = errorMsg.match(/(\d+)s[./]?/);
    const secs = match ? parseInt(match[1], 10) : 0;
    if (secs > 0) {
      setSecondsLeft(secs);
      setMaxSeconds(secs);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [errorMsg]);

  return { secondsLeft, isDaily, maxSeconds };
}

export function useRateLimitRestore(setError: (msg: string) => void, currentError: string | null) {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getRateLimitStatus({ data: "notes" });
        if (mounted && status.isRateLimited && !currentError) {
          const secs = Math.ceil(status.retryAfterMs / 1000);
          setError(
            status.isDaily
              ? `Daily notes limit reached. Resets in ${secs}s.`
              : `Rate limit exceeded. Please try again in ${secs}s.`,
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
}
