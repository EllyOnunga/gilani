export function extract(node: any) {
  if (!node.children) return "";

  return node.children

    .map((c: any) => {
      return c.value ?? "";
    })

    .join("");
}
