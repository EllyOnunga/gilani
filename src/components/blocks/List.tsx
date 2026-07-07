import { DocumentBlock } from "@/components/renderer/types/document";
import ListItem from "./ListItem";

interface Props {
  block: DocumentBlock;
}

export default function List({ block }: Props) {
  const ordered = block.metadata?.ordered === true;

  const Component = ordered ? "ol" : "ul";

  return (
    <Component
      className={`
        my-4
        space-y-2
        pl-6
        ${ordered ? "list-decimal" : "list-disc"}
      `}
    >
      {block.children.map((child) => (
        <ListItem key={child.id} block={child} />
      ))}
    </Component>
  );
}
