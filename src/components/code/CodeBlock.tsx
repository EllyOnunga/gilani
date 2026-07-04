import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import type { DocumentBlock } from "@/components/renderer/types/document";
import { getHighlighter } from "./ShikiHighlighter";
import { getCached, setCached } from "@/components/renderer/utils/cache";
import CodeToolbar from "./CodeToolbar";
import CollapsibleCode from "./CollapsibleCode";
import CodeFooter from "./CodeFooter";

interface Props {
    block: DocumentBlock;
}

export default function CodeBlock({ block }: Props) {
    const language = (block.metadata?.language as string) || "text";
    const fileName = (block.metadata?.fileName as string) || undefined;
    const code = block.content ?? "";
    const key = `${language}:${code}`;

    const [html, setHtml] = useState(() => getCached(key) || "");

    useEffect(() => {
        if (getCached(key)) return;

        async function highlight() {
            const highlighter = await getHighlighter();

            const highlighted = highlighter.codeToHtml(
                code,
                {
                    lang: language,
                    theme: "github-dark",
                }
            );

            const sanitized = DOMPurify.sanitize(highlighted);
            setCached(key, sanitized);
            setHtml(sanitized);
        }

        highlight();
    }, [code, language, key]);

    return (
        <section className="my-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117]">
            <CodeToolbar
                language={language}
                fileName={fileName}
                code={code}
            />

            <CollapsibleCode>
                <div
                    className="overflow-auto text-[14px] p-4"
                    dangerouslySetInnerHTML={{
                        __html: html,
                    }}
                />
            </CollapsibleCode>

            <CodeFooter
                code={code}
                language={language}
            />
        </section>
    );
}