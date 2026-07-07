import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
}

export default function CopyButton({ value }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="
        flex
        items-center
        gap-2
        rounded-lg
        bg-[#3B2A22]
        px-3
        py-2
        text-xs
        transition
        hover:bg-[#4B352B]
      "
    >
      {copied ? (
        <>
          <Check size={14} />✓ Copied
        </>
      ) : (
        <>
          <Copy size={14} />
          📋 Copy
        </>
      )}
    </button>
  );
}
