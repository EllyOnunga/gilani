import { RendererPlugin } from "./types";

export const summaryPlugin: RendererPlugin = {
  name: "summary",

  test(node) {
    if (node.type !== "paragraph") return false;

    const value = node.children?.[0]?.value ?? "";

    return value.trim() === "Summary";
  },

  transform(node) {
    node.data = {
      component: "SummaryCard",
    };

    return node;
  },
};
