import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { DocumentBlock } from "@/components/renderer/types/document";
import CodeToolbar from "./CodeToolbar";

interface JsonNodeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  level?: number;
}

function JsonNode({ data, name, isLast = true, level = 0 }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(level < 2); // default expand first 2 levels

  if (data === null)
    return (
      <span>
        <span className="text-blue-400">{name ? `"${name}": ` : ""}</span>
        <span className="text-zinc-500">null</span>
        {!isLast && ","}
      </span>
    );
  if (typeof data === "string")
    return (
      <span>
        <span className="text-blue-400">{name ? `"${name}": ` : ""}</span>
        <span className="text-emerald-400">"{data}"</span>
        {!isLast && ","}
      </span>
    );
  if (typeof data === "number" || typeof data === "boolean")
    return (
      <span>
        <span className="text-blue-400">{name ? `"${name}": ` : ""}</span>
        <span className="text-orange-400">{data.toString()}</span>
        {!isLast && ","}
      </span>
    );

  const isArray = Array.isArray(data);
  const keys = Object.keys(data);
  const isEmpty = keys.length === 0;

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  if (isEmpty)
    return (
      <span>
        <span className="text-blue-400">{name ? `"${name}": ` : ""}</span>
        {openBracket}
        {closeBracket}
        {!isLast && ","}
      </span>
    );

  return (
    <div className="flex flex-col font-mono text-[13px] leading-relaxed">
      <div
        className="flex items-center cursor-pointer hover:bg-white/5 w-fit rounded px-1 -ml-1"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mr-1 text-zinc-500">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="text-blue-400">{name ? `"${name}": ` : ""}</span>
        <span className="text-zinc-400">{openBracket}</span>
        {!expanded && <span className="text-zinc-500 px-1">...</span>}
        {!expanded && (
          <span className="text-zinc-400">
            {closeBracket}
            {!isLast && ","}
          </span>
        )}
        {!expanded && <span className="text-zinc-600 text-xs ml-2">{keys.length} items</span>}
      </div>

      {expanded && (
        <div className="flex flex-col ml-6 border-l border-zinc-800/50 pl-2">
          {keys.map((key, i) => (
            <JsonNode
              key={key}
              data={data[key as keyof typeof data]}
              name={isArray ? undefined : key}
              isLast={i === keys.length - 1}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div className="ml-4 text-zinc-400">
          {closeBracket}
          {!isLast && ","}
        </div>
      )}
    </div>
  );
}

interface Props {
  block: DocumentBlock;
}

export default function JsonViewer({ block }: Props) {
  let parsedData: any = null;
  let error: string | null = null;

  try {
    parsedData = JSON.parse(block.content || "{}");
  } catch (e: any) {
    error = e.message;
  }

  return (
    <section className="my-6 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117]">
      <CodeToolbar language="json" fileName={block.metadata?.fileName} code={block.content || ""} />

      <div className="p-4 overflow-auto bg-[#0d1117] text-zinc-300">
        {error ? (
          <div className="text-red-400 font-mono text-sm p-4 bg-red-950/20 rounded">
            Error parsing JSON: {error}
          </div>
        ) : (
          <JsonNode data={parsedData} />
        )}
      </div>
    </section>
  );
}
