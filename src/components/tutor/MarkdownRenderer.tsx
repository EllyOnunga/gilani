import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { FunctionGraphBlock } from "./FunctionGraph"; // Ensure this path is correct
import { ExternalLink, AlertCircle, Lightbulb, AlertTriangle, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js";

// ─── Math Repair Helper ───────────────────────────────────────────────────────
const repairMath = (expr: string): string => {
  return expr
    .replace(/[\x00-\x1F]rac/g, "\\frac")
    .replace(/[\x00-\x1F]imes/g, "\\times")
    .replace(/[\x00-\x1F]egin/g, "\\begin")
    .replace(/[\x00-\x1F]end/g, "\\end")
    .replace(/[\x00-\x1F]pm/g, "\\pm")
    .replace(/[\x00-\x1F]cdot/g, "\\cdot")
    .replace(/[\x00-\x1F]sqrt/g, "\\sqrt")
    .replace(/[\x00-\x1F]ext/g, "\\text")
    .replace(/[\x00-\x1F]left/g, "\\left")
    .replace(/[\x00-\x1F]right/g, "\\right")
    .replace(/[\x00-\x1F]ce\b/g, "\\ce")
    .replace(/\\ce\s*([0-9]*[A-Z][A-Za-z0-9_+\-]*)/g, "\\ce{$1}")
    .replace(/\\text\s*([a-zA-Z/]+)/g, "\\text{$1}")
    .replace(/(^|[^\\])frac\{/g, "$1\\frac{")
    .replace(/(^|[^\\])sqrt\{/g, "$1\\sqrt{")
    .replace(/(^|[^\\])pm\b/g, "$1\\pm")
    .replace(/(^|[^\\])times\b/g, "$1\\times")
    .replace(/(^|[^\\])cdot\b/g, "$1\\cdot")
    .replace(/(^|[^\\])rightarrow\b/g, "$1\\rightarrow")
    .replace(/(^|[^\\])leftarrow\b/g, "$1\\leftarrow")
    .replace(/(^|[^\\])longrightarrow\b/g, "$1\\longrightarrow")
    .replace(/(^|[^\\])leftrightarrow\b/g, "$1\\leftrightarrow")
    .replace(/\s+/g, " ")
    .trim();
};

// ─── KaTeX Macros ─────────────────────────────────────────────────────────────
const KATEX_MACROS: Record<string, string> = {
  "\\vec": "\\overrightarrow{#1}",
  "\\unit": "\\mathrm{#1}",
  "\\degree": "^\\circ",
  "\\mol": "\\text{mol}",
  "\\kJ": "\\text{kJ}",
  "\\atm": "\\text{atm}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\R": "\\mathbb{R}",
  "\\C": "\\mathbb{C}",
  "\\diff": "\\mathrm{d}",
  "\\pdiff": "\\partial",
};

// ─── Mermaid Component ───────────────────────────────────────────────────────
function MermaidDiagram({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    import("mermaid")
      .then((m) => {
        const isDark = document.documentElement.classList.contains("dark");
        m.default.initialize({
          startOnLoad: false,
          htmlLabels: false,
          flowchart: { htmlLabels: false, curve: "basis" },
          theme: isDark ? "dark" : "default",
          themeVariables: isDark
            ? {}
            : {
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
      })
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
        }
      })
      .catch(() => {
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

// ─── SMILES Drawer Component ──────────────────────────────────────────────────
function SmilesDrawer({ smiles }: { smiles: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    import("smiles-drawer").then((SD) => {
      const drawer = new SD.Drawer({ width: 400, height: 300 });
      SD.parse(
        smiles,
        (tree: any) => {
          drawer.draw(tree, canvasRef.current, "light");
        },
        (err: any) => {
          console.error("SMILES parse error:", err);
        }
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

// ─── Callout Component ───────────────────────────────────────────────────────
const CALLOUT_CONFIG = {
  NOTE: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-400",
    text: "text-blue-800 dark:text-blue-300",
    label: "Note",
  },
  TIP: {
    icon: Lightbulb,
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-400",
    text: "text-green-800 dark:text-green-300",
    label: "Tip",
  },
  WARNING: {
    icon: AlertTriangle,
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-400",
    text: "text-yellow-800 dark:text-yellow-300",
    label: "Warning",
  },
  CAUTION: {
    icon: AlertTriangle,
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-400",
    text: "text-orange-800 dark:text-orange-300",
    label: "Caution",
  },
  IMPORTANT: {
    icon: AlertCircle,
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-400",
    text: "text-purple-800 dark:text-purple-300",
    label: "Important",
  },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;

function Callout({ type, children }: { type: CalloutType; children: React.ReactNode }) {
  const cfg = CALLOUT_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div className={`my-3 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <div
        className={`flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider mb-1 ${cfg.text}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ─── KaTeX Renderer ───────────────────────────────────────────────────────────
function KatexRenderer({
  expression,
  displayMode = true,
}: {
  expression: string;
  displayMode?: boolean;
}) {
  const cleaned = repairMath(expression).replace(/\\\\/g, "\\");

  // Don't attempt to render incomplete expressions
  if (!expression || (expression.includes("\\ce{") && !expression.match(/\\ce\{[^}]+\}/))) {
    return <span className="text-muted-foreground">{expression}</span>;
  }

  try {
    const html = katex.renderToString(cleaned, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false,
      macros: KATEX_MACROS,
      output: "html",
    });

    return (
      <span
        className={
          displayMode
            ? "block my-3 text-center overflow-x-auto text-foreground py-2 px-1"
            : "inline-block text-foreground align-middle"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (error) {
    // Show as plain text instead of red error box
    return <span className="font-mono text-sm text-muted-foreground">{expression}</span>;
  }
}

// ─── Diagram SVG Component ────────────────────────────────────────────────────
function DiagramSVG({ svg }: { svg: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  }, [svg]);
  return (
    <div className="my-3 rounded-xl border border-border bg-white dark:bg-zinc-900 p-3 overflow-x-auto flex justify-center">
      <div ref={ref} className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto" />
    </div>
  );
}

// ─── JS / Framework Blocklist ────────────────────────────────────────────────
const JS_BLOCKLIST = new Set([
  "React", "ReactDOM", "TypeScript", "JavaScript", "NextJS", "NodeJS",
  "Props", "State", "Ref", "Context", "Provider", "Consumer",
  "Promise", "Boolean", "String", "Number", "Object", "Array",
  "HTML", "CSS", "JSON", "XML", "API", "URL", "DOM", "BOM",
  "NaN", "Infinity", "undefined", "null", "true", "false",
]);

// ─── Physics / Chemistry Units ────────────────────────────────────────────────
const PHYSICS_UNITS = [
  "m/s\\^2", "m/s", "km/h", "km/s", "mol/L", "g/mol", "kg/mol",
  "kJ/mol", "J/mol", "eV", "MeV", "GeV", "°C", "°F", "°K", "K",
  "atm", "Pa", "kPa", "MPa", "GPa", "bar", "mmHg", "torr",
  "N", "kN", "MN", "J", "kJ", "MJ", "W", "kW", "MW",
  "V", "mV", "A", "mA", "Ω", "Hz", "kHz", "MHz", "GHz",
  "m", "km", "cm", "mm", "μm", "nm", "pm", "fm",
  "kg", "g", "mg", "μg", "lb", "oz",
  "s", "ms", "μs", "ns", "min", "h", "d", "yr",
  "C", "mC", "μC", "F", "mF", "μF", "H", "mH", "T", "Wb",
  "lm", "lx", "Bq", "Gy", "Sv", "kat", "mol", "mmol",
];

// ── Preprocess LaTeX / Math / Chemistry / Physics ───────────────────────────
// ── Preprocess LaTeX / Math / Chemistry / Physics ───────────────────────────
function preprocessLatex(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;

  let s = raw;

  // Step 1: Fix control-character mangling
  s = s
    .replace(/[\x00-\x1F]rac/g, "\\frac")
    .replace(/[\x00-\x1F]imes/g, "\\times")
    .replace(/[\x00-\x1F]egin/g, "\\begin")
    .replace(/[\x00-\x1F]end/g, "\\end")
    .replace(/[\x00-\x1F]pm/g, "\\pm")
    .replace(/[\x00-\x1F]cdot/g, "\\cdot")
    .replace(/[\x00-\x1F]sqrt/g, "\\sqrt")
    .replace(/[\x00-\x1F]ext/g, "\\text")
    .replace(/[\x00-\x1F]left/g, "\\left")
    .replace(/[\x00-\x1F]right/g, "\\right")
    .replace(/[\x00-\x1F]ce\b/g, "\\ce");

  // ★★★ NEW STEP 1.5: FIX MISSING $ BEFORE \ce ★★★
  // Catch: \ce{...} without preceding $
  // Also catch: ce{...} without \ and $
  // But DON'T double-wrap if already has $
  s = s.replace(/(^|[^$\\])\\ce\{/g, "$1$\\ce{");
  s = s.replace(/(^|[^$\\])ce\{/g, "$1$\\ce{");

  // Ensure closing } is followed by $ if not already
  // This fixes: $\\ce{H2O} → $\\ce{H2O}$
  s = s.replace(/\$\\ce\{([^}]+)\}(?!\$)/g, "$\\ce{$1}$");

  // Step 2: Check for balanced fences - if unbalanced, return as-is
  const fenceCount = (s.match(/```/g) || []).length;
  const mathCount = (s.match(/\$\$/g) || []).length;
  if (fenceCount % 2 !== 0 || mathCount % 2 !== 0) return s;

  // Step 3: Protect code blocks (triple backticks)
  const FENCE_TOKEN = "\x00FENCE\x00";
  const fenceBlocks: string[] = [];
  s = s.replace(/```[\s\S]*?```/g, (match) => {
    fenceBlocks.push(match);
    return FENCE_TOKEN;
  });

  // Step 4: Protect inline code (single backticks)
  const INLINE_CODE_TOKEN = "\x00ICODE\x00";
  const inlineCodeBlocks: string[] = [];
  s = s.replace(/`[^`\n]+`/g, (match) => {
    inlineCodeBlocks.push(match);
    return INLINE_CODE_TOKEN;
  });

  // Step 5: Convert \[...\] and \(...\) to $$...$$ and $...$
  s = s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `$$\n${inner.trim()}\n$$`);
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${inner.trim()}$`);

  // Step 6: Wrap ALL \ce{...} in $...$ if not already wrapped
  // Match \ce{...} that is NOT already inside $...$
  s = s.replace(/(^|[^$\\])\\ce\{([^}]+)\}/g, "$1$\\ce{$2}$");
  // Handle \ce at start of line
  s = s.replace(/^\\ce\{([^}]+)\}/gm, "$\\ce{$1}$");

  // Step 7: Protect existing math blocks ($...$ and $$...$$)
  const MATH_TOKEN = `\x00MATH_${Math.random().toString(36).slice(2)}_\x00`;
  const mathBlocks: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    mathBlocks.push(match);
    return MATH_TOKEN;
  });

  // Step 8: Wrap common LaTeX commands that appear outside math mode
  // This catches: \frac, \text, \times, \cdot, \sqrt, etc.

  // Wrap \frac{...}{...}
  s = s.replace(/(^|[^$\\])\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1$\\frac{$2}{$3}$");

  // Wrap \text{...}
  s = s.replace(/(^|[^$\\])\\text\{([^}]+)\}/g, "$1$\\text{$2}$");

  // Wrap \times, \cdot, \pm (standalone operators)
  s = s.replace(/(^|[^$\\])\\times\b/g, "$1$\\times$");
  s = s.replace(/(^|[^$\\])\\cdot\b/g, "$1$\\cdot$");
  s = s.replace(/(^|[^$\\])\\pm\b/g, "$1$\\pm$");

  // Wrap \sqrt{...}
  s = s.replace(/(^|[^$\\])\\sqrt\{([^}]+)\}/g, "$1$\\sqrt{$2}$");

  // Wrap subscripts/superscripts that are outside math
  s = s.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, "$1$_{$2}$");
  s = s.replace(/([a-zA-Z0-9])\^(\{[^}]+\}|\d)/g, "$1^$2");

  // Step 9: Auto-detect chemical formulas (e.g., H2O, NaCl, Ca(OH)2)
  // Only if they don't already have \ce{}
  s = s.replace(
    /\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*){1,}(?:\([A-Z][a-z]?\d*\)\d*)*)\b/g,
    (_m, formula) => {
      if (!/\d/.test(formula)) return formula; // Must have subscript
      if (JS_BLOCKLIST.has(formula)) return formula;
      const elementCount = (formula.match(/[A-Z]/g) || []).length;
      if (elementCount < 2) return formula;
      return `$\\ce{${formula}}$`;
    }
  );

  // Step 10: Convert arrow notation to LaTeX arrows
  s = s.replace(/(^|[^$\\])(\s)(->|-->|<->|<=>)(\s)/g, (_m, pre, preSp, arrow, postSp) => {
    const katexArrow: Record<string, string> = {
      "->": "\\rightarrow",
      "-->": "\\longrightarrow",
      "<->": "\\leftrightarrow",
      "<=>": "\\rightleftharpoons",
    };
    return `${pre}${preSp}$${katexArrow[arrow]}$${postSp}`;
  });

  // Step 11: Wrap physics values with units
  const unitPattern = PHYSICS_UNITS.join("|");
  s = s.replace(
    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})\\b`, "g"),
    (_m, num, unit) => {
      const latexUnit = unit
        .replace(/\\?\^(\d)/g, "^{$1}")
        .replace(/°/g, "^\\circ ");
      return `$${num}\\,\\text{${latexUnit}}$`;
    }
  );

  // Step 12: Bold definitions like "Term: Definition"
  s = s.replace(/^([A-Z][^:\n]{2,40}):\s+([A-Z].+)$/gm, (_m, term, def) => {
    return `**${term}**: ${def}`;
  });

  // Step 13: Restore math blocks
  s = s.replace(
    new RegExp(MATH_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    () => mathBlocks.shift()!
  );

  // Step 14: Restore inline code and code blocks
  s = s.replace(
    new RegExp(INLINE_CODE_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    () => inlineCodeBlocks.shift()!
  );
  s = s.replace(
    new RegExp(FENCE_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    () => fenceBlocks.shift()!
  );

  return s;
}

// ─── Markdown Components ──────────────────────────────────────────────────────
const markdownComponents: any = {
  h1: ({ children }: any) => (
    <h1 className="text-lg font-extrabold mt-4 mb-1.5 text-primary border-b border-primary/20 pb-1 leading-snug">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-base font-bold mt-3.5 mb-1 text-blue-600 dark:text-blue-400 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-bold mt-3 mb-0.5 text-purple-600 dark:text-purple-400 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-sm font-semibold mt-2 mb-0.5 text-teal-600 dark:text-teal-400">
      {children}
    </h4>
  ),
  h5: ({ children }: any) => (
    <h5 className="text-sm font-semibold mt-2 mb-0.5 text-cyan-600 dark:text-cyan-400">
      {children}
    </h5>
  ),
  p: ({ children }: any) => {
    if (typeof children === "string") {
      const match = children.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*([\s\S]*)/);
      if (match) {
        return <Callout type={match[1] as CalloutType}>{match[2]}</Callout>;
      }
    }
    const flatText = React.Children.toArray(children)
      .map((c: any) => (typeof c === "string" ? c : c?.props?.children ?? ""))
      .join("");
    const match = flatText.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*([\s\S]*)/);
    if (match) {
      return <Callout type={match[1] as CalloutType}>{match[2]}</Callout>;
    }
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },
  strong: ({ children }: any) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  a: ({ href, children }: any) => (
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
  img: ({ src, alt }: any) => (
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
  ul: ({ children }: any) => (
    <ul className="list-none pl-0 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-none pl-0 my-2 space-y-1 [counter-reset:step]">
      {children}
    </ol>
  ),
  li: ({ children, node, ...props }: any) => {
    const isOrdered =
      node?.parent?.type === "element" && node?.parent?.tagName === "ol";
    return (
      <li
        className={`text-sm leading-relaxed flex items-start gap-2 ${isOrdered ? "[counter-increment:step]" : ""
          }`}
      >
        {isOrdered ? (
          <span className="mt-0.5 flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] before:content-[counter(step)]" />
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
        )}
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  blockquote: ({ children }: any) => {
    const raw = React.Children.toArray(children)
      .map((c: any) => c?.props?.children ?? "")
      .join("");
    const match = String(raw).match(
      /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*([\s\S]*)/s
    );
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
    const rawLang = (className || "").replace("language-", "").toLowerCase();
    const langs = rawLang.split(/\s+/).filter(Boolean);

    let text = Array.isArray(children)
      ? children.join("")
      : String(children || "").trim();

    let isMath = langs.some((l: string) =>
      ["latex", "math", "tex", "math-inline"].includes(l)
    );
    let isChem = langs.some((l: string) => ["chemistry", "chem"].includes(l));
    let isMermaid = langs.includes("mermaid");
    let isSmiles = langs.some((l: string) => ["smiles", "smi"].includes(l));
    let isGraph = langs.some((l: string) =>
      ["function-plot", "graph", "plot"].includes(l)
    );
    let isSvg = langs.some((l: string) => ["svg", "diagram"].includes(l));
    let displayMode = !langs.includes("math-inline");

    if (text.startsWith("math-inline:")) {
      isMath = true;
      displayMode = false;
      text = text.replace("math-inline:", "").trim();
    }

    // Mermaid diagrams
    if (!inline && isMermaid) {
      let cleanMermaid = text
        .replace(/\$\\longrightarrow\$/g, "-->")
        .replace(/\$\\rightarrow\$/g, "-->")
        .replace(/\$\\to\$/g, "-->")
        .replace(/\$\\leftarrow\$/g, "<--")
        .replace(/\$\\leftrightarrow\$/g, "<-->")
        .replace(/\$([^$]+)\$/g, (_m: string, inner: string) => inner.trim());

      cleanMermaid = cleanMermaid.replace(
        /([A-Za-z0-9_]+)(\[)([^\[\]\n]*[()][^\[\]\n]*)(\])/g,
        (_m: string, nodeId: string, open: string, label: string, close: string) => {
          const trimmed = label.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"'))
            return `${nodeId}${open}${label}${close}`;
          const escaped = trimmed.replace(/"/g, "&quot;");
          return `${nodeId}${open}"${escaped}"${close}`;
        }
      );
      return <MermaidDiagram code={cleanMermaid} />;
    }

    // SMILES chemical structures
    if (!inline && isSmiles) {
      return <SmilesDrawer smiles={text} />;
    }

    // Math/LaTeX - render directly, NOT in code block
    if (isMath) {
      return <KatexRenderer expression={text} displayMode={displayMode && !inline} />;
    }

    // Chemistry - render directly, NOT in code block
    if (isChem) {
      return <KatexRenderer expression={`\\ce{${text}}`} displayMode={!inline} />;
    }

    // Function plots
    if (!inline && isGraph) {
      return <FunctionGraphBlock spec={text} />;
    }

    // SVG diagrams
    if (!inline && isSvg) {
      return <DiagramSVG svg={text} />;
    }

    // Auto-detect pure LaTeX in code blocks - render as math, NOT code
    const isPureLatex =
      !rawLang &&
      !text.includes("`") &&
      !text.includes("math-inline:") &&
      (text.trimStart().startsWith("\\") || text.trimStart().startsWith("\\ce{")) &&
      (text.includes("\\ce{") ||
        text.includes("\\frac") ||
        text.includes("\\xrightarrow") ||
        text.includes("\\sum") ||
        text.includes("\\int") ||
        text.includes("\\lim") ||
        text.includes("\\begin{") ||
        text.includes("$"));

    if (isPureLatex) {
      return <KatexRenderer expression={text} displayMode={true} />;
    }

    // Check if it looks like math/chemistry even without language tag
    const looksLikeMath =
      text.includes("\\frac") ||
      text.includes("\\ce{") ||
      text.includes("\\text{") ||
      text.includes("\\times") ||
      text.includes("\\cdot") ||
      (text.startsWith("$") && text.endsWith("$"));

    if (!inline && looksLikeMath && !rawLang) {
      // Render as math, not code
      return <KatexRenderer expression={text} displayMode={true} />;
    }

    // ONLY show code block styling for actual programming languages
    const primaryLang = langs[0];
    if (!inline && primaryLang) {
      return (
        <span className="block relative my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">
          <span className="absolute top-2 right-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 select-none">
            {rawLang}
          </span>
          <code className="block text-green-300 font-mono text-[11px] leading-relaxed p-3 pt-6 overflow-x-auto">
            {children}
          </code>
        </span>
      );
    }

    // Inline code
    return inline ? (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-primary">
        {children}
      </code>
    ) : (
      <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => {
    const child = React.Children.only(children) as any;
    const lang = (child?.props?.className || "").replace("language-", "");
    // Don't wrap math/latex/chemistry in pre - let them render directly
    if (
      !lang ||
      ["math", "latex", "tex", "math-inline", "chemistry", "chem"].includes(lang)
    )
      return <>{children}</>;
    return (
      <pre className="my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">
        {children}
      </pre>
    );
  },
  hr: () => <hr className="my-3 border-border/60" />,
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-muted/60 text-xs uppercase tracking-wider font-semibold">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-2 text-sm">{children}</td>
  ),

  math: ({ value }: any) => (
    <KatexRenderer expression={value || ""} displayMode={true} />
  ),
  inlineMath: ({ value }: any) => (
    <KatexRenderer expression={value || ""} displayMode={false} />
  ),
};

// ─── Main Component ───────────────────────────────────────────────────────────
type Props = {
  content: string;
  skipPreprocess?: boolean;
  className?: string;
};

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  skipPreprocess,
  className = "",
}: Props) {
  const processed = useMemo(
    () => (skipPreprocess ? content : preprocessLatex(content)),
    [content, skipPreprocess]
  );

  return (
    <div className={`markdown-content text-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        components={markdownComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;