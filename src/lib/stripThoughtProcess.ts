import type { TextStreamPart, ToolSet } from "ai";

const OPEN_TAG = "<thought_process>";
const CLOSE_TAG = "</thought_process>";

// Returns the length of the longest suffix of `text` that is a proper
// prefix of `tag` (i.e. could still grow into `tag` with more incoming text).
// Returns 0 if no such suffix exists.
function partialTagSuffixLength(text: string, tag: string): number {
  const maxCheck = Math.min(text.length, tag.length - 1);
  for (let len = maxCheck; len > 0; len--) {
    if (text.endsWith(tag.slice(0, len))) {
      return len;
    }
  }
  return 0;
}

export function stripThoughtProcessTransform<TOOLS extends ToolSet>() {
  return (_options: { tools: TOOLS; stopStream: () => void }) => {
    let buffer = "";
    let stripping = false;

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
        }
        // Only text-delta chunks carry the model's visible text.
        // Everything else (tool calls, reasoning, step markers, etc.)
        // passes straight through untouched.
        if (chunk.type !== "text-delta") {
          controller.enqueue(chunk);
          return;
        }

        buffer += chunk.text;
        let outText = "";

        while (true) {
          if (stripping) {
            const closeIdx = buffer.indexOf(CLOSE_TAG);
            if (closeIdx === -1) {
              // Safety valve in case the tag never closes
              if (buffer.length > 20_000) {
                stripping = false;
                outText += buffer;
                buffer = "";
              }
              break;
            }
            buffer = buffer.slice(closeIdx + CLOSE_TAG.length);
            stripping = false;
            // loop again in case more tags follow in this buffer
          } else {
            const openIdx = buffer.indexOf(OPEN_TAG);
            if (openIdx === -1) {
              // Only hold back chars if the buffer's tail could actually
              // be growing into "<thought_process>". Otherwise flush
              // everything immediately for smooth streaming.
              const holdLen = partialTagSuffixLength(buffer, OPEN_TAG);
              const releaseLen = buffer.length - holdLen;
              if (releaseLen > 0) {
                outText += buffer.slice(0, releaseLen);
                buffer = buffer.slice(releaseLen);
              }
              break;
            }
            outText += buffer.slice(0, openIdx);
            buffer = buffer.slice(openIdx + OPEN_TAG.length);
            stripping = true;
            // loop again to check for close tag already in buffer
          }
        }

        if (outText.length > 0) {
          controller.enqueue({ ...chunk, text: outText } as TextStreamPart<TOOLS>);
        }
        // If outText is empty, we swallow this delta entirely (no enqueue) —
        // e.g. when the whole chunk was inside the thought_process block,
        // or when the buffer tail is a genuine partial-tag prefix.
      },

      flush(controller) {
        // Stream ended mid-strip — discard any unterminated tag content.
        if (!stripping && buffer.length > 0) {
          controller.enqueue({
            type: "text-delta",
            id: "strip-flush",
            text: buffer,
          } as TextStreamPart<TOOLS>);
        }
        buffer = "";
      },
    });
  };
}
