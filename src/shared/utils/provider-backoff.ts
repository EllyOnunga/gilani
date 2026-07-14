/**
 * Shared exponential back-off helper for AI provider fallback loops.
 * Call between provider attempts to avoid slamming a slow/rate-limited upstream.
 */
export async function backoffDelay(attempt: number): Promise<void> {
  if (attempt === 0) return;
  // 500 ms * 2^(attempt-1) + up to 200 ms jitter, capped at 8 s
  const base = Math.min(500 * Math.pow(2, attempt - 1), 8000);
  const jitter = Math.random() * 200;
  await new Promise((res) => setTimeout(res, base + jitter));
}
