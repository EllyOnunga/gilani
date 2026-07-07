import { RendererPlugin } from "./types";

export const formulaPlugin: RendererPlugin = {
  name: "formula",

  test(node) {
    if (node.type !== "paragraph") return false;

    const value = node.children?.[0]?.value ?? "";

    return value.trim() === "Formula";
  },

  transform(node) {
    node.data = {
      component: "FormulaCard",
    };

    return node;
  },
};
