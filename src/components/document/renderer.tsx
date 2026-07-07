import { registry } from "./registry";

interface Props {
  block: any;
}

export default function Renderer({ block }: Props) {
  const Component = (
    registry as Record<string, React.ComponentType<{ children?: React.ReactNode }>>
  )[block.type];

  if (Component) {
    return <Component>{block.content}</Component>;
  }

  return null;
}
