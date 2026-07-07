import { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function Link({ block }: Props) {
  return (
    <a
      href={block.metadata?.href as string}
      target="_blank"
      rel="noopener noreferrer"
      className="
        text-[#E28743]
        underline
        underline-offset-4
        transition-colors
        hover:text-orange-300
      "
    >
      {block.content}
    </a>
  );
}
