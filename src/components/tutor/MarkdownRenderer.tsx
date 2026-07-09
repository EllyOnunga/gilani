import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { FunctionGraphBlock } from "./FunctionGraph";
import { ExternalLink, AlertCircle, Lightbulb, AlertTriangle, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem/mhchem.js";

import DefinitionCard from "@/components/cards/DefinitionCard";
import ExampleCard from "@/components/cards/ExampleCard";
import WarningCard from "@/components/cards/WarningCard";
import StudyTipCard from "@/components/cards/StudyTipCard";
import SummaryCard from "@/components/cards/SummaryCard";
import PracticeQuestionCard from "@/components/cards/PracticeQuestionCard";

import { FreeBodyDiagram, CircuitDiagram, KinematicsEquation } from "@/components/physics";
import { ChemicalReaction, MolecularStructure, PeriodicTable } from "@/components/chemistry";
import {
  MathBlock,
  InlineMath,
  FormulaCard,
  MatrixRenderer,
  UnitRenderer,
  GeometryRenderer,
} from "@/components/maths";

// ─── Mermaid ────────────────────────────────────────────────────────────────

function MermaidDiagram({ code, isStreaming }: { code: string; isStreaming?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    import("mermaid")
      .then((m) => {
        const isDark = document.documentElement.classList.contains("dark");
        m.default.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          htmlLabels: false,
          flowchart: { htmlLabels: false, curve: "basis" },
          theme: isDark ? "dark" : "default",
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
      .catch((err) => {
        if (!isStreaming) {
          console.error("Mermaid render failed:", err);
        }
        if (ref.current) ref.current.textContent = code;
      });
  }, [code, isStreaming]);

  return (
    <div
      ref={ref}
      className="my-3 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-3 whitespace-pre-wrap font-mono text-sm text-left text-zinc-300"
    />
  );
}

// ─── SMILES ─────────────────────────────────────────────────────────────────

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
        },
      );
    });
  }, [smiles]);

  return (
    <figure className="my-3 flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-xl border border-border max-w-full" />
      <figcaption className="text-[10px] font-mono text-muted-foreground mt-1 italic">
        {smiles}
      </figcaption>
    </figure>
  );
}

// ─── SVG ────────────────────────────────────────────────────────────────────

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

// ─── Callouts ────────────────────────────────────────────────────────────────

function CustomCallout({ type, children }: { type: string; children: React.ReactNode }) {
  switch (type) {
    case "DEFINITION":
      return <DefinitionCard>{children}</DefinitionCard>;
    case "EXAMPLE":
      return <ExampleCard>{children}</ExampleCard>;
    case "WARNING":
    case "CAUTION":
      return <WarningCard>{children}</WarningCard>;
    case "TIP":
    case "NOTE":
      return <StudyTipCard>{children}</StudyTipCard>;
    case "IMPORTANT":
    case "SUMMARY":
      return <SummaryCard>{children}</SummaryCard>;
    case "PRACTICE":
      return <StudyTipCard>{children}</StudyTipCard>;
    default:
      // Fallback
      return (
        <div className="my-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider mb-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            {type}
          </div>
          <div className="text-sm text-foreground">{children}</div>
        </div>
      );
  }
}

// ─── JS blocklist (avoid auto-wrapping these as formulas) ────────────────────

const JS_BLOCKLIST = new Set([
  "React",
  "ReactDOM",
  "TypeScript",
  "JavaScript",
  "NextJS",
  "NodeJS",
  "Props",
  "State",
  "Ref",
  "Context",
  "Provider",
  "Consumer",
  "Promise",
  "Boolean",
  "String",
  "Number",
  "Object",
  "Array",
  "HTML",
  "CSS",
  "JSON",
  "XML",
  "API",
  "URL",
  "DOM",
  "BOM",
  "NaN",
  "Infinity",
  "undefined",
  "null",
  "true",
  "false",
]);

const PHYSICS_UNITS = [
  "m/s\\^2",
  "m/s",
  "km/h",
  "km/s",
  "mol/L",
  "g/mol",
  "kg/mol",
  "kJ/mol",
  "J/mol",
  "eV",
  "MeV",
  "GeV",
  "°C",
  "°F",
  "°K",
  "K",
  "atm",
  "Pa",
  "kPa",
  "MPa",
  "GPa",
  "bar",
  "mmHg",
  "torr",
  "N",
  "kN",
  "MN",
  "J",
  "kJ",
  "MJ",
  "W",
  "kW",
  "MW",
  "V",
  "mV",
  "A",
  "mA",
  "Ω",
  "Hz",
  "kHz",
  "MHz",
  "GHz",
  "m",
  "km",
  "cm",
  "mm",
  "μm",
  "nm",
  "pm",
  "fm",
  "kg",
  "g",
  "mg",
  "μg",
  "lb",
  "oz",
  "s",
  "ms",
  "μs",
  "ns",
  "min",
  "h",
  "d",
  "yr",
  "C",
  "mC",
  "μC",
  "F",
  "mF",
  "μF",
  "H",
  "mH",
  "T",
  "Wb",
  "lm",
  "lx",
  "Bq",
  "Gy",
  "Sv",
  "kat",
  "mol",
  "mmol",
];

// ─── Shared KaTeX macros (mirrors MathBlock/InlineMath) ──────────────────────

const MATH_MACROS = {
  "\\vec": "\\overrightarrow{#1}",
  "\\unit": "\\mathrm{#1}",
  "\\degree": "^\\circ",
  "\\mol": "\\mathrm{mol}",
  "\\kJ": "\\mathrm{kJ}",
  "\\atm": "\\mathrm{atm}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\R": "\\mathbb{R}",
  "\\C": "\\mathbb{C}",
  "\\diff": "\\mathrm{d}",
  "\\pdiff": "\\partial",
};

// ─── LaTeX preprocessor ──────────────────────────────────────────────────────

function preprocessLatex(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;

  let s = raw;

  // ── Step 1: Fix control-character mangling from streaming ─────────────────
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

  // ── Step 2: Protect math blocks FIRST (before any \\ stripping) ───────────
  // CRITICAL: \\ inside pmatrix/aligned are LaTeX row separators. They must
  // be tokenised before we strip the stray \\ the AI injects in plain text.
  const MATH_TOKEN = "\x00MATH\x00";
  const mathBlocks: string[] = [];
  // Protect $$...$$, then $...$  (order matters – greedy $$ first)
  s = s.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    mathBlocks.push(m);
    return MATH_TOKEN;
  });
  s = s.replace(/\$(?!\s)[^\$\n]*?(?<!\s)\$/g, (m) => {
    mathBlocks.push(m);
    return MATH_TOKEN;
  });

  // ── Step 3: Strip AI-generated \\ line-break artifacts (plain text only) ──
  // The AI sometimes emits \\ as a separator outside math (e.g. in prose or
  // inside code-fence content). Now that math is tokenised this is safe.
  s = s.replace(/^[ \t]*\\\\[ \t]*$/gm, ""); // line that is only \\
  s = s.replace(/ \\\\ /g, "\n"); // inline " \\ " → newline

  // ── Step 4: Fence / code / link protection ────────────────────────────────
  const fenceCount = (s.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    // Unbalanced fences (still streaming) – restore math and bail early
    s = s.replace(new RegExp(MATH_TOKEN, "g"), () => mathBlocks.shift()!);
    return s;
  }

  const FENCE_TOKEN = "\x00FENCE\x00";
  const fenceBlocks: string[] = [];
  s = s.replace(/```[\s\S]*?```/g, (m) => {
    fenceBlocks.push(m);
    return FENCE_TOKEN;
  });

  const LINK_TOKEN = "\x00LINK\x00";
  const linkBlocks: string[] = [];
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m) => {
    linkBlocks.push(m);
    return LINK_TOKEN;
  });

  const INLINE_CODE_TOKEN = "\x00ICODE\x00";
  const inlineCodeBlocks: string[] = [];
  s = s.replace(/`[^`\n]+`/g, (m) => {
    inlineCodeBlocks.push(m);
    return INLINE_CODE_TOKEN;
  });

  // ── Step 5: Convert \[...\] and \(...\) to $$ / $ ────────────────────────
  s = s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `$$\n${inner.trim()}\n$$`);
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$${inner.trim()}$`);

  // ── Step 6: Wrap bare LaTeX commands ─────────────────────────────────────
  // \ce{...}
  s = s.replace(/(^|[^a-zA-Z\\])ce\{([^}]+)\}/g, "$1\\ce{$2}");
  s = s.replace(/\\ce\{([^}]+)\}/g, "$\\ce{$1}$");

  // Common maths commands
  s = s.replace(/\\xrightarrow\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, "$\\xrightarrow{$1}$");
  s = s.replace(/\\xleftarrow\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, "$\\xleftarrow{$1}$");
  s = s.replace(/\\overset\{([^}]+)\}\{([^}]+)\}/g, "$\\overset{$1}{$2}$");
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$\\frac{$1}{$2}$");

  // Numbers before \text{}
  s = s.replace(/(\d+(?:\.\d+)?)\s*\\text\{([^}]+)\}/g, "$$$1 \\text{$2}$$");
  s = s.replace(/\\text\{([^}]+)\}/g, "$\\text{$1}$");

  s = s.replace(/\\sqrt\{([^}]+)\}/g, "$\\sqrt{$1}$");
  s = s.replace(/\\times\b/g, "$\\times$");
  s = s.replace(/\\cdot\b/g, "$\\cdot$");
  s = s.replace(/\\pm\b/g, "$\\pm$");
  s = s.replace(/\\rightarrow\b/g, "$\\rightarrow$");
  s = s.replace(/\\leftarrow\b/g, "$\\leftarrow$");
  s = s.replace(/\\longrightarrow\b/g, "$\\longrightarrow$");
  s = s.replace(/\\leftrightarrow\b/g, "$\\leftrightarrow$");

  // ── Step 7: Auto-detect chemical formulas ────────────────────────────────
  s = s.replace(
    /\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*){1,}(?:\([A-Z][a-z]?\d*\)\d*)*)(?=\s|$|[^a-zA-Z])/g,
    (_m, formula) => {
      if (!/\d/.test(formula)) return formula;
      if (JS_BLOCKLIST.has(formula)) return formula;
      const elementCount = (formula.match(/[A-Z]/g) || []).length;
      if (elementCount < 2) return formula;
      return `$\\ce{${formula}}$`;
    },
  );

  // ── Step 8: Arrow shorthand ───────────────────────────────────────────────
  s = s.replace(/(\s)(->|-->|<->|<=>)(\s)/g, (_m, pre, arrow, post) => {
    const map: Record<string, string> = {
      "->": "$\\rightarrow$",
      "-->": "$\\longrightarrow$",
      "<->": "$\\leftrightarrow$",
      "<=>": "$\\rightleftharpoons$",
    };
    return `${pre}${map[arrow]}${post}`;
  });

  // ── Step 9: Physics units ─────────────────────────────────────────────────
  const unitPattern = PHYSICS_UNITS.join("|");
  s = s.replace(
    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})\\b`, "g"),
    (_m, num, unit) => {
      const latexUnit = unit.replace(/\\?\^(\d)/g, "^{$1}").replace(/°/g, "^\\circ ");
      return `$${num} \\text{${latexUnit}}$`;
    },
  );

  // Clean up stray LaTeX thin spaces outside math mode
  s = s.replace(/\\,/g, " ");

  // Restore protected blocks — run repairMatrix on each math block so that
  // pmatrix / bmatrix content without \\ row separators is auto-fixed.
  s = s.replace(new RegExp(MATH_TOKEN, "g"), () => repairMatrix(mathBlocks.shift()!));
  s = s.replace(new RegExp(INLINE_CODE_TOKEN, "g"), () => inlineCodeBlocks.shift()!);
  s = s.replace(new RegExp(FENCE_TOKEN, "g"), () => fenceBlocks.shift()!);
  s = s.replace(new RegExp(LINK_TOKEN, "g"), () => linkBlocks.shift()!);

  return s;
}

/**
 * Repair pmatrix/bmatrix blocks where the AI omitted \\ row separators.
 *
 * Common bad output:  $\begin{pmatrix} 1 & 2 3 & 4 \end{pmatrix}$
 * Fixed output:       $\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$
 *
 * Also fixes column vectors: $\begin{pmatrix} 4 5 6 \end{pmatrix}$
 *                        →   $\begin{pmatrix} 4 \\ 5 \\ 6 \end{pmatrix}$
 */
function repairMatrix(math: string): string {
  return math.replace(
    /(\\begin\{[bBpvV]?matrix\})([ \t\S]*?)(\\end\{[bBpV]?matrix\})/g,
    (_m, open, inner, close) => {
      // Already has \\ — do nothing
      if (inner.includes("\\\\")) return _m;

      if (inner.includes("&")) {
        // Multi-column: insert \\ where a row boundary is detected.
        // A boundary is: closing token (digit/letter/brace) then whitespace
        // then an opening token (digit, -, or \\) WITHOUT \\ between them.
        const fixed = inner.replace(
          /([0-9a-zA-Z}\])\|])[ \t]+(-?[0-9\\-])/g,
          (_match: string, end: string, start: string) => `${end} \\\\ ${start}`,
        );
        return `${open}${fixed}${close}`;
      }

      // Single-column (column vector): space-separated tokens → join with \\\\
      const trimmed = inner.trim();
      const tokens = trimmed.split(/[ \t]+/).filter(Boolean);
      if (tokens.length > 1 && /^[\d.+\-\\a-zA-Z{}^_ ]+$/.test(trimmed)) {
        return `${open} ${tokens.join(" \\\\ ")} ${close}`;
      }

      return _m;
    },
  );
}

function extractCallout(children: React.ReactNode): {
  type: string | null;
  newChildren: React.ReactNode;
} {
  let type: string | null = null;
  let matched = false;

  const newChildren = React.Children.map(children, (child) => {
    if (matched) return child;

    if (typeof child === "string") {
      const match = child.match(
        /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT|DEFINITION|EXAMPLE|SUMMARY|PRACTICE)\]\s*/i,
      );
      if (match) {
        type = match[1].toUpperCase();
        matched = true;
        return child.replace(match[0], "");
      }
      return child;
    }

    if (React.isValidElement(child) && (child.props as any).children) {
      const grandChildren = React.Children.toArray((child.props as any).children);
      if (grandChildren.length > 0 && typeof grandChildren[0] === "string") {
        const match = grandChildren[0].match(
          /^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT|DEFINITION|EXAMPLE|SUMMARY|PRACTICE)\]\s*/i,
        );
        if (match) {
          type = match[1].toUpperCase();
          matched = true;
          const newFirst = grandChildren[0].replace(match[0], "");
          return React.cloneElement(
            child as React.ReactElement,
            {},
            newFirst,
            ...grandChildren.slice(1),
          );
        }
      }
    }

    return child;
  });

  return { type, newChildren };
}

// ─── Markdown component map (react-markdown v10 compatible) ──────────────────

// Shared KaTeX macros used by both inline and block math renderers
const KATEX_MACROS: Record<string, string> = {
  "\\vec": "\\overrightarrow{#1}",
  "\\unit": "\\mathrm{#1}",
  "\\degree": "^\\circ",
  "\\mol": "\\mathrm{mol}",
  "\\kJ": "\\mathrm{kJ}",
  "\\atm": "\\mathrm{atm}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\R": "\\mathbb{R}",
  "\\C": "\\mathbb{C}",
  "\\diff": "\\mathrm{d}",
  "\\pdiff": "\\partial",
};

function renderKatex(latex: string, display: boolean): string {
  return katex.renderToString(latex, {
    throwOnError: false,
    displayMode: display,
    macros: KATEX_MACROS,
    strict: "ignore",
  });
}

// Detect Mermaid diagram syntax regardless of fence label
const MERMAID_PATTERN =
  /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|quadrantChart|timeline|xychart|block-beta|mindmap)\b/;

const buildComponents = (isStreaming: boolean): any => ({
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground pb-2 leading-tight tracking-tight border-b border-border/50">
      {children}
    </h1>
  ),
  // ── Math nodes produced by remarkMath ──────────────────────────────────────
  // react-markdown v10 exposes these as element types "inlineMath" and "math"
  inlineMath: ({ node }: any) => {
    const latex = node?.value ?? "";
    return (
      <span
        className="inline-block max-w-full overflow-x-auto align-middle"
        dangerouslySetInnerHTML={{ __html: renderKatex(latex, false) }}
      />
    );
  },
  math: ({ node }: any) => {
    const latex = node?.value ?? "";
    return (
      <div
        className="my-5 overflow-x-auto py-1 text-center"
        dangerouslySetInnerHTML={{ __html: renderKatex(latex, true) }}
      />
    );
  },
  h2: ({ children }: any) => (
    <h2 className="text-xl font-bold mt-7 mb-3 text-foreground leading-snug">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-semibold mt-6 mb-2 text-foreground leading-snug">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-base font-semibold mt-5 mb-1.5 text-foreground">{children}</h4>
  ),
  h5: ({ children }: any) => (
    <h5 className="text-sm font-semibold mt-4 mb-1 text-foreground">{children}</h5>
  ),
  h6: ({ children }: any) => (
    <h6 className="text-xs font-semibold mt-4 mb-1 text-muted-foreground">{children}</h6>
  ),
  p: ({ children }: any) => {
    const { type, newChildren } = extractCallout(children);
    if (type) return <CustomCallout type={type}>{newChildren}</CustomCallout>;
    return (
      <p className="text-[15px] sm:text-base leading-8 sm:leading-loose mb-5 last:mb-0 text-foreground/90">
        {children}
      </p>
    );
  },
  del: ({ children }: any) => (
    <del className="line-through text-muted-foreground/60">{children}</del>
  ),
  sup: ({ children }: any) => (
    <sup className="text-[10px] text-muted-foreground align-super">{children}</sup>
  ),
  sub: ({ children }: any) => (
    <sub className="text-[10px] text-muted-foreground align-sub">{children}</sub>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic text-muted-foreground/90">{children}</em>,
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline decoration-sky-400/60 hover:decoration-sky-300 underline-offset-2 decoration-2 transition-colors font-medium cursor-pointer break-words"
      title={href}
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-80" />
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
          const t = e.currentTarget;
          t.style.display = "none";
          const p = t.parentElement;
          if (p) {
            const fb = document.createElement("p");
            fb.className = "text-xs text-muted-foreground italic";
            fb.textContent = `[Image unavailable: ${alt || src}]`;
            p.appendChild(fb);
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
    <ul className="list-disc pl-6 my-5 space-y-2.5 block w-full marker:text-muted-foreground/70">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal pl-6 my-5 space-y-2.5 block w-full marker:text-muted-foreground marker:font-medium [&_ol]:list-[lower-alpha] [&_ol_ol]:list-[lower-roman]">
      {children}
    </ol>
  ),
  li: ({ children, checked }: any) => {
    // Task-list checkbox support
    if (checked !== null && checked !== undefined) {
      return (
        <li className="flex items-start gap-3 text-[15px] sm:text-base leading-8 sm:leading-loose list-none -ml-2">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-2 h-4 w-4 rounded border-border accent-primary flex-shrink-0 cursor-default"
          />
          <span>{children}</span>
        </li>
      );
    }
    return (
      <li
        className="text-[15px] sm:text-base leading-8 sm:leading-loose"
        style={{ display: "list-item" }}
      >
        {children}
      </li>
    );
  },
  blockquote: ({ children }: any) => {
    const { type, newChildren } = extractCallout(children);
    if (type) return <CustomCallout type={type}>{newChildren}</CustomCallout>;
    return (
      <blockquote className="border-l-4 border-primary/50 pl-3 my-2 bg-primary/5 rounded-r-lg py-1.5 text-sm text-muted-foreground italic">
        {children}
      </blockquote>
    );
  },
  hr: () => <hr className="my-6 border-border/60" />,
  table: ({ children }: any) => (
    <div className="my-6 w-full max-w-full overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="min-w-full text-[15px] border-collapse bg-card">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-primary/5 text-xs uppercase tracking-wider font-bold border-b-2 border-border/80">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => <tbody className="divide-y divide-border/50">{children}</tbody>,
  tr: ({ children }: any) => (
    <tr className="hover:bg-muted/30 transition-colors even:bg-muted/10">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-5 py-3.5 text-left text-[13px] font-bold text-primary tracking-wide border-r border-border/40 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-5 py-3.5 text-[15px] leading-relaxed border-r border-border/40 last:border-r-0">
      {children}
    </td>
  ),

  div: ({ children, className }: any) => {
    const classStr = className || "";
    if (classStr.includes("math-display") || classStr.includes("math math-display")) {
      const latex = String(children);
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
        macros: MATH_MACROS,
        strict: "ignore",
      });
      return (
        <section className="my-6 w-full max-w-full overflow-x-auto overflow-y-hidden py-2 text-lg">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </section>
      );
    }
    return <div className={className}>{children}</div>;
  },
  span: ({ children, className }: any) => {
    const classStr = className || "";
    if (classStr.includes("math-inline") || classStr.includes("math math-inline")) {
      const latex = String(children);
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        macros: MATH_MACROS,
        strict: "ignore",
      });
      return (
        <span
          className="inline-block max-w-full overflow-x-auto align-middle overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return <span className={className}>{children}</span>;
  },

  // ── Code blocks (react-markdown v10: no `inline` prop; use parent context) ──
  // lowercase name required by react-markdown's components map (matches the
  // <pre> tag); the hook below is called unconditionally on every invocation,
  // so this is not an actual rules-of-hooks violation.
  pre: ({ children, node }: any) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [copied, setCopied] = React.useState(false);
    const child = React.Children.only(children) as any;
    const rawLang = (child?.props?.className || "").replace("language-", "").toLowerCase().trim();
    const langs = rawLang.split(/\s+/).filter(Boolean);
    const code =
      typeof child?.props?.children === "string" ? child.props.children.replace(/\n$/, "") : "";

    // Content-sniff Mermaid diagrams regardless of fence label.
    // AI models often write ```graph or ```mermaid interchangeably.
    const isMermaidLabel = langs.includes("mermaid");
    const isMermaidContent = MERMAID_PATTERN.test(code);
    const isMermaid = isMermaidLabel || isMermaidContent;
    const isSmiles = langs.some((l: string) => ["smiles", "smi"].includes(l));
    // "graph" alone is ambiguous (could be Mermaid) — only treat as function-plot if content is JSON
    const isGraph =
      langs.some((l: string) => ["function-plot", "plot"].includes(l)) ||
      (langs.includes("graph") && !isMermaidContent);
    const isSvg = langs.some((l: string) => ["svg", "diagram"].includes(l));
    // math/chemistry blocks are handled by rehype-katex — let them pass through
    const isMath = langs.some((l: string) => ["math", "latex", "tex"].includes(l));
    const isChem = langs.some((l: string) => ["chemistry", "chem"].includes(l));

    // User custom interactive blocks integration
    const createBlock = (type: string): any => ({
      id: "block-" + Math.random(),
      type,
      content: code,
      children: [],
    });

    // ── Early Mermaid check (must precede the switch to avoid "graph" case firing) ──
    if (isMermaid) {
      const clean = code
        .replace(/\$\\longrightarrow\$/g, "-->")
        .replace(/\$\\rightarrow\$/g, "-->")
        .replace(/\$\\to\$/g, "-->")
        .replace(/\$\\leftarrow\$/g, "<--")
        .replace(/\$\\leftrightarrow\$/g, "<-->");
      return <MermaidDiagram code={clean} isStreaming={isStreaming} />;
    }

    switch (rawLang) {
      // Physics
      case "physics:fbd":
      case "fbd":
        return <FreeBodyDiagram block={createBlock("fbd")} />;
      case "physics:circuit":
      case "circuit":
        return <CircuitDiagram block={createBlock("circuit")} />;
      case "physics:kinematics":
      case "kinematics":
        return <KinematicsEquation block={createBlock("kinematics")} />;

      // Chemistry
      case "chemistry:reaction":
      case "reaction":
        return <ChemicalReaction block={createBlock("reaction")} />;
      case "chemistry:molecule":
      case "molecule":
        return <MolecularStructure block={createBlock("molecule")} />;
      case "chemistry:periodic":
      case "periodic":
        return <PeriodicTable block={createBlock("periodic")} />;

      // Maths
      case "maths:formula":
      case "formula":
        return <FormulaCard block={createBlock("formula")} />;
      case "maths:graph":
      case "graph":
        return <FunctionGraphBlock spec={code} />;
      case "maths:geometry":
      case "geometry":
        return <GeometryRenderer block={createBlock("geometry")} />;
      case "maths:matrix":
      case "matrix":
        return <MatrixRenderer block={createBlock("matrix")} />;
      case "maths:unit":
      case "unit":
        return <UnitRenderer block={createBlock("unit")} />;

      // Cards/callouts with explicit block syntax
      case "definition":
        return <DefinitionCard>{code}</DefinitionCard>;
      case "example":
      case "worked-example":
        return <ExampleCard>{code}</ExampleCard>;
      case "warning":
      case "common-mistake":
        return <WarningCard>{code}</WarningCard>;
      case "tip":
      case "study-tip":
        return <StudyTipCard>{code}</StudyTipCard>;
      case "summary":
        return <SummaryCard>{code}</SummaryCard>;
    }

    if (isMath) return <MathBlock block={createBlock("math")} />;
    if (isChem) return <ChemicalReaction block={createBlock("reaction")} />;

    if (isSmiles) return <SmilesDrawer smiles={code} />;
    if (isGraph) return <FunctionGraphBlock spec={code} />;
    if (isSvg) return <DiagramSVG svg={code} />;

    const handleCopy = () =>
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });

    return (
      <div className="relative my-4 rounded-xl overflow-hidden bg-zinc-950 border border-border/40 group">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-white/10">
          <span className="font-sans text-xs text-zinc-400 font-medium">{rawLang || "code"}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div className="text-[13px] leading-relaxed">
          <SyntaxHighlighter
            language={rawLang || "text"}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
            }}
            PreTag="div"
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  },

  // Inline code (no language = truly inline)
  code: ({ children, className }: any) => {
    const classStr = className || "";
    if (classStr.includes("math-inline") || classStr.includes("language-math")) {
      return (
        <InlineMath
          block={{
            id: "math-" + Math.random(),
            type: "inlineMath",
            content: String(children),
            children: [],
          }}
        />
      );
    }

    const rawLang = classStr.replace("language-", "").toLowerCase().trim();
    // Block-level code is handled by `pre`. If we end up here without a parent `pre`,
    // it's a bare inline code span.
    if (!rawLang) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-primary">
          {children}
        </code>
      );
    }
    // Block code inside pre — rendering handled by pre (SyntaxHighlighter takes over)
    return null;
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  content: string;
  skipPreprocess?: boolean;
  className?: string;
  isStreaming?: boolean;
};

// ─── Canonical MarkdownRenderer ──────────────────────────────────────────────

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  skipPreprocess,
  className = "",
  isStreaming = false,
}: Props) {
  const processed = useMemo(
    () => (skipPreprocess ? content : preprocessLatex(content)),
    [content, skipPreprocess],
  );

  // Components are stable — rebuild only when needed
  const components = useMemo(() => buildComponents(isStreaming), [isStreaming]);

  return (
    <div className={`markdown-content text-foreground ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
