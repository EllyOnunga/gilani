import { visit } from "unist-util-visit";

import { extractText } from "./textExtractor";

import { DocumentModel } from "../types/document";

export function astToDocument(tree: any): DocumentModel {

    const document: DocumentModel = {

        version: 1,

        blocks: []

    };

    visit(tree, (node: any) => {

        switch (node.type) {

            case "heading":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "heading",
                    title: extractText(node),
                    metadata: {
                        level: node.depth,
                    },
                    children: [],
                });
                break;

            case "paragraph":

                document.blocks.push({

                    id: crypto.randomUUID(),

                    type: "paragraph",

                    content: extractText(node),

                    children: []

                });

                break;

            case "code":

                document.blocks.push({

                    id: crypto.randomUUID(),

                    type: "code",

                    content: node.value,

                    metadata: {

                        language: node.lang

                    },

                    children: []

                });

                break;

            case "thematicBreak":

                document.blocks.push({

                    id: crypto.randomUUID(),

                    type: "divider",

                    children: []

                });

                break;

            case "blockquote":

                document.blocks.push({

                    id: crypto.randomUUID(),

                    type: "blockquote",

                    content: extractText(node),

                    children: []

                });

                break;

            case "code": {
                const lang = node.lang?.toLowerCase() ?? "text";
                let type: any = "code";
                
                if (lang === "json") type = "json";
                else if (lang === "diff") type = "diff";
                else if (lang === "reaction" || lang === "mhchem") type = "reaction";
                else if (lang === "molecule" || lang === "smiles") type = "molecule";
                else if (lang === "periodic") type = "periodic";
                else if (lang === "fbd") type = "fbd";
                else if (lang === "circuit") type = "circuit";
                else if (lang === "kinematics") type = "kinematics";
                else if (lang === "graph") type = "graph";
                else if (lang === "geometry") type = "geometry";
                else if (lang === "matrix") type = "matrix";
                else if (lang === "unit") type = "unit";

                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: type,
                    content: node.value,
                    metadata: {
                        language: node.lang ?? "text",
                        fileName: node.meta,
                        collapsible: node.value.length > 1200,
                    },
                    children: [],
                });
                break;
            }

            case "inlineMath":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "inlineMath",
                    data: {
                        latex: node.value,
                        display: false,
                    },
                    children: [],
                });
                break;

            case "math":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "math",
                    data: {
                        latex: node.value,
                        display: true,
                    },
                    children: [],
                });
                break;

            case "list":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "list",
                    metadata: {
                        ordered: node.ordered,
                    },
                    children: [],
                });
                break;

            case "listItem":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "listItem",
                    content: extractText(node),
                    children: [],
                });
                break;

            case "table":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "table",
                    children: [],
                });
                break;

            case "tableRow":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "tableRow",
                    children: [],
                });
                break;

            case "tableCell":
                document.blocks.push({
                    id: crypto.randomUUID(),
                    type: "tableCell",
                    content: extractText(node),
                    children: [],
                });
                break;

        }

    });

    return document;

}