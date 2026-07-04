import { Terminal } from "lucide-react";

interface Props {
    output: string;
}

export default function TerminalBlock({
    output,
}: Props) {
    return (
        <section
            className="
      my-6
      overflow-hidden
      rounded-xl
      border
      border-zinc-800
      bg-black
    "
        >
            <div
                className="
        flex
        items-center
        gap-2
        border-b
        border-zinc-800
        bg-zinc-900
        px-4
        py-3
      "
            >
                <Terminal size={16} />

                <span>Terminal</span>
            </div>

            <pre className="overflow-auto p-5 text-green-400">
                {output}
            </pre>
        </section>
    );
}