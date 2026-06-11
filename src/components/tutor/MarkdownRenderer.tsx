import React from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js"; // \ce{} chemistry support

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h1 className="text-lg font-extrabold mt-4 mb-1.5 text-primary border-b border-primary/20 pb-1 leading-snug">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mt-3.5 mb-1 text-blue-600 dark:text-blue-400 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold mt-3 mb-0.5 text-purple-600 dark:text-purple-400 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mt-2 mb-0.5 text-teal-600 dark:text-teal-400">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
    >
      {children}
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
    </a>
  ),
  img: ({ src, alt }) => (
    <figure className="my-3">
      <img
        src={src}
        alt={alt || ""}
        className="rounded-xl border border-border max-w-full shadow-sm"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("p");
            fallback.className = "text-xs text-muted-foreground italic";
            fallback.textContent = `[Image unavailable: ${alt || src}]`;
            parent.appendChild(fallback);
          }
        }}
      />
      {alt && (
        <figcaption className="text-[10px] font-mono text-muted-foreground mt-1 text-center italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  ul: ({ children }) => <ul className="list-none pl-0 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-primary marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children, node, ...props }: any) => {
    const isOrdered = node?.parent?.type === "element" && node?.parent?.tagName === "ol";
    return (
      <li
        className={`text-sm leading-relaxed flex items-start gap-2 ${isOrdered ? "list-item" : ""}`}
      >
        {!isOrdered && (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
        )}
        <span>{children}</span>
      </li>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-3 my-2 bg-primary/5 rounded-r-lg py-1.5 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, className, ...props }: any) => {
    const lang = (className || "").replace("language-", "").toLowerCase();
    const text = String(children).trim();
    // Render latex/math code blocks as display math
    if (!inline && (lang === "latex" || lang === "math" || lang === "tex")) {
      return <div className="my-3 overflow-x-auto">{"$$" + text + "$$"}</div>;
    }
    return inline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-primary">
        {children}
      </code>
    ) : (
      <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-border/60" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 text-xs uppercase tracking-wider font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-sm">{children}</td>,
};
type Props = {
  content: string;
};

/**
 * Pre-process markdown to convert bracket-style LaTeX delimiters
 * to dollar-sign delimiters that remark-math/KaTeX expects.
 *
 * Converts:
 *   \( ... \)  →  $ ... $   (inline math)
 *   \[ ... \]  →  $$ ... $$ (block math)
 */
function preprocessLatex(raw: string): string {
  // Block math: \[ ... \] → $$ ... $$
  let s = raw.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `$$${inner.trim()}$$`);
  // Inline math: \( ... \) → $ ... $
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${inner.trim()}$`);
  // Chemistry: \ce{...} — already handled by mhchem inside KaTeX
  // Physics: \vec, \hat, \nabla etc — passed through to KaTeX
  return s;
}

export function MarkdownRenderer({ content }: Props) {
  const processed = preprocessLatex(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, {
        strict: false,
        trust: true,
        throwOnError: false,
        errorColor: "#cc0000",
        macros: {
          "\\vec": "\\overrightarrow{#1}",
          "\\unit": "\\mathrm{#1}",
          "\\degree": "^\\circ",
        }
      }]]}
      components={markdownComponents}
    >
      {processed}
    </ReactMarkdown>
  );
}
