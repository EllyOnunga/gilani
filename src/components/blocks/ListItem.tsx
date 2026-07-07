import { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function ListItem({ block }: Props) {
  return <li className="leading-8 text-zinc-300">{block.content}</li>;
}
