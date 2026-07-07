interface Props {
  children: React.ReactNode;
}

export default function InlineCode({ children }: Props) {
  return (
    <code
      className="
        rounded
        bg-[#35261F]
        px-1.5
        py-1
        font-mono
        text-[0.9em]
        text-[#E28743]
      "
    >
      {children}
    </code>
  );
}
