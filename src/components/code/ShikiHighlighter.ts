import { createHighlighter } from "shiki";

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

export async function getHighlighter() {
  if (highlighter) return highlighter;

  highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: [
      "typescript",
      "javascript",
      "tsx",
      "jsx",
      "json",
      "html",
      "css",
      "bash",
      "python",
      "java",
      "c",
      "cpp",
      "go",
      "rust",
      "php",
      "sql",
      "yaml",
      "markdown",
      "plaintext",
    ],
  });

  return highlighter;
}
