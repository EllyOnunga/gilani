import React, { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { FunctionGraphBlock } from "./FunctionGraph";
import { ExternalLink, AlertCircle, Lightbulb, AlertTriangle, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js";

// KaTeX and mhchem loaded lazily to keep the initial bundle small
let _katex: typeof import("katex").default | null = null;
let _katexLoadPromise: Promise<typeof import("katex").default> | null = null;
async function getKatex() {
  if (_katex) return _katex;
  if (_katexLoadPromise) return _katexLoadPromise;
  _katexLoadPromise = (async () => {
    const katexMod = await import("katex");
    const katexInstance = katexMod.default;
    // mhchem patches the katex module it imports internally — ensure it sees
    // the SAME instance by exposing it on globalThis before loading mhchem,
    // since mhchem.min.js resolves "katex" via the module cache / global.
    (globalThis as any).katex = katexInstance;
    await import("katex/dist/contrib/mhchem.min.js" as any);
    _katex = katexInstance;
    return katexInstance;
  })();
  return _katexLoadPromise;
}


// ─── Mermaid Component ────────────────────────────────────────────────────────



function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    import("mermaid").then((m) => {
      const isDark = document.documentElement.classList.contains("dark");
      m.default.initialize({
        startOnLoad: false,
        htmlLabels: false,
        flowchart: { htmlLabels: false },
        theme: isDark ? "dark" : "default",
        themeVariables: isDark ? {} : {
          primaryColor: "#f97316",
          primaryTextColor: "#111111",
          primaryBorderColor: "#e5e7eb",
          lineColor: "#6b7280",
          secondaryColor: "#f3f4f6",
          tertiaryColor: "#fff",
          background: "#ffffff",
          mainBkg: "#ffffff",
          nodeBorder: "#d1d5db",
          clusterBkg: "#f9fafb",
          titleColor: "#111111",
          edgeLabelBackground: "#ffffff",
          textColor: "#111111",
        },
      });
      return m.default.render(id, code);
    }).then(({ svg }) => {
      // CS-XSS-001: Sanitize Mermaid SVG before DOM injection to prevent XSS
      if (ref.current) ref.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
    }).catch(() => {
      if (ref.current) ref.current.textContent = code;
    });
  }, [code]);

  return (
    <div
      ref={ref}
      className="my-3 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-3 flex justify-center"
    />
  );
}

// ─── Smiles Drawer Component ──────────────────────────────────────────────────

function SmilesDrawer({ smiles }: { smiles: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    import("smiles-drawer").then((SD) => {
      const drawer = new SD.Drawer({ width: 400, height: 300 });
      SD.parse(
        smiles,
        (tree: any) => { drawer.draw(tree, canvasRef.current, "light"); },
        (err: any) => { console.error("SMILES parse error:", err); }
      );
    });
  }, [smiles]);

  return (
    <figure className="my-3 flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="rounded-xl border border-border max-w-full"
      />
      <figcaption className="text-[10px] font-mono text-muted-foreground mt-1 italic">
        {smiles}
      </figcaption>
    </figure>
  );
}

// ─── Callout Component ────────────────────────────────────────────────────────

const CALLOUT_CONFIG = {
  NOTE:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-950/40",   border: "border-blue-400", text: "text-blue-800 dark:text-blue-300",   label: "Note" },
  TIP:     { icon: Lightbulb,     bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-400", text: "text-green-800 dark:text-green-300", label: "Tip" },
  WARNING: { icon: AlertTriangle, bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-400", text: "text-yellow-800 dark:text-yellow-300", label: "Warning" },
  CAUTION: { icon: AlertTriangle, bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-400", text: "text-orange-800 dark:text-orange-300", label: "Caution" },
  IMPORTANT: { icon: AlertCircle, bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-400", text: "text-purple-800 dark:text-purple-300", label: "Important" },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;

function Callout({ type, children }: { type: CalloutType; children: React.ReactNode }) {
  const cfg = CALLOUT_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div className={`my-3 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <div className={`flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider mb-1 ${cfg.text}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ─── Markdown Components ──────────────────────────────────────────────────────

// Lazy-rendered KaTeX block — only loads KaTeX bundle when first math is encountered
function LazyKatexBlock({ expression }: { expression: string }) {
  const [html, setHtml] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getKatex().then((katex) => {
      if (cancelled) return;
      try {
        const rendered = katex.renderToString(expression, {
          displayMode: true,
          throwOnError: false,
          strict: false,
          trust: true,
          macros: KATEX_MACROS,
        });
        setHtml(rendered);
      } catch {
        setError(true);
      }
    });
    return () => { cancelled = true; };
  }, [expression]);

  if (error) return <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">{expression}</code>;
  if (!html) return <div className="my-3 h-8 rounded-lg bg-muted/30 animate-pulse" />;
  return <div className="my-3 overflow-x-auto py-2 px-1 rounded-lg bg-muted/30 border border-border/40" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Generic SVG diagrams (anatomy, physics setups, lab apparatus, circuits, etc.)
// AI-generated SVG, sanitized before injection.
function DiagramSVG({ svg }: { svg: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
  }, [svg]);
  return (
    <div className="my-3 rounded-xl border border-border bg-white p-3 overflow-x-auto flex justify-center">
      <div ref={ref} className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto" />
    </div>
  );
}

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
  p: ({ children }) => {
    // Callout detection: blockquote children starting with [!TYPE]
    if (typeof children === "string") {
      const match = children.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*([\s\S]*)/);
      if (match) {
        return <Callout type={match[1] as CalloutType}>{match[2]}</Callout>;
      }
    }
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },
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
    // Circled numbers via CSS counter — more scannable for study guides
    <ol className="list-none pl-0 my-2 space-y-1 [counter-reset:step]">
      {children}
    </ol>
  ),
  li: ({ children, node, ...props }: any) => {
    const isOrdered = node?.parent?.type === "element" && node?.parent?.tagName === "ol";
    return (
      <li className={`text-sm leading-relaxed flex items-start gap-2 ${isOrdered ? "[counter-increment:step]" : ""}`}>
        {isOrdered ? (
          <span className="mt-0.5 flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] [content:counter(step)]
            before:content-[counter(step)]">
          </span>
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
        )}
        <span>{children}</span>
      </li>
    );
  },
  blockquote: ({ children }) => {
    // Detect GitHub-style callouts: > [!NOTE], > [!TIP], etc.
    const raw = React.Children.toArray(children)
      .map((c: any) => c?.props?.children ?? "")
      .join("");
    const match = String(raw).match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*([\s\S]*)/s);
    if (match) {
      return <Callout type={match[1] as CalloutType}>{match[2]}</Callout>;
    }
    return (
      <blockquote className="border-l-4 border-primary/50 pl-3 my-2 bg-primary/5 rounded-r-lg py-1.5 text-sm text-muted-foreground italic">
        {children}
      </blockquote>
    );
  },
  code: ({ inline, children, className, ...props }: any) => {
    const lang = (className || "").replace("language-", "").toLowerCase();
    const text = String(children).trim();

    // Mermaid diagrams
    if (!inline && lang === "mermaid") {
      // Strip LaTeX math tokens that the AI sometimes injects into mermaid syntax
      let cleanMermaid = text
        .replace(/\$\\longrightarrow\$/g, "-->")
        .replace(/\$\\rightarrow\$/g, "-->")
        .replace(/\$\\to\$/g, "-->")
        .replace(/\$\\leftarrow\$/g, "<--")
        .replace(/\$\\leftrightarrow\$/g, "<-->")
        .replace(/\$([^$]+)\$/g, (_m, inner) => inner.trim()); // strip any remaining $...$
      // Mermaid v11 flowchart parser breaks on labels containing parentheses,
      // e.g. C[Water (H2O)] — wrap such labels in quotes: C["Water (H2O)"]
      // Match square-bracket labels (most common) containing literal parentheses
      cleanMermaid = cleanMermaid.replace(
        /([A-Za-z0-9_]+)(\[)([^\[\]\n]*[()][^\[\]\n]*)(\])/g,
        (_m, nodeId, open, label, close) => {
          const trimmed = label.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) return `${nodeId}${open}${label}${close}`;
          const escaped = trimmed.replace(/"/g, "&quot;");
          return `${nodeId}${open}"${escaped}"${close}`;
        }
      );
      return <MermaidDiagram code={cleanMermaid} />;
    }

    // SMILES chemical structure diagrams
    if (!inline && (lang === "smiles" || lang === "smi")) {
      return <SmilesDrawer smiles={text} />;
    }
    // Render fenced math/latex/tex blocks as KaTeX display math
    if (!inline && (lang === "latex" || lang === "math" || lang === "tex")) {
      return <LazyKatexBlock expression={text} />;
    }
    // Render fenced chemistry blocks
    if (!inline && (lang === "chemistry" || lang === "chem")) {
      return <LazyKatexBlock expression={`\\ce{${text}}`} />;
    }

    // Function / equation graphs — AI provides a JSON spec
    if (!inline && (lang === "function-plot" || lang === "graph" || lang === "plot")) {
      return <FunctionGraphBlock spec={text} />;
    }

    // Generic diagrams: anatomy, physics setups, lab apparatus, circuits
    if (!inline && (lang === "svg" || lang === "diagram")) {
      return <DiagramSVG svg={text} />;
    }

    // Regular code blocks with language badge
    if (!inline && lang) {
      return (
        <div className="relative my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">
          <span className="absolute top-2 right-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 select-none">
            {lang}
          </span>
          <code className="block text-green-300 font-mono text-[11px] leading-relaxed p-3 pt-6 overflow-x-auto">
            {children}
          </code>
        </div>
      );
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

// ─── KaTeX macros ─────────────────────────────────────────────────────────────

const KATEX_MACROS: Record<string, string> = {
  "\\vec":    "\\overrightarrow{#1}",
  "\\unit":   "\\mathrm{#1}",
  "\\degree": "^\\circ",
  "\\mol":    "\\text{mol}",
  "\\kJ":     "\\text{kJ}",
  "\\atm":    "\\text{atm}",
};

// ─── Element symbol blocklist ─────────────────────────────────────────────────
// Prevents common JS/TS/React words from being wrapped in \ce{}

const JS_BLOCKLIST = new Set([
  "React","ReactDOM","TypeScript","JavaScript","NextJS","NodeJS",
  "Props","State","Ref","Context","Provider","Consumer",
  "Promise","Boolean","String","Number","Object","Array",
  "HTML","CSS","JSON","XML","API","URL","DOM","BOM",
  "NaN","Infinity","undefined","null","true","false",
]);

// ─── preprocessLatex ─────────────────────────────────────────────────────────

function preprocessLatex(raw: string): string {
  // 0. Protect fenced code blocks from ALL substitutions
  const FENCE_TOKEN = "\x00FENCE\x00";
  const fenceBlocks: string[] = [];
  let s = raw.replace(/```[\s\S]*?```/g, (match) => { fenceBlocks.push(match); return FENCE_TOKEN; });

  // 1. Block math \[ … \] → $$ … $$
  s = s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `$$\n${inner.trim()}\n$$`);

  // 2. Inline math \( … \) → $ … $
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${inner.trim()}$`);

  // 3. Protect existing $…$ and $$…$$ blocks — use a UUID-style token to avoid collisions
  const TOKEN = `\x00latex_${Math.random().toString(36).slice(2)}_\x00`;
  const latexBlocks: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    latexBlocks.push(match);
    return TOKEN;
  });

  // 4. Wrap bare \ce{…} that aren't already inside $ … $
  s = s.replace(/\\ce\{([^}]+)\}/g, (_m, inner) => `$\\ce{${inner}}$`);

  // 5. Auto-detect chemical formulas — skip JS/TS/React blocklisted words
  s = s.replace(
    /\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+(?:\([A-Z][a-z]?\d*\)\d*)*)\b/g,
    (_m, formula) => {
      if (!/\d/.test(formula)) return formula;
      if (JS_BLOCKLIST.has(formula)) return formula;
      return `$\\ce{${formula}}$`;
    }
  );

  // 6. Chemical reaction arrows: -> / --> / <-> / <=>
  s = s.replace(/(?<!\$)(\s)(->|-->|<->|<=>)(\s)/g, (_m, pre, arrow, post) => {
    const katexArrow: Record<string, string> = {
      "->":  "\\rightarrow",
      "-->": "\\longrightarrow",
      "<->": "\\leftrightarrow",
      "<=>": "\\rightleftharpoons",
    };
    return `${pre}$${katexArrow[arrow]}$${post}`;
  });

  // 7. Powers: x^2, x^n
  s = s.replace(/\b([a-zA-Z])\^(\d+)\b/g, (_m, base, exp) => `$${base}^{${exp}}$`);

  // 8. sqrt(x)
  s = s.replace(/\bsqrt\(([^)]+)\)/g, (_m, inner) => `$\\sqrt{${inner}}$`);

  // 9. d/dx derivatives
  s = s.replace(/\bd\/d([a-z])\b/g, (_m, v) => `$\\frac{d}{d${v}}$`);

  // 10. Units with numbers e.g. "9.8 m/s^2", "273 K", "1.5 mol/L"
  s = s.replace(
    /\b(\d+(?:\.\d+)?)\s*(m\/s\^2|m\/s|km\/h|mol\/L|g\/mol|kJ\/mol|°C|°K|atm|Pa|kPa|J\/mol)\b/g,
    (_m, num, unit) => `$${num}\\,\\text{${unit.replace("°", "^\\circ ")}}$`
  );

  // 11. Definition/glossary: "Term: definition" on its own line → **Term**: definition
  s = s.replace(/^([A-Z][^:\n]{2,40}):\s+([A-Z].+)$/gm, (_m, term, def) => {
    return `**${term}**: ${def}`;
  });

  // 12. Restore protected blocks
  s = s.replace(new RegExp(TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), () => latexBlocks.shift()!);

  // 13. Restore fenced code blocks
  s = s.replace(new RegExp(FENCE_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), () => fenceBlocks.shift()!);

  return s;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = { content: string };

export function MarkdownRenderer({ content }: Props) {
  const processed = preprocessLatex(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, {
          strict: false,
          // CS-KATEX-001: trust:false prevents \href javascript: URI injection
          trust: false,
          throwOnError: false,
          errorColor: "#cc0000",
          macros: KATEX_MACROS,
        }],
      ]}
      components={markdownComponents}
    >
      {processed}
    </ReactMarkdown>
  );
}
