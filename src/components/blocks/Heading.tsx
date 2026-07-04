import { DocumentBlock } from "@/components/renderer/types/document";
import clsx from "clsx";

interface Props {
    block: DocumentBlock;
}

export default function Heading({ block }: Props) {
    const level =
        (block.metadata?.level as number | undefined) ?? 1;

    const className = clsx(
        "font-bold tracking-tight text-white scroll-mt-24",
        {
            "text-4xl mt-10 mb-6": level === 1,
            "text-3xl mt-8 mb-5": level === 2,
            "text-2xl mt-7 mb-4": level === 3,
            "text-xl mt-6 mb-3": level === 4,
            "text-lg mt-5 mb-3": level === 5,
            "text-base mt-4 mb-2": level >= 6,
        }
    );

    switch (level) {
        case 1:
            return <h1 className={className}>{block.title}</h1>;
        case 2:
            return <h2 className={className}>{block.title}</h2>;
        case 3:
            return <h3 className={className}>{block.title}</h3>;
        case 4:
            return <h4 className={className}>{block.title}</h4>;
        case 5:
            return <h5 className={className}>{block.title}</h5>;
        default:
            return <h6 className={className}>{block.title}</h6>;
    }
}