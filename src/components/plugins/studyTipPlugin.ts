import { RendererPlugin } from "./types";

export const studyTipPlugin: RendererPlugin = {
  name: "tip",

  test(node) {
    if (node.type !== "paragraph") return false;

    const value = node.children?.[0]?.value ?? "";

    return value.trim() === "Study Tip";
  },

  transform(node) {
    node.data = {
      component: "StudyTipCard",
    };

    return node;
  },
};
