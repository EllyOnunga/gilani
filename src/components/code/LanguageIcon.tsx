import {
    FileCode2,
    Braces,
    Database,
    Terminal,
    Globe,
} from "lucide-react";

interface Props {
    language?: string;
}

export default function LanguageIcon({ language }: Props) {
    switch ((language ?? "").toLowerCase()) {
        case "typescript":
        case "tsx":
            return <FileCode2 size={15} />;

        case "javascript":
        case "jsx":
            return <FileCode2 size={15} />;

        case "json":
            return <Braces size={15} />;

        case "sql":
            return <Database size={15} />;

        case "bash":
            return <Terminal size={15} />;

        case "html":
        case "css":
            return <Globe size={15} />;

        default:
            return <FileCode2 size={15} />;
    }
}