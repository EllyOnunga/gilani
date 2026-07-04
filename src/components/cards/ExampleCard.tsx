import { Lightbulb } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

export default function ExampleCard({
    children,
}: Props) {
    return (
        <section className="my-6 rounded-2xl border border-blue-500/30 bg-blue-950/20">

            <div className="flex items-center gap-2 border-b border-blue-500/20 px-5 py-3">

                <Lightbulb
                    size={18}
                    className="text-blue-400"
                />

                <span className="font-semibold text-blue-300">

                    Worked Example

                </span>

            </div>

            <div className="p-5">

                {children}

            </div>

        </section>
    );
}