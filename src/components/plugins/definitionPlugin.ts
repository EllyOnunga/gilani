import { RendererPlugin } from "./types";

export const definitionPlugin: RendererPlugin = {
  name: "definition",

  test(node) {
    if (node.type !== "paragraph") return false;

    const value = node.children?.[0]?.value ?? "";

    return value.trim() === "Definition";
  },

  transform(node) {
    node.data = {
      component: "DefinitionCard",
    };

    return node;
  },
};
