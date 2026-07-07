import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  children: React.ReactNode;

  defaultExpanded?: boolean;

  collapsedHeight?: number;
}

export default function CollapsibleCode({
  children,
  defaultExpanded = false,
  collapsedHeight = 420,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <>
      <div
        style={{
          maxHeight: expanded ? undefined : collapsedHeight,
        }}
        className={expanded ? "" : "overflow-hidden"}
      >
        {children}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="
          flex
          w-full
          items-center
          justify-center
          gap-2
          border-t
          border-zinc-800
          bg-zinc-900
          py-3
          text-sm
          text-[#E28743]
          transition
          hover:bg-zinc-800
        "
      >
        {expanded ? (
          <>
            <ChevronUp size={16} />
            Collapse Code
          </>
        ) : (
          <>
            <ChevronDown size={16} />
            Expand Code
          </>
        )}
      </button>
    </>
  );
}
