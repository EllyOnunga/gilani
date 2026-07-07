import { RendererPlugin } from "./types";

export const examplePlugin: RendererPlugin = {
  name: "example",

  test(node) {
    if (node.type !== "paragraph") return false;

    const value = node.children?.[0]?.value ?? "";

    return value.trim() === "Example";
  },

  transform(node) {
    node.data = {
      component: "ExampleCard",
    };

    return node;
  },
};
