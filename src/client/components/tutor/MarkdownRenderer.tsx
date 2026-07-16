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
import "katex/contrib/mhchem";

import DefinitionCard from "@/client/components/cards/DefinitionCard";
import ExampleCard from "@/client/components/cards/ExampleCard";
import WarningCard from "@/client/components/cards/WarningCard";
import StudyTipCard from "@/client/components/cards/StudyTipCard";
import SummaryCard from "@/client/components/cards/SummaryCard";
import PracticeQuestionCard from "@/client/components/cards/PracticeQuestionCard";
import { FlashCard } from "@/client/components/cards/FlashCard";

import { FreeBodyDiagram, CircuitDiagram, KinematicsEquation } from "@/client/components/physics";
import { ChemicalReaction, MolecularStructure, PeriodicTable } from "@/client/components/chemistry";
import {
  MathBlock,
  InlineMath,
  FormulaCard,
  MatrixRenderer,
  UnitRenderer,
  GeometryRenderer,
} from "@/client/components/maths";

// Map of digit → Unicode subscript character
const SUBSCRIPT: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

// Converts chemical formulas to Unicode subscripts so Mermaid renders them
// correctly as plain text inside SVG nodes.
// e.g. "H2SO4" → "H₂SO₄", "CO2" → "CO₂"
// Avoids false positives like "M1", "B12", "IPv4" by only matching tokens
// that look entirely like a sequence of element symbols.
function formatChemFormulas(text: string): string {
  return text.replace(/\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+)\b/g, (word) => {
    if (/^([A-Z][a-z]?\d*)+$/.test(word) && /\d/.test(word)) {
      return word.replace(/\d/g, (d) => SUBSCRIPT[d] ?? d);
    }
    return word;
  });
}

// Mermaid's flowchart parser treats "(" inside a [...] node label as the start
// of a different node shape, which breaks parsing unless the whole label is
// quoted. AI-generated diagrams often include parentheses in labels (e.g.
// "Brine (NaCl)"), so quote any bracket label containing unescaped parens
// before handing the code to Mermaid.
// Also converts chemical formulas to Unicode subscripts for proper display.
function sanitizeMermaidLabels(code: string): string {
  const wrap = (id: string, label: string, open: string, close: string) => {
    const alreadyQuoted = /^".*"$/.test(label.trim());
    if (alreadyQuoted) return `${id}${open}${label}${close}`;

    // Apply Unicode subscript formatting to chemical formulas
    const formatted = formatChemFormulas(label);
    // Quote the label if it contains parentheses (or was changed by formula formatting)
    if (/[()]/.test(formatted) || formatted !== label) {
      return `${id}${open}"${formatted.replace(/"/g, "'")}"${close}`;
    }
    return `${id}${open}${formatted}${close}`;
  };
  return code
    .replace(/(\b[A-Za-z0-9_]+)\[([^\[\]"`]*)\]/g, (m, id, label) => wrap(id, label, "[", "]"))
    .replace(/(\b[A-Za-z0-9_]+)\{([^{}`"]*)\}/g, (m, id, label) => wrap(id, label, "{", "}"));
}

let _mermaidInitialized = false;
function initMermaid(isDark: boolean) {
  if (import.meta.env.SSR || _mermaidInitialized) return;
  _mermaidInitialized = true;
  import("mermaid").then((m) => {
    m.default.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: isDark ? "dark" : "default",
    });
  });
}

function MermaidDiagram({ code, isStreaming }: { code: string; isStreaming?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (import.meta.env.SSR || !ref.current) return;
    const el = ref.current;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    const isDark = document.documentElement.classList.contains("dark");
    initMermaid(isDark);

    // Auto-repair common AI mistakes in Mermaid code
    let processedCode = code;
    // 1. If everything is on a single line, try to unpack it
    if (!processedCode.includes("\n")) {
      processedCode = processedCode
        .replace(/\s+(subgraph\b)/g, "\n$1")
        .replace(/\s+(end\b)/g, "\n$1")
        .replace(/(end\b)\s+/g, "$1\n")
        .replace(/\]\s+([A-Za-z0-9_-]+\[)/g, "]\n$1")
        .replace(/\]\s+([A-Za-z0-9_-]+\s*-[->.])/g, "]\n$1")
        .replace(/([A-Za-z0-9_-]+)\s+([A-Za-z0-9_-]+\s*-[->.])/g, "$1\n$2")
        .replace(/(subgraph[^\n]+?)\s+([A-Za-z0-9_-]+\[)/g, "$1\n$2");
    }
    // 2. Wrap subgraph titles with spaces in quotes (invalid in Mermaid)
    processedCode = processedCode.replace(/subgraph\s+([^"\[\n]+)(?=\n|$)/g, (match, title) => {
      const t = title.trim();
      return t.includes(" ") ? `subgraph "${t}"` : match;
    });

    setErrorCode(null);
    el.innerHTML = "";

    import("mermaid")
      .then((m) => m.default.render(id, processedCode))
      .then(({ svg }) => {
        if (el) el.innerHTML = svg;
      })
      .catch((err) => {
        if (!isStreaming) console.error("Mermaid render failed:", err);
        setErrorCode(processedCode);
      });
  }, [code, isStreaming]);

  if (errorCode) {
    return (
      <div className="my-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 overflow-x-auto text-sm text-destructive whitespace-pre-wrap font-mono">
        {errorCode}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-3 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-4 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
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
    ref.current.innerHTML = DOMPurify.sanitize(svg, { ADD_TAGS: ["style"] });
  }, [svg]);
  return (
    <div className="my-3 rounded-xl border border-border bg-white dark:bg-zinc-900 p-3 overflow-x-auto flex justify-center">
      <div ref={ref} className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto" />
    </div>
  );
}

// ─── Callouts ────────────────────────────────────────────────────────────────

/**
 * Helper to recursively extract raw text from a React node.
 */
function extractText(node: any): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!node || !node.props) return "";
  if (node.props.children) {
    if (Array.isArray(node.props.children)) {
      return node.props.children.map(extractText).join("");
    }
    return extractText(node.props.children);
  }
  return "";
}

/**
 * Split React children at the first element that contains an "Answer:" / "A:" heading.
 * Returns { questionNodes, answerNodes }.
 */
function splitPracticeChildren(children: React.ReactNode): {
  questionNodes: React.ReactNode[];
  answerNodes: React.ReactNode[];
} {
  const arr = React.Children.toArray(children);
  let splitIdx = -1;
  for (let i = 0; i < arr.length; i++) {
    const text = extractText(arr[i]);
    console.log(`[splitPracticeChildren] Node ${i} text:`, text);
    if (/^\s*(Answer|A)\s*:/i.test(text)) {
      console.log(`[splitPracticeChildren] Found answer at node ${i}`);
      splitIdx = i;
      break;
    }
  }
  if (splitIdx === -1) {
    return { questionNodes: arr, answerNodes: [] };
  }
  return {
    questionNodes: arr.slice(0, splitIdx),
    answerNodes: arr.slice(splitIdx),
  };
}

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
    case "PRACTICE": {
      const { questionNodes, answerNodes } = splitPracticeChildren(children);
      if (answerNodes.length === 0) {
        // No answer section yet — fall back to StudyTipCard so it still looks good
        return <StudyTipCard>{children}</StudyTipCard>;
      }
      return <PracticeQuestionCard question={<>{questionNodes}</>} answer={<>{answerNodes}</>} />;
    }
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

  // ── Step 0: Repair broken blockquotes ──────────────────────────────────────
  // The AI frequently separates blockquote paragraphs with empty lines, which
  // Markdown parses as entirely separate blockquotes. This breaks multi-line
  // callouts (like `> [!PRACTICE]`). We join them back together securely.

  // Step 0a: Ensure [!PRACTICE] always starts with a `>`
  s = s.replace(/^\[!PRACTICE\]/gim, "> [!PRACTICE]");

  // Step 0b: Scope repair to individual PRACTICE blocks (stops at the next section)
  s = s.replace(
    /(> \[!PRACTICE\][\s\S]*?)(?=(?:\n> \[!PRACTICE\]|\n---|(?:\n|^)🔖|(?:\n|^)##|$))/gi,
    (practiceBlock) => {
      return practiceBlock
        .split("\n")
        .map((line) => (line.startsWith(">") ? line : `> ${line}`))
        .join("\n");
    },
  );

  // Step 0c: Ensure consecutive PRACTICE blocks are NOT joined into a single blockquote
  s = s.replace(/\n>\s*\n> \[!PRACTICE\]/gim, "\n\n> [!PRACTICE]");

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

  // ── Step 6: \ce chemical notation (mhchem) ───────────────────────────────
  // Normalize ALL variants the AI produces → \ce{FORMULA} → $\ce{FORMULA}$
  // Phase A – normalise so everything becomes \ce{FORMULA}
  //   1. bare ce{} without leading backslash: ce{H2O}
  s = s.replace(/(^|[^a-zA-Z\\])ce\s*\{([^}]+)\}/g, "$1\\ce{$2}");
  //   2. \ce immediately fused to formula (no space, no braces): \ceAO2 \ceH2SO4
  s = s.replace(/\\ce([A-Z][A-Za-z0-9^_+\-]*)/g, "\\ce{$1}");
  //   3. \ce separated by space: \ce AO2  \ce H2O
  s = s.replace(/\\ce\s+([A-Za-z][A-Za-z0-9^_+\-]*)/g, "\\ce{$1}");
  // Phase B – convert every \ce{...} to an inline code block `chem:...` so our custom renderer can parse it directly
  s = s.replace(/(?<!\$)\\ce\{([^}]+)\}(?!\$)/g, "`chem:$1`");

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

  // ── Step 10: Make plain-text URLs clickable ───────────────────────────────
  // Match bare domain-like strings (not already inside markdown links or fences)
  s = s.replace(
    /(?<![\[(!`]|https?:\/\/)\b((?:www\.)?[a-zA-Z0-9-]{2,}(?:\.[a-zA-Z]{2,}){1,}(?:\/[^\s,)"'<>]*)?)/g,
    (_m, url) => {
      // Skip if it's part of a known pattern (emails, file paths, etc.)
      if (!url.includes(".") || url.match(/^(\d+\.)+\d+$/)) return _m;
      // Skip single-word things that happen to have dots like e.g. version numbers
      if (/^\d/.test(url)) return _m;
      const href = url.startsWith("http") ? url : `https://${url}`;
      return `[${url}](${href})`;
    },
  );

  // ── Step 11: Ensure numbered/lettered items start on new lines ────────────
  // AI often packs "a) First b) Second c) Third" or "1. step 2. step" inline.
  // Split lettered sub-questions (a) b) c)) onto their own lines
  s = s.replace(/([^\n(])\s+([a-z]\))\s+(?=[A-Z])/g, (_, pre, letter) => `${pre}\n\n   ${letter} `);
  // Split inline numbered list items: "text 1. Step 2. Step" → "text\n1. Step\n2. Step"
  s = s.replace(/([^\n:])[ \t]+(\d+\.\s+)(?=[A-Z])/g, (_, pre, num) => `${pre}\n${num}`);

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

// ── Practice Question contexts ──────────────────────────────────────────────
//
// PracticeCounterCtx: stable Map<byteOffset → questionNumber> computed once
// from the raw HAST `node` in `ol` — no render-time mutations, Strict Mode safe.
const PracticeCounterCtx = React.createContext<Map<number, number> | null>(null);
//
// InsidePracticeCardCtx: set to `true` inside a practice card so nested
// sub-question li items (a, b, c …) are NOT converted into more cards.
export const InsidePracticeCardCtx = React.createContext(false);

// Extract plain text from a HAST node (depth-first, ignores element boundaries)
function hastText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

const PRACTICE_MARKS_RE = /\(\d+\s+marks?\)/i;
const PRACTICE_VERBS_RE =
  /^(state|find|calculate|identify|given|show|prove|determine|explain|describe|evaluate|solve|simplify|compute|derive|sketch|draw|write|list|define|compare|differentiate|hence)/i;
function looksLikePractice(text: string) {
  return PRACTICE_MARKS_RE.test(text) || PRACTICE_VERBS_RE.test(text.trim());
}

const buildComponents = (isStreaming: boolean): any => ({
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground pb-2 leading-tight tracking-tight border-b border-border/50">
      {children}
    </h1>
  ),

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
      <p className="text-[15px] sm:text-[16px] leading-relaxed sm:leading-7 mb-5 last:mb-0 text-foreground/90">
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
  ol: ({ children, node }: any) => {
    // Pre-compute which li items are practice questions and assign them stable
    // numbers based on the HAST node's byte offset — no render-time mutations,
    // correct in React Strict Mode (no double-increment), correct with nested lists.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const practiceNumbers = React.useMemo(() => {
      const map = new Map<number, number>();
      let q = 0;
      for (const child of node?.children ?? []) {
        if (child.tagName !== "li") continue;
        if (looksLikePractice(hastText(child))) {
          // Use the byte offset as a stable, unique key for this node
          const key = child.position?.start?.offset ?? -Math.random();
          map.set(key, ++q);
        }
      }
      return map;
    }, [node]);
    return (
      <PracticeCounterCtx.Provider value={practiceNumbers}>
        <ol className="list-decimal pl-6 my-5 space-y-2.5 block w-full marker:text-muted-foreground marker:font-medium [&_ol]:list-[lower-alpha] [&_ol_ol]:list-[lower-roman]">
          {children}
        </ol>
      </PracticeCounterCtx.Provider>
    );
  },
  li: ({ children, checked, node }: any) => {
    // Always call hooks at top level (Rules of Hooks)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const practiceNumbers = React.useContext(PracticeCounterCtx);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const insidePractice = React.useContext(InsidePracticeCardCtx);

    // Task-list checkbox support
    if (checked !== null && checked !== undefined) {
      return (
        <li className="flex items-start gap-3 text-[15px] sm:text-[16px] leading-relaxed sm:leading-7 list-none -ml-2">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0 cursor-default"
          />
          <span>{children}</span>
        </li>
      );
    }

    // Text extraction for pattern matching (React children → string)
    const text = React.Children.toArray(children)
      .map((c) => (typeof c === "string" ? c : ((c as any)?.props?.children ?? "")))
      .join("");

    // Quick Review Card detection — match "Front: <q> Back: <a>" pattern
    const flashMatch = text.match(/^Front:\s*(.+?)\s+Back:\s*(.+)$/s);
    if (flashMatch) {
      return (
        <li className="list-none -mx-1">
          <FlashCard front={flashMatch[1].trim()} back={flashMatch[2].trim()} />
        </li>
      );
    }

    // Practice Question Card:
    //   Only convert top-level li items (insidePractice === false).
    //   Sub-questions (a, b, c …) inside a card set insidePractice = true
    //   via InsidePracticeCardCtx so they never get converted.
    if (!insidePractice && practiceNumbers && looksLikePractice(text)) {
      const offset = node?.position?.start?.offset ?? -1;
      const num = practiceNumbers.get(offset);
      return (
        <InsidePracticeCardCtx.Provider value={true}>
          <li className="list-none -ml-6 my-2">
            <PracticeQuestionCard number={num} question={<>{children}</>} />
          </li>
        </InsidePracticeCardCtx.Provider>
      );
    }

    return (
      <li
        className="text-[15px] sm:text-[16px] leading-relaxed sm:leading-7"
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
    // math/chemistry blocks are handled by our custom code/pre components
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
      const clean = sanitizeMermaidLabels(
        code
          .replace(/\$\\longrightarrow\$/g, "-->")
          .replace(/\$\\rightarrow\$/g, "-->")
          .replace(/\$\\to\$/g, "-->")
          .replace(/\$\\leftarrow\$/g, "<--")
          .replace(/\$\\leftrightarrow\$/g, "<-->"),
      );
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
      case "practice":
      case "question": {
        // Split raw text at `---` or `Answer:` / `A:` line
        const separator = /\n---\n|\n(?:Answer|A):\s*/i;
        const parts = code.split(separator);
        const qText = parts[0]?.trim() ?? code;
        const aText = parts[1]?.trim() ?? "";
        if (!aText) {
          return <StudyTipCard>{qText}</StudyTipCard>;
        }
        return (
          <PracticeQuestionCard
            question={<span style={{ whiteSpace: "pre-wrap" }}>{qText}</span>}
            answer={<span style={{ whiteSpace: "pre-wrap" }}>{aText}</span>}
          />
        );
      }
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
      const text = String(children);
      if (text.startsWith("chem:")) {
        const formula = text.slice(5);
        try {
          const html = katex.renderToString(`\\ce{${formula}}`, { throwOnError: false });
          return <span dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          return <span>{`\\ce{${formula}}`}</span>;
        }
      }
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-primary">
          {children}
        </code>
      );
    }
    // Block code inside pre — rendering handled by pre (SyntaxHighlighter takes over)
    return <code className={className}>{children}</code>;
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

function remarkDisableIndentedCode(this: any) {
  const data = this.data();
  data.micromarkExtensions = data.micromarkExtensions || [];
  data.micromarkExtensions.push({
    disable: { null: ["codeIndented"] },
  });
}

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
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkDisableIndentedCode]}
        rehypePlugins={[]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
