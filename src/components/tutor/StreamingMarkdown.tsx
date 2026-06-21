import React, { useDeferredValue } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

// ─── StreamingMarkdown ─────────────────────────────────────────────────────
//
// Problem: MarkdownRenderer (ReactMarkdown + a dozen regex passes in
// preprocessLatex) re-parses the ENTIRE accumulated response on every text
// delta during streaming. For a 30ms-paced stream producing several
// thousand characters, that's hundreds of full-document reparses, which
// pins the main thread and can freeze the tab — and it gets WORSE as the
// response grows, since each reparse is itself O(total length so far).
//
// Fix, three layers:
//   1. Stable/live split: paragraphs that are finished (followed by a
//      blank line, and not inside an open code fence or $$ math block) are
//      frozen as their own memoized MarkdownRenderer instance and never
//      re-rendered again. Only the current "live" paragraph re-renders.
//      The split point is tracked incrementally (a ref) so finding it is
//      O(new characters since last render), not O(total document length).
//   2. Word-boundary gating on the live paragraph: only commit a new value
//      for re-rendering when the live text ends at a word boundary (or has
//      grown by a safety-valve amount), instead of on every single
//      character-level delta.
//   3. useDeferredValue as a final safety net: lets React skip/coalesce
//      renders automatically if the system is still under load despite (1)
//      and (2).
//
// Each message gets a fresh component instance (MessageList keys bubbles by
// message id), so all the refs below naturally reset per-message — no
// manual reset logic needed.

// StreamingMarkdown.tsx  — smooth word-by-word rendering

// StreamingMarkdown.tsx

type Props = { content: string; isStreaming: boolean };

const MemoStableBlock = React.memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (prev, next) => prev.content === next.content
);

const CHARS_PER_TICK = 6;  // fewer chars per tick = smoother, more gradual reveal
const THROTTLE_MS = 60;  // ~16 renders/sec — easy on the main thread

export const StreamingMarkdown = React.memo(function StreamingMarkdown({
  content,
  isStreaming,
}: Props) {
  // ── Incremental paragraph-split tracking ─────────────────────────────────
  const lastSplitRef = React.useRef(0);
  const scannedLenRef = React.useRef(0);
  const fenceOpenRef = React.useRef(false);
  const mathOpenRef = React.useRef(false);

  if (content.length > scannedLenRef.current) {
    const newSlice = content.slice(scannedLenRef.current);
    if ((newSlice.match(/```/g) || []).length % 2 === 1) fenceOpenRef.current = !fenceOpenRef.current;
    if ((newSlice.match(/\$\$/g) || []).length % 2 === 1) mathOpenRef.current = !mathOpenRef.current;
    scannedLenRef.current = content.length;

    if (!fenceOpenRef.current && !mathOpenRef.current) {
      let cursor = content.indexOf("\n\n", Math.max(lastSplitRef.current, 0));
      let found = -1;
      while (cursor !== -1) { found = cursor; cursor = content.indexOf("\n\n", cursor + 2); }
      if (found !== -1) lastSplitRef.current = found;
    }
  }

  const splitIdx = isStreaming ? lastSplitRef.current : content.length;
  const stableText = content.slice(0, splitIdx);
  const liveText = content.slice(splitIdx);

  // ── Refs the rAF loop reads directly — no effect restarts needed ─────────
  const liveTextRef = React.useRef(liveText);
  const isStreamingRef = React.useRef(isStreaming);
  liveTextRef.current = liveText;       // update every render, no effect needed
  isStreamingRef.current = isStreaming;

  const revealedRef = React.useRef(0);
  const lastRenderTimeRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const [, forceRender] = React.useReducer(n => n + 1, 0);

  // ── Single rAF loop — starts once, reads refs, never restarts ────────────
  React.useEffect(() => {
    function tick(timestamp: DOMHighResTimeStamp) {
      const live = liveTextRef.current;
      const target = live.length;

      if (!isStreamingRef.current) {
        // Stream ended: snap to full and do one final render, then stop.
        revealedRef.current = target;
        forceRender();
        rafRef.current = null;
        return; // do NOT reschedule
      }

      if (
        revealedRef.current < target &&
        timestamp - lastRenderTimeRef.current >= THROTTLE_MS
      ) {
        // Advance by CHARS_PER_TICK then walk back to the last space/newline
        // so we never commit mid-word (avoids markdown syntax getting torn).
        let next = Math.min(revealedRef.current + CHARS_PER_TICK, target);
        if (next < target) {
          // walk backward to the nearest safe boundary
          while (next > revealedRef.current && live[next] !== " " && live[next] !== "\n") {
            next--;
          }
          // if no boundary found (long URL, code token), just use the hard limit
          if (next === revealedRef.current) next = Math.min(revealedRef.current + CHARS_PER_TICK, target);
        }

        revealedRef.current = next;
        lastRenderTimeRef.current = timestamp;
        forceRender();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // ← empty deps: loop starts once, reads everything via refs

  // Safety clamp in case stable/live split shifts
  if (revealedRef.current > liveText.length) revealedRef.current = liveText.length;

  const stableBlocks = React.useMemo(
    () => (stableText ? stableText.split("\n\n") : []),
    [stableText]
  );

  const visibleLive = liveText.slice(0, revealedRef.current);
  const deferredVisibleLive = useDeferredValue(visibleLive);

  return (
    <>
      {stableBlocks.map((block, i) => (
        <MemoStableBlock key={i} content={block} />
      ))}
      {deferredVisibleLive && (
        isStreaming
          ? <span className="whitespace-pre-wrap text-sm leading-relaxed">{deferredVisibleLive}</span>
          : <MarkdownRenderer content={deferredVisibleLive} />
      )}
    </>
  );
});