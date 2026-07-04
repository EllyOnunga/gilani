interface Props {
    line: number;
    active?: boolean;
}

export default function LineNumber({ line, active = false }: Props) {
    return (
        <span className={`inline-block w-8 text-right pr-3 select-none ${active ? 'text-primary' : 'text-zinc-600'}`}>
            {line}
        </span>
    );
}
