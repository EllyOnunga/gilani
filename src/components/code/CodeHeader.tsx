import CopyButton from "./CopyButton";
import LanguageBadge from "./LanguageBadge";

interface Props {
    language?: string;
    code: string;
    fileName?: string;
}

export default function CodeHeader({
    language,
    code,
    fileName,
}: Props) {
    return (
        <div
            className="
        flex
        items-center
        justify-between
        border-b
        border-zinc-800
        bg-zinc-900
        px-4
        py-3
      "
        >
            <div className="flex items-center gap-3">
                <LanguageBadge language={language} />

                {fileName && (
                    <span className="text-sm text-zinc-400">
                        {fileName}
                    </span>
                )}
            </div>

            <CopyButton value={code} />
        </div>
    );
}