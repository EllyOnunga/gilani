import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders a string that may contain LaTeX expressions.
 * - Inline:  $x^2 + 1$
 * - Block:   $$F = ma$$
 * Plain text segments are rendered as-is.
 */
export function MathText({ text, className }: MathTextProps) {
  if (!text) return null;

  const cleanedText = cleanMathString(text);
  const parts = splitMath(cleanedText);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "block") {
          return <BlockMath key={i} math={part.content} />;
        }
        if (part.type === "inline") {
          return <InlineMath key={i} math={part.content} />;
        }
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}

function cleanMathString(text: string): string {
  if (!text) return text;

  // 1. Globally restore control characters that are never used in normal text
  let cleaned = text;
  cleaned = cleaned.replace(/\u000c/g, "\\f"); // Form feed -> \f (e.g. \frac)
  cleaned = cleaned.replace(/\u0008/g, "\\b"); // Backspace -> \b (e.g. \beta)

  // 2. Restore newlines and tabs only inside math blocks to avoid corrupting text paragraphs
  cleaned = cleaned.replace(/\$\$(.*?)\$\$|\$(.*?)\$/gs, (match, block, inline) => {
    if (block !== undefined) {
      return `$$${block.replace(/\n/g, "\\n").replace(/\t/g, "\\t")}$$`;
    }
    if (inline !== undefined) {
      return `$${inline.replace(/\n/g, "\\n").replace(/\t/g, "\\t")}$`;
    }
    return match;
  });

  return cleaned;
}

// ─── Parser ────────────────────────────────────────────────────────────────────

type Segment =
  | { type: "text"; content: string }
  | { type: "inline"; content: string }
  | { type: "block"; content: string };

function splitMath(input: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ then $...$
  const pattern = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      // $$...$$ block
      segments.push({ type: "block", content: match[1].trim() });
    } else if (match[2] !== undefined) {
      // $...$ inline
      segments.push({ type: "inline", content: match[2].trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < input.length) {
    segments.push({ type: "text", content: input.slice(lastIndex) });
  }

  return segments;
}