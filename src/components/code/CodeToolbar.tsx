import CopyButton from "./CopyButton";
import LanguageBadge from "./LanguageBadge";
import LanguageIcon from "./LanguageIcon";

interface Props {
    language?: string;
    fileName?: string;
    code: string;
}

export default function CodeToolbar({
    language,
    fileName,
    code,
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
                <LanguageIcon language={language} />

                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                        {fileName ?? "Untitled"}
                    </span>

                    <LanguageBadge language={language} />
                </div>
            </div>

            <CopyButton value={code} />
        </div>
    );
}