import { unified } from "unified";
import remarkParse from "remark-parse";

export function parseMarkdown(markdown: string) {

    return unified()

        .use(remarkParse)

        .parse(markdown);

}