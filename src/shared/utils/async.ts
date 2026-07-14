class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

// ─── Friendly error message sanitiser ─────────────────────────────────────────
// Maps raw technical error strings (from Supabase, AI SDK, network, etc.)
// to calm, plain-English copy that is safe to show directly to students.

const ERROR_PATTERNS: Array<{ test: RegExp | string; message: string }> = [
  // Network / connectivity
  { test: /failed to fetch/i, message: "Can't reach the server. Check your connection." },
  { test: /networkerror/i, message: "Network error. Please check your connection." },
  { test: /load failed/i, message: "Failed to load. Please try again." },
  { test: /err_internet_disconnected/i, message: "You're offline. Reconnect and try again." },
  { test: /err_connection_refused/i, message: "Can't connect to the server. Try again shortly." },
  // Auth
  { test: /invalid login credentials/i, message: "Incorrect email or password." },
  { test: /email not confirmed/i, message: "Please verify your email before signing in." },
  { test: /user already registered/i, message: "An account with this email already exists." },
  { test: /invalid email/i, message: "Please enter a valid email address." },
  {
    test: /password should be at least/i,
    message: "Password too short — use at least 8 characters.",
  },
  {
    test: /for security purposes.*after \d+ seconds/i,
    message: "Too many attempts. Please wait and try again.",
  },
  { test: /token has expired/i, message: "Your session has expired. Please sign in again." },
  { test: /jwt expired/i, message: "Your session has expired. Please sign in again." },
  { test: /unauthorized/i, message: "Please sign in to continue." },
  { test: /401/i, message: "Your session has expired. Please sign in again." },
  // Database / RLS
  { test: /row.level security/i, message: "You don't have permission to do that." },
  { test: /violates.*policy/i, message: "That action isn't allowed on your current plan." },
  {
    test: /violates.*constraint/i,
    message: "Something went wrong while saving. Please try again.",
  },
  { test: /duplicate key/i, message: "That record already exists." },
  { test: /foreign key/i, message: "Something went wrong while saving. Please try again." },
  {
    test: /relation .* does not exist/i,
    message: "A server error occurred. Please contact support.",
  },
  // AI / generation
  {
    test: /all configured providers/i,
    message: "AI is temporarily unavailable. Please try again.",
  },
  {
    test: /context window/i,
    message: "Your message is too long. Please shorten it and try again.",
  },
  { test: /content policy/i, message: "That content couldn't be processed. Please rephrase." },
  { test: /quota exceeded/i, message: "AI quota exceeded. Try again later or upgrade your plan." },
  { test: /overloaded/i, message: "AI is overloaded right now. Please try again in a moment." },
  { test: /RESOURCE_EXHAUSTED/i, message: "AI quota reached. Please try again in a moment." },
  // Rate limiting
  { test: /too many requests/i, message: "You're going too fast. Please wait a moment." },
  { test: /rate limit/i, message: "Too many requests. Please slow down and try again." },
  { test: /daily.*limit/i, message: "You've reached your daily limit. Try again tomorrow." },
  // Timeout
  { test: /timed out/i, message: "Request took too long. Please try again." },
  { test: /timeout/i, message: "Request timed out. Please try again." },
  // Generic server
  { test: /internal server error/i, message: "Something went wrong on our end. Please try again." },
  {
    test: /service unavailable/i,
    message: "Service is temporarily unavailable. Try again shortly.",
  },
  { test: /bad gateway/i, message: "Server error. Please try again shortly." },
  {
    test: /invalid request payload/i,
    message: "Your request couldn't be processed. Please try again.",
  },
  // Storage / files
  { test: /file too large/i, message: "File is too large. Please use a smaller file." },
  { test: /unsupported.*type/i, message: "That file type isn't supported." },
  { test: /storage.*error/i, message: "File upload failed. Please try again." },
  // M-Pesa / payments
  { test: /stk push failed/i, message: "Payment request failed. Please try again." },
  { test: /failed to get.*token/i, message: "Payment service unavailable. Please try again." },
  { test: /failed to upgrade/i, message: "Plan upgrade failed. Please contact support." },
  { test: /failed to credit/i, message: "Token credit failed. Please contact support." },
];

/**
 * Converts a raw error message into friendly, student-facing copy.
 * Falls back to the original message only if it looks safe (short, no stack traces, no technical jargon).
 */
function sanitizeErrorMessage(raw: string, fallback: string): string {
  for (const { test, message } of ERROR_PATTERNS) {
    const matched = typeof test === "string" ? raw.includes(test) : test.test(raw);
    if (matched) return message;
  }

  // Heuristics: if the raw message looks like a stack trace, SQL dump, or is
  // excessively long, replace it with the fallback.
  const looksInternal =
    raw.length > 200 ||
    /at [A-Z][\w$.]+\s*\(/i.test(raw) || // stack frame
    /\bPostgresError\b/i.test(raw) ||
    /\bsyntax error\b/i.test(raw) ||
    /\bERROR:\s/i.test(raw) ||
    /\bError:\s/.test(raw.slice(0, 6)); // leading "Error:"

  return looksInternal ? fallback : raw;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  let raw: string;
  if (error instanceof TimeoutError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError")
    return "Request timed out. Please try again.";
  if (error instanceof Error && error.message) {
    raw = error.message;
  } else {
    return fallback;
  }
  return sanitizeErrorMessage(raw, fallback);
}

/**
 * Convenience wrapper for auth pages where the error is a Supabase AuthError
 * (has a `.message` string) but you don't have a domain-specific fallback.
 * Returns a friendly, student-facing string safe to pass directly to toast.error().
 */
export function friendlyError(
  error: { message?: string } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = error?.message ?? "";
  if (!raw) return fallback;
  return sanitizeErrorMessage(raw, fallback);
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message = "Request timed out. Please try again.",
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("request-timeout"), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
