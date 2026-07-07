import { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function Paragraph({ block }: Props) {
  return (
    <p
      className="
        my-4
        whitespace-pre-wrap
        leading-8
        text-zinc-300
        break-words
      "
    >
      {block.content}
    </p>
  );
}
