import { RendererPlugin } from "./types";

export const warningPlugin: RendererPlugin = {

    name: "warning",

    test(node) {

        if (node.type !== "paragraph")
            return false;

        const value = node.children?.[0]?.value ?? "";

        return value.trim() === "Common Mistake";

    },

    transform(node) {

        node.data = {

            component: "WarningCard"

        };

        return node;

    }

};