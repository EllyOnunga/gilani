interface Props {
  code: string;
  language?: string;
}

export default function CodeFooter({ code, language }: Props) {
  const lines = code.split("\n").length;

  const size = new Blob([code]).size;

  const kb = (size / 1024).toFixed(1);

  return (
    <div
      className="
        flex
        items-center
        justify-between
        border-t
        border-zinc-800
        bg-zinc-900
        px-4
        py-2
        text-xs
        text-zinc-400
      "
    >
      <span>{lines} lines</span>

      <span>{language ?? "Text"}</span>

      <span>{kb} KB</span>
    </div>
  );
}
