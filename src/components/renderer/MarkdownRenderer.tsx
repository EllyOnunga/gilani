/**
 * Unified MarkdownRenderer re-export.
 *
 * All markdown rendering across the app routes through the canonical
 * `src/components/tutor/MarkdownRenderer.tsx`, which handles:
 *   - GFM (tables, strikethrough, task-lists)
 *   - KaTeX math ($$…$$, $…$) with mhchem (\ce{…})
 *   - Mermaid diagrams, SMILES structures, SVG diagrams
 *   - Function graphs via FunctionGraphBlock
 *   - GitHub-style callouts ([!NOTE], [!TIP], …)
 *   - Streaming-aware rendering (incomplete math suppressed gracefully)
 *   - LaTeX pre-processor (auto-wraps chemical formulas, units, arrows)
 */
export {
  MarkdownRenderer,
  MarkdownRenderer as default,
} from "@/components/tutor/MarkdownRenderer";