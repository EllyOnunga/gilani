import { visit } from "unist-util-visit";

export default function remarkGilani() {
    return (tree: any) => {
        visit(tree, "heading", (node, index, parent) => {
            if (!parent || index == null) return;

            const title =
                node.children?.[0]?.value?.trim().toLowerCase() ?? "";

            const componentMap: Record<string, string> = {
                definition: "DefinitionCard",
                example: "ExampleCard",
                summary: "SummaryCard",
                formula: "FormulaCard",
                "study tip": "StudyTipCard",
                "common mistake": "WarningCard",
            };

            const component = componentMap[title];

            if (!component) return;

            node.data = {
                hName: component,
            };
        });
    };
}
