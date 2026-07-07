import { DocumentBlock } from "@/components/renderer/types/document";

interface Props {
  block: DocumentBlock;
}

export default function Divider({ block }: Props) {
  return (
    <hr
      className="
        my-8
        border-zinc-700
      "
    />
  );
}
