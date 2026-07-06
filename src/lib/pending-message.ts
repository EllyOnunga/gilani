// In-memory handoff for the first message of a newly created thread.
// The draft screen (/tutor) creates the conversation row, stashes the
// already-composed message here keyed by the new threadId, then navigates
// to /tutor/$threadId — which consumes it on mount and actually sends it.
// This is intentionally module-level (not React state) since it needs to
// survive a client-side route change between two different route components.

export type PendingMessage = {
  finalMessage: string;
  /** Raw text used to seed thread-title generation (may differ from finalMessage when a document is attached). */
  titleSeedText: string;
};

let pending: (PendingMessage & { threadId: string }) | null = null;

export function setPendingMessage(threadId: string, message: PendingMessage) {
  pending = { threadId, ...message };
}

/** Returns and clears the pending message if it matches threadId; otherwise null. */
export function consumePendingMessage(threadId: string): PendingMessage | null {
  if (pending && pending.threadId === threadId) {
    const { threadId: _discard, ...message } = pending;
    pending = null;
    return message;
  }
  return null;
}
