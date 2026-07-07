export function extractText(node: any): string {
  if (!node) return "";

  if (node.value) return node.value;

  if (!node.children) return "";

  return node.children

    .map(extractText)

    .join("");
}
