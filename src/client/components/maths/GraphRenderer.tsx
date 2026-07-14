import type { DocumentBlock } from "@/client/components/renderer/types/document";
import { FunctionGraphBlock } from "../tutor/FunctionGraph";

interface Props {
  block: DocumentBlock;
}

export default function GraphRenderer({ block }: Props) {
  const data = block.content || "";
  return <FunctionGraphBlock spec={data} />;
}
