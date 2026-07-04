interface Props {
    language?: string;
}

export default function LanguageBadge({
    language,
}: Props) {
    return (
        <span
            className="
      rounded-md
      bg-[#3B2A22]
      px-2
      py-1
      text-xs
      font-medium
      uppercase
      tracking-wide
      text-[#E28743]
    "
        >
            {language || "TEXT"}
        </span>
    );
}