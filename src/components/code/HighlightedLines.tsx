import { ReactNode } from "react";

interface Props {
    highlightLines?: number[];
    children: ReactNode;
}

export default function HighlightedLines({ highlightLines, children }: Props) {
    if (!highlightLines || highlightLines.length === 0) return <>{children}</>;
    
    // In a full implementation, we'd wrap specific lines outputted by Shiki.
    // Since Shiki already outputs raw HTML, this acts as a placeholder wrapper.
    return <>{children}</>;
}
